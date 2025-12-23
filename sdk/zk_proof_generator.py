"""
ZK Proof Generator using SnarkJS
Generates real ZK-SNARK proofs for task verification
"""

import json
import subprocess
import tempfile
import os
import hashlib
import logging
from pathlib import Path
from typing import Dict, Tuple

logger = logging.getLogger(__name__)


class ZKProofGenerator:
    """
    Generates ZK-SNARK proofs using circom circuit and snarkjs
    """

    def __init__(self, circuit_dir: str = None):
        """
        Initialize ZK proof generator

        Args:
            circuit_dir: Path to compiled circuit files (default: auto-detect)
        """
        if circuit_dir is None:
            # Auto-detect circuit directory
            self.circuit_dir = self._find_circuit_dir()
        else:
            self.circuit_dir = Path(circuit_dir)

        self.wasm_path = self.circuit_dir / 'build' / 'task_proof_js' / 'task_proof.wasm'
        self.zkey_path = self.circuit_dir / 'keys' / 'task_proof.zkey'
        self.vkey_path = self.circuit_dir / 'keys' / 'verification_key.json'

        # Check if circuit files exist
        self._verify_circuit_files()

    def _find_circuit_dir(self) -> Path:
        """
        Auto-detect circuit directory by searching parent directories
        """
        current = Path(__file__).resolve()

        # Search up to 5 levels up
        for _ in range(5):
            current = current.parent
            circuit_path = current / 'zk-circuits'
            if circuit_path.exists():
                logger.info(f"Found circuit directory: {circuit_path}")
                return circuit_path

        raise FileNotFoundError(
            "ZK circuit directory not found. Please ensure zk-circuits exists in project root."
        )

    def _verify_circuit_files(self):
        """
        Verify all required circuit files exist
        """
        required_files = {
            'WASM': self.wasm_path,
            'Proving Key': self.zkey_path,
            'Verification Key': self.vkey_path
        }

        missing = []
        for name, path in required_files.items():
            if not path.exists():
                missing.append(f"{name} ({path})")

        if missing:
            error_msg = (
                "Missing ZK circuit files:\n" + "\n".join(f"  - {m}" for m in missing) +
                "\n\nPlease run circuit setup:\n"
                "  cd zk-circuits\n"
                "  npm install\n"
                "  npm run compile\n"
                "  npm run setup"
            )
            raise FileNotFoundError(error_msg)

        logger.info("All ZK circuit files verified")

    def _poseidon_hash(self, value: str) -> str:
        """
        Simulate Poseidon hash (in production, use actual Poseidon)
        For compatibility with circuit, we use SHA256 as placeholder

        Args:
            value: Value to hash

        Returns:
            Hash as field element string
        """
        hash_bytes = hashlib.sha256(value.encode()).digest()
        # Convert to field element (< BN254 prime)
        field_elem = int.from_bytes(hash_bytes, 'big') % (2**254 - 1)
        return str(field_elem)

    def generate_proof(
        self,
        client_id: str,
        expected_payment: float,
        task_description: str,
        agent_address: str,
        min_loan_amount: float = None
    ) -> Tuple[str, Dict]:
        """
        Generate ZK-SNARK proof for task verification

        Args:
            client_id: Client identifier (kept private)
            expected_payment: Expected payment in USDC
            task_description: Task description (kept private)
            agent_address: Agent's blockchain address
            min_loan_amount: Minimum loan amount needed (default: expected_payment * 0.8)

        Returns:
            Tuple of (proof_hash, full_proof_data)
        """
        try:
            if min_loan_amount is None:
                min_loan_amount = expected_payment * 0.8

            # Prepare circuit inputs
            # Convert addresses to field elements
            agent_field = int(agent_address, 16) if agent_address.startswith('0x') else int(agent_address)

            # Hash private data
            client_id_preimage = self._poseidon_hash(client_id)
            task_hash = self._poseidon_hash(task_description)
            nonce = self._poseidon_hash(os.urandom(16).hex())
            timestamp = str(int(__import__('time').time()))

            circuit_input = {
                # Private inputs
                "clientIdPreimage": client_id_preimage,
                "taskDescriptionHash": task_hash,
                "nonce": nonce,
                "timestamp": timestamp,

                # Public inputs
                "agentAddress": str(agent_field),
                "expectedPayment": str(int(expected_payment)),  # Convert to integer (USDC with 6 decimals)
                "minLoanAmount": str(int(min_loan_amount))
            }

            logger.info(f"Generating ZK proof for payment ${expected_payment}")
            logger.debug(f"Circuit inputs: {json.dumps(circuit_input, indent=2)}")

            # Write input to temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(circuit_input, f)
                input_file = f.name

            # Generate witness and proof using snarkjs
            # Note: This requires Node.js and snarkjs to be installed
            proof_file = input_file.replace('.json', '_proof.json')
            public_file = input_file.replace('.json', '_public.json')

            try:
                # Call snarkjs groth16 fullprove
                cmd = [
                    'snarkjs',
                    'groth16',
                    'fullprove',
                    input_file,
                    str(self.wasm_path),
                    str(self.zkey_path),
                    proof_file,
                    public_file
                ]

                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30
                )

                if result.returncode != 0:
                    raise RuntimeError(f"snarkjs failed: {result.stderr}")

                # Read generated proof
                with open(proof_file, 'r') as f:
                    proof = json.load(f)

                with open(public_file, 'r') as f:
                    public_signals = json.load(f)

                # The first public signal is the proof hash (circuit output)
                proof_hash = public_signals[0]

                logger.info(f"✅ ZK proof generated successfully")
                logger.info(f"   Proof Hash: {proof_hash}")
                logger.info(f"   Proves payment: ${expected_payment} >= ${min_loan_amount}")

                # Return proof hash and full proof data
                return proof_hash, {
                    'proof': proof,
                    'publicSignals': public_signals,
                    'proofHash': proof_hash,
                    'metadata': {
                        'expectedPayment': expected_payment,
                        'minLoanAmount': min_loan_amount,
                        'agentAddress': agent_address
                    }
                }

            finally:
                # Cleanup temporary files
                for file in [input_file, proof_file, public_file]:
                    if os.path.exists(file):
                        os.remove(file)

        except subprocess.TimeoutExpired:
            logger.error("ZK proof generation timed out")
            raise RuntimeError("ZK proof generation timed out (>30s)")

        except FileNotFoundError:
            logger.error("snarkjs not found. Please install: npm install -g snarkjs")
            raise RuntimeError(
                "snarkjs not found. Install with: npm install -g snarkjs\n"
                "Or ensure Node.js and snarkjs are in PATH"
            )

        except Exception as e:
            logger.error(f"ZK proof generation failed: {e}")
            raise

    def verify_proof(self, proof_data: Dict) -> bool:
        """
        Verify a ZK proof locally

        Args:
            proof_data: Proof data from generate_proof()

        Returns:
            True if proof is valid
        """
        try:
            # Write proof and public signals to temp files
            with tempfile.NamedTemporaryFile(mode='w', suffix='_proof.json', delete=False) as f:
                json.dump(proof_data['proof'], f)
                proof_file = f.name

            with tempfile.NamedTemporaryFile(mode='w', suffix='_public.json', delete=False) as f:
                json.dump(proof_data['publicSignals'], f)
                public_file = f.name

            try:
                # Call snarkjs groth16 verify
                cmd = [
                    'snarkjs',
                    'groth16',
                    'verify',
                    str(self.vkey_path),
                    public_file,
                    proof_file
                ]

                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=10
                )

                verified = 'OK!' in result.stdout

                if verified:
                    logger.info("✅ Proof verified successfully")
                else:
                    logger.warning("❌ Proof verification failed")

                return verified

            finally:
                for file in [proof_file, public_file]:
                    if os.path.exists(file):
                        os.remove(file)

        except Exception as e:
            logger.error(f"Proof verification failed: {e}")
            return False


# Singleton instance
_zk_generator = None


def get_zk_generator() -> ZKProofGenerator:
    """
    Get singleton ZK proof generator instance
    """
    global _zk_generator
    if _zk_generator is None:
        _zk_generator = ZKProofGenerator()
    return _zk_generator
