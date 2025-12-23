#!/bin/bash

# Setup script for ZK-SNARK circuits
# This script automates the setup process described in SETUP_GUIDE.md

set -e  # Exit on error

echo "========================================="
echo "ZK-SNARK Circuit Setup Script"
echo "========================================="
echo ""

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "ERROR: circom not found. Please install circom first:"
    echo "  https://docs.circom.io/getting-started/installation/"
    exit 1
fi

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo "ERROR: snarkjs not found. Installing globally..."
    npm install -g snarkjs
fi

echo "✓ circom and snarkjs are installed"
echo ""

# Install dependencies
echo "Step 1: Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Download Powers of Tau if not present
if [ ! -f "powersOfTau28_hez_final_14.ptau" ]; then
    echo "Step 2: Downloading Powers of Tau (96 MB)..."
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau
    echo "✓ Powers of Tau downloaded"
else
    echo "Step 2: Powers of Tau already exists"
fi
echo ""

# Compile the circuit
echo "Step 3: Compiling circuit..."
circom task_proof.circom --r1cs --wasm --sym -o build
echo "✓ Circuit compiled"
echo ""

# Setup - Generate proving and verification keys
echo "Step 4: Generating proving keys (this may take a few minutes)..."

# Phase 1: Setup
snarkjs groth16 setup build/task_proof.r1cs powersOfTau28_hez_final_14.ptau keys/task_proof_0000.zkey

# Phase 2: Contribute (first contribution)
echo "Adding entropy for first contribution..."
snarkjs zkey contribute keys/task_proof_0000.zkey keys/task_proof_0001.zkey \
  --name="First contribution" \
  --entropy="$(date +%s)$(openssl rand -hex 32)" \
  -v

# Phase 2: Contribute (second contribution for production)
echo "Adding entropy for second contribution..."
snarkjs zkey contribute keys/task_proof_0001.zkey keys/task_proof.zkey \
  --name="Second contribution" \
  --entropy="$(date +%s)$(openssl rand -hex 32)" \
  -v

# Export verification key
snarkjs zkey export verificationkey keys/task_proof.zkey keys/verification_key.json

# Clean up intermediate keys
rm -f keys/task_proof_0000.zkey keys/task_proof_0001.zkey

echo "✓ Proving and verification keys generated"
echo ""

# Test with sample inputs
echo "Step 5: Testing with sample inputs..."
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
echo "Generating proof..."
snarkjs groth16 fullprove test_inputs.json \
  build/task_proof_js/task_proof.wasm \
  keys/task_proof.zkey \
  test_proof.json \
  test_public.json

# Verify proof
echo "Verifying proof..."
snarkjs groth16 verify \
  keys/verification_key.json \
  test_public.json \
  test_proof.json

echo ""
echo "========================================="
echo "✓ Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. The circuits are ready to use"
echo "2. To enable real ZK proofs in production, set useRealZKProof = true in:"
echo "   backend/src/services/zkProof.service.ts:12"
echo ""
echo "Files generated:"
echo "  - build/task_proof.r1cs           (circuit constraints)"
echo "  - build/task_proof_js/*.wasm      (circuit WASM)"
echo "  - keys/task_proof.zkey            (proving key)"
echo "  - keys/verification_key.json      (verification key)"
echo ""
echo "To generate the Solidity verifier (optional):"
echo "  npm run export-verifier"
echo ""
