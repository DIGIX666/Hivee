"""
Hivee SDK for Borrower Agents
Provides blockchain communication, ZK proofs, and loan management
"""

import os
import logging
import hashlib
import json
from typing import Optional, Dict
from web3 import Web3
from web3.middleware import geth_poa_middleware
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

class HiveeSDK:
    """
    SDK for borrower agents to interact with Hivee platform
    """

    def __init__(
        self,
        rpc_url: str,
        private_key: str,
        escrow_address: str,
        broker_api_url: str = "http://localhost:8001",
        identity_token_id: Optional[int] = None
    ):
        """
        Initialize SDK

        Args:
            rpc_url: CapX RPC URL
            private_key: Agent's private key
            escrow_address: Agent's escrow contract address
            broker_api_url: Broker Agent API URL
            identity_token_id: Agent's ERC-8004 identity token ID
        """
        self.rpc_url = rpc_url
        self.private_key = private_key
        self.escrow_address = escrow_address
        self.broker_api_url = broker_api_url
        self.identity_token_id = identity_token_id

        # Initialize Web3
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)

        # Get account
        self.account = self.w3.eth.account.from_key(private_key)
        self.address = self.account.address

        # Storage for last generated ZK proof (for verification/debugging)
        self._last_zk_proof = None

        logger.info(f"Hivee SDK initialized for {self.address}")
        logger.info(f"Escrow: {self.escrow_address}")
        logger.info(f"Blockchain connected: {self.w3.is_connected()}")

    def generate_zk_proof(
        self,
        client_id: str,
        expected_payment: float,
        task_description: str,
        use_real_zk: bool = True
    ) -> str:
        """
        Generate ZK proof for task request

        Uses real ZK-SNARKs (circom/snarkjs) if available,
        otherwise falls back to simple hash commitment.

        Args:
            client_id: Client identifier (kept private in proof)
            expected_payment: Expected payment amount
            task_description: Description of the task (kept private)
            use_real_zk: Use real ZK-SNARKs if True (default), hash fallback if False

        Returns:
            ZK proof hash
        """
        try:
            if use_real_zk:
                try:
                    # Try using real ZK-SNARK proof generation
                    from .zk_proof_generator import get_zk_generator

                    logger.info("Generating real ZK-SNARK proof...")

                    zk_gen = get_zk_generator()
                    proof_hash, proof_data = zk_gen.generate_proof(
                        client_id=client_id,
                        expected_payment=expected_payment,
                        task_description=task_description,
                        agent_address=self.address
                    )

                    # Store full proof data for later verification/submission
                    self._last_zk_proof = proof_data

                    logger.info(f"✅ Real ZK-SNARK proof generated: {proof_hash}")
                    return f"0x{proof_hash}"

                except (ImportError, FileNotFoundError, RuntimeError) as e:
                    logger.warning(f"Real ZK proof generation failed: {e}")
                    logger.warning("Falling back to simple hash commitment")

            # Fallback: Generate simple hash commitment (MVP mode)
            timestamp = int(datetime.now().timestamp())

            proof_data = {
                "agent_address": self.address,
                "client_id": client_id,
                "expected_payment": expected_payment,
                "task_description": task_description,
                "timestamp": timestamp,
                "nonce": os.urandom(16).hex()
            }

            proof_string = json.dumps(proof_data, sort_keys=True)
            proof_hash = "0x" + hashlib.sha256(proof_string.encode()).hexdigest()

            logger.info(f"Generated hash commitment proof: {proof_hash}")
            logger.info(f"Proof commits to payment of ${expected_payment}")

            return proof_hash

        except Exception as e:
            logger.error(f"Error generating ZK proof: {e}")
            raise

    async def request_loan(
        self,
        amount: float,
        token: str,
        expected_revenue: float,
        zk_proof_hash: str,
        metadata: Optional[Dict] = None
    ) -> Dict:
        """
        Request a loan from the Broker Agent

        Args:
            amount: Loan amount needed
            token: Token address (e.g., USDC)
            expected_revenue: Expected revenue from task
            zk_proof_hash: ZK proof of expected revenue
            metadata: Additional metadata

        Returns:
            Loan response with approval status
        """
        try:
            import aiohttp

            if not self.identity_token_id:
                raise ValueError("Identity token ID not set - agent must be registered")

            # Prepare loan request
            request_data = {
                "agent_identity_id": self.identity_token_id,
                "borrower_address": self.address,
                "escrow_address": self.escrow_address,
                "amount": amount,
                "token": token,
                "zk_proof_hash": zk_proof_hash,
                "expected_revenue": expected_revenue,
                "agent_metadata": metadata or {}
            }

            logger.info(f"Requesting loan of ${amount} from Broker")

            # Call Broker Agent API
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.broker_api_url}/match-loan",
                    json=request_data,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    result = await response.json()

                    if response.status == 200 and result.get("matched"):
                        logger.info(f"Loan approved! Matched with lender at {result.get('interest_rate')}%")
                        return {
                            "approved": True,
                            "lender": result.get("lender_address"),
                            "interest_rate": result.get("interest_rate"),
                            "loan_request_id": result.get("loan_request_id"),
                            "reason": result.get("reason")
                        }
                    else:
                        logger.warning(f"Loan rejected: {result.get('reason')}")
                        return {
                            "approved": False,
                            "reason": result.get("reason", "Unknown error")
                        }

        except Exception as e:
            logger.error(f"Error requesting loan: {e}")
            return {
                "approved": False,
                "reason": f"Error: {str(e)}"
            }

    def notify_task_received(
        self,
        client_id: str,
        task_type: str,
        expected_payment: float
    ) -> Dict:
        """
        Notify platform that a task request was received
        This is called by the injected hook

        Args:
            client_id: Client identifier
            task_type: Type of task requested
            expected_payment: Expected payment amount

        Returns:
            Response with instructions
        """
        try:
            logger.info(f"Task received from {client_id}: {task_type} for ${expected_payment}")

            # Generate ZK proof
            zk_proof = self.generate_zk_proof(
                client_id=client_id,
                expected_payment=expected_payment,
                task_description=task_type
            )

            return {
                "status": "received",
                "zk_proof": zk_proof,
                "expected_payment": expected_payment,
                "can_request_loan": True
            }

        except Exception as e:
            logger.error(f"Error notifying task: {e}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def request_loan_for_task(
        self,
        task_cost: float,
        expected_payment: float,
        zk_proof_hash: str,
        token: str = "USDC"
    ) -> Dict:
        """
        Convenience method to request a loan for a specific task

        Args:
            task_cost: Cost to execute the task
            expected_payment: Expected payment from client
            zk_proof_hash: ZK proof hash
            token: Token for loan

        Returns:
            Loan response
        """
        # Add safety margin (10%) to loan amount
        loan_amount = task_cost * 1.1

        return await self.request_loan(
            amount=loan_amount,
            token=token,
            expected_revenue=expected_payment,
            zk_proof_hash=zk_proof_hash,
            metadata={
                "task_cost": task_cost,
                "safety_margin": 0.1
            }
        )

    def get_credit_score(self) -> int:
        """
        Get agent's current credit score from blockchain

        Returns:
            Credit score (0-1000)
        """
        try:
            if not self.identity_token_id:
                return 500  # Default neutral score

            # TODO: Call AgentIdentity.sol contract
            # For now, return default
            return 500

        except Exception as e:
            logger.error(f"Error getting credit score: {e}")
            return 500

    def check_escrow_balance(self) -> float:
        """
        Check balance in agent's escrow contract

        Returns:
            Balance in USDC
        """
        try:
            # Get ETH balance of escrow (in wei)
            balance_wei = self.w3.eth.get_balance(self.escrow_address)
            balance_eth = balance_wei / 10**18

            logger.info(f"Escrow balance: {balance_eth} ETH")

            # TODO: Also check USDC balance via ERC20 contract

            return balance_eth

        except Exception as e:
            logger.error(f"Error checking escrow balance: {e}")
            return 0.0

    async def wait_for_payment(
        self,
        expected_amount: float,
        timeout: int = 300
    ) -> bool:
        """
        Wait for payment to arrive in escrow

        Args:
            expected_amount: Expected payment amount
            timeout: Timeout in seconds

        Returns:
            True if payment received, False otherwise
        """
        try:
            start_time = datetime.now()
            initial_balance = self.check_escrow_balance()

            logger.info(f"Waiting for payment of ${expected_amount}...")
            logger.info(f"Initial escrow balance: ${initial_balance}")

            while (datetime.now() - start_time).seconds < timeout:
                await asyncio.sleep(5)  # Check every 5 seconds

                current_balance = self.check_escrow_balance()
                received = current_balance - initial_balance

                if received >= expected_amount * 0.95:  # 5% tolerance
                    logger.info(f"Payment received! ${received}")
                    return True

            logger.warning(f"Payment timeout after {timeout}s")
            return False

        except Exception as e:
            logger.error(f"Error waiting for payment: {e}")
            return False

    def log_task_completion(
        self,
        task_id: str,
        success: bool,
        revenue: float
    ):
        """
        Log task completion for platform tracking

        Args:
            task_id: Task identifier
            success: Whether task was successful
            revenue: Revenue earned from task
        """
        try:
            logger.info(f"Task {task_id} completed: success={success}, revenue=${revenue}")

            # TODO: Call backend API to log task completion
            # This will update credit score if loan was involved

        except Exception as e:
            logger.error(f"Error logging task completion: {e}")


