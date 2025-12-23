# Phase 8: ZK-SNARK Circuits Configuration (Production)

This guide explains how to configure real ZK-SNARK circuits with circom to replace simplified proofs with real cryptographic proofs.

## 📋 Prerequisites

### 1. Install Required Tools

```bash
# Node.js (usually already installed)
node --version  # >= 16.x

# Install circom (circuit compiler)
cd /tmp
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
circom --version  # Should display version

# Install snarkjs (proof generator)
npm install -g snarkjs

# Install circomlib (circuit library)
cd /home/kazai/777LAB/Hivee/backend/zk-circuits
npm install circomlib
```

### 2. Verify Installation

```bash
circom --version
snarkjs --version
```

## 🔧 Implementation Steps

### Step 1: Create the Circom Circuit

Create the file `task_proof.circom` in `/home/kazai/777LAB/Hivee/backend/zk-circuits/`:

```circom
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/*
 * ZK-SNARK circuit to prove that a future payment >= minimum loan amount
 * Without revealing client identity or task details
 */
template TaskProof() {
    // ========== PRIVATE INPUTS (hidden from verifier) ==========
    signal input clientIdHash;      // Client ID hash
    signal input taskDescHash;      // Task description hash
    signal input nonce;             // Nonce for uniqueness
    signal input timestamp;         // Timestamp for freshness

    // ========== PUBLIC INPUTS (visible to verifier) ==========
    signal input agentAddress;      // Agent address (converted to field)
    signal input expectedPayment;   // Expected amount (in micro-USDC, 6 decimals)
    signal input minLoanAmount;     // Minimum loan amount

    // ========== PUBLIC OUTPUT ==========
    signal output proofHash;        // Unique proof hash

    // ========== CONSTRAINT 1: Verify that payment >= minimum amount ==========
    component gte = GreaterEqThan(64);
    gte.in[0] <== expectedPayment;
    gte.in[1] <== minLoanAmount;
    gte.out === 1;  // Must be true

    // ========== CONSTRAINT 2: Generate proof hash ==========
    // Uses Poseidon (ZK-friendly hash)
    component hasher = Poseidon(7);
    hasher.inputs[0] <== clientIdHash;
    hasher.inputs[1] <== taskDescHash;
    hasher.inputs[2] <== nonce;
    hasher.inputs[3] <== timestamp;
    hasher.inputs[4] <== agentAddress;
    hasher.inputs[5] <== expectedPayment;
    hasher.inputs[6] <== minLoanAmount;

    proofHash <== hasher.out;
}

// Declare public inputs
component main {public [agentAddress, expectedPayment, minLoanAmount]} = TaskProof();
```

### Step 2: Create package.json

Create `package.json` in `/home/kazai/777LAB/Hivee/backend/zk-circuits/`:

```json
{
  "name": "hivee-zk-circuits",
  "version": "1.0.0",
  "description": "ZK-SNARK circuits for Hivee task proofs",
  "scripts": {
    "install-circomlib": "npm install circomlib",
    "download-ptau": "wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau",
    "compile": "circom task_proof.circom --r1cs --wasm --sym -o build",
    "setup": "snarkjs groth16 setup build/task_proof.r1cs powersOfTau28_hez_final_14.ptau keys/task_proof_0000.zkey && snarkjs zkey contribute keys/task_proof_0000.zkey keys/task_proof_0001.zkey --name='First contribution' -v && snarkjs zkey export verificationkey keys/task_proof_0001.zkey keys/verification_key.json && mv keys/task_proof_0001.zkey keys/task_proof.zkey",
    "generate-proof": "snarkjs groth16 fullprove inputs.json build/task_proof_js/task_proof.wasm keys/task_proof.zkey proof.json public.json",
    "verify-proof": "snarkjs groth16 verify keys/verification_key.json public.json proof.json",
    "export-verifier": "snarkjs zkey export solidityverifier keys/task_proof.zkey verifier.sol",
    "test": "npm run generate-proof && npm run verify-proof"
  },
  "dependencies": {
    "circomlib": "^2.0.5",
    "snarkjs": "^0.7.0"
  },
  "devDependencies": {}
}
```

### Step 3: Download Powers of Tau

Powers of Tau are necessary for ZK-SNARK setup. These are public parameters generated during a trusted ceremony.

```bash
cd /home/kazai/777LAB/Hivee/backend/zk-circuits

# Download Powers of Tau (final ceremony)
# Size 14 = support up to 2^14 constraints (~16k constraints)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau

# Verify download
ls -lh powersOfTau28_hez_final_14.ptau
# Should be ~96 MB

# Alternative if wget doesn't work:
curl -O https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau
```

### Step 4: Compile the Circuit

```bash
cd /home/kazai/777LAB/Hivee/backend/zk-circuits

# Install dependencies
npm install

# Compile the circuit
circom task_proof.circom --r1cs --wasm --sym -o build

# Verify generated files
ls -la build/
# Should contain:
# - task_proof.r1cs        (circuit constraints)
# - task_proof.sym         (symbols for debugging)
# - task_proof_js/         (compiled WASM)
```

**Expected output:**
```
template instances: 9
non-linear constraints: 534
linear constraints: 0
public inputs: 3
private inputs: 4
public outputs: 1
wires: 541
labels: 1089
```

### Step 5: Generate Proving/Verification Keys

```bash
cd /home/kazai/777LAB/Hivee/backend/zk-circuits

# Step 5a: Initial setup (Phase 1)
snarkjs groth16 setup build/task_proof.r1cs powersOfTau28_hez_final_14.ptau keys/task_proof_0000.zkey

# Step 5b: Contribution (Phase 2) - Add entropy
snarkjs zkey contribute keys/task_proof_0000.zkey keys/task_proof_0001.zkey \
  --name="First contribution" \
  --entropy="$(date +%s)$(openssl rand -hex 32)" \
  -v

# Step 5c: Final contribution (optional, for production)
snarkjs zkey contribute keys/task_proof_0001.zkey keys/task_proof.zkey \
  --name="Second contribution" \
  --entropy="$(date +%s)$(openssl rand -hex 32)" \
  -v

# Step 5d: Export verification key
snarkjs zkey export verificationkey keys/task_proof.zkey keys/verification_key.json

# Verify files
ls -lh keys/
# Should contain:
# - task_proof.zkey           (final proving key)
# - verification_key.json     (verification key)
```

### Step 6: Test Proof Generation

Create a test file `test_inputs.json`:

```json
{
  "clientIdHash": "12345678901234567890123456789012",
  "taskDescHash": "98765432109876543210987654321098",
  "nonce": 123456,
  "timestamp": 1704067200,
  "agentAddress": "1234567890123456789012345678901234567890",
  "expectedPayment": 15000000,
  "minLoanAmount": 10000000
}
```

Generate and verify a proof:

```bash
cd /home/kazai/777LAB/Hivee/backend/zk-circuits

# Create test input file
cat > test_inputs.json << 'EOF'
{
  "clientIdHash": "12345678901234567890123456789012",
  "taskDescHash": "98765432109876543210987654321098",
  "nonce": 123456,
  "timestamp": 1704067200,
  "agentAddress": "1234567890123456789012345678901234567890",
  "expectedPayment": 15000000,
  "minLoanAmount": 10000000
}
EOF

# Generate proof
snarkjs groth16 fullprove test_inputs.json \
  build/task_proof_js/task_proof.wasm \
  keys/task_proof.zkey \
  test_proof.json \
  test_public.json

# Verify proof
snarkjs groth16 verify \
  keys/verification_key.json \
  test_public.json \
  test_proof.json

# Should display: [INFO]  snarkJS: OK!
```

### Step 7: Enable ZK-SNARKs in Code

Modify the file `backend/src/services/zkProof.service.ts`:

```typescript
// Around line 10
export class ZKProofService {
  private zkCircuitPath = path.join(__dirname, '../../zk-circuits');
  private useRealZKProof = true; // ← CHANGE false to true

  // ... rest of code
}
```

### Step 8: Test the Complete System

```bash
# Terminal 1: Backend
cd /home/kazai/777LAB/Hivee/backend
npm run dev

# Terminal 2: Simulate a task
cd /home/kazai/777LAB/Hivee/backend
npx tsx scripts/simulate-client-task.ts
```