# Convenience function for agents to initialize SDK
def init_hivee(
    agent_name: str = "BorrowerAgent",
    load_from_env: bool = True
) -> HiveeSDK:
    """
    Initialize Hivee SDK with environment variables

    Args:
        agent_name: Name of the agent (for logging)
        load_from_env: Load configuration from environment

    Returns:
        Initialized HiveeSDK instance
    """
    if not load_from_env:
        raise ValueError("Manual configuration not yet supported")

    # Load from environment
    rpc_url = os.getenv("CAPX_RPC_URL", "https://global.rpc-zkevm.capx.fi")
    private_key = os.getenv("PRIVATE_KEY")
    escrow_address = os.getenv("ESCROW_ADDRESS")
    broker_api_url = os.getenv("BROKER_API_URL", "http://localhost:8001")
    identity_token_id = os.getenv("IDENTITY_TOKEN_ID")

    if not private_key:
        raise ValueError("PRIVATE_KEY environment variable required")

    if not escrow_address:
        raise ValueError("ESCROW_ADDRESS environment variable required")

    identity_id = int(identity_token_id) if identity_token_id else None

    logger.info(f"Initializing Hivee SDK for {agent_name}")

    return HiveeSDK(
        rpc_url=rpc_url,
        private_key=private_key,
        escrow_address=escrow_address,
        broker_api_url=broker_api_url,
        identity_token_id=identity_id
    )