**Verify in logs:**
```
[INFO] Generating ZK proof for task: AI research task...
[INFO] Real ZK-SNARK proof generated: 0x7f8e9d0c1b2a3...
```

### Step 9: (Optional) Generate Solidity Verifier

To verify proofs on-chain:

```bash
cd /home/kazai/777LAB/Hivee/backend/zk-circuits

# Generate verifier smart contract
snarkjs zkey export solidityverifier keys/task_proof.zkey TaskProofVerifier.sol

# The TaskProofVerifier.sol file can be deployed on blockchain
# It contains the verifyProof() function to verify proofs on-chain
```

## 📊 Performance and Characteristics

### Circuit Size
- **Constraints**: ~534 (very light)
- **Private inputs**: 4 (clientIdHash, taskDescHash, nonce, timestamp)
- **Public inputs**: 3 (agentAddress, expectedPayment, minLoanAmount)
- **Public output**: 1 (proofHash)

### Generation Time
- **Proof**: ~2-5 seconds (depends on CPU)
- **Verification**: ~100-200ms on-chain
- **Off-chain verification**: ~50-100ms

### File Sizes
- **Proving key** (task_proof.zkey): ~3-5 MB
- **Proof JSON**: ~1-2 KB
- **Verification key**: ~1-2 KB

## 🔒 Security

### What is Hidden (Zero-Knowledge)
✅ Client identity (`clientIdHash`)
✅ Task description (`taskDescHash`)
✅ Nonce (uniqueness)
✅ Exact timestamp

### What is Revealed (Public)
⚠️ Agent address
⚠️ Expected payment amount
⚠️ Minimum loan amount

### Cryptographic Guarantees
- **Soundness**: Impossible to create a fake proof
- **Zero-Knowledge**: Private data doesn't leak
- **Completeness**: A valid proof is always accepted

## 🐛 Troubleshooting

### Error: `circom: command not found`
```bash
# Reinstall circom
cargo install --path circom --force
# Or add to PATH:
export PATH=$PATH:~/.cargo/bin
```

### Error: `Powers of Tau file not found`
```bash
# Re-download
cd /home/kazai/777LAB/Hivee/backend/zk-circuits
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau
```

### Error: `Circuit compilation failed`
```bash
# Check circuit syntax
circom task_proof.circom --inspect

# Verify circomlib is installed
npm install circomlib
```

### Error: `Proof generation timeout`
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" snarkjs groth16 fullprove ...
```

### Invalid Proof
```bash
# Check inputs
cat inputs.json

# Verify that expectedPayment >= minLoanAmount
# Values must be in micro-USDC (6 decimals)
# Example: 15.5 USDC = 15500000
```

## 📚 Additional Resources

- **Circom Documentation**: https://docs.circom.io/
- **SnarkJS Documentation**: https://github.com/iden3/snarkjs
- **Circomlib Circuits**: https://github.com/iden3/circomlib
- **ZK-SNARK Explainer**: https://z.cash/technology/zksnarks/
- **Poseidon Hash**: https://www.poseidon-hash.info/

## ✅ Implementation Checklist

- [ ] Install circom and snarkjs
- [ ] Create task_proof.circom
- [ ] Create package.json
- [ ] Download Powers of Tau
- [ ] Compile the circuit
- [ ] Generate keys (setup + contribute)
- [ ] Export verification key
- [ ] Test with test_inputs.json
- [ ] Enable useRealZKProof = true
- [ ] Test with simulate-client-task.ts
- [ ] (Optional) Generate Solidity verifier
- [ ] Deploy to production

## 🎯 Next Steps After Phase 8

1. **Optimization**: Reduce number of constraints if needed
2. **Multi-Party Computation**: Add more contributions for maximum security
3. **On-Chain Verification**: Deploy Solidity verifier
4. **Monitoring**: Add metrics on generation time
5. **Caching**: Cache recent proofs
6. **Batch Verification**: Verify multiple proofs simultaneously

---

**Estimated implementation time**: 2-3 hours (with tools already installed)

**Difficulty**: Intermediate to Advanced

**Technical prerequisites**: Basic understanding of ZK-SNARKs recommended
