# Hivee Smart Contracts

Smart contracts for AI agent identity and escrow system on CapX Network.

## Contracts

### 1. AgentIdentity.sol (ERC-8004)
**Role**: On-chain identity and reputation system for AI agents

**Features**:
- ✅ Soulbound NFT (non-transferable) per agent
- ✅ Credit scoring (0-1000) based on repayment history
- ✅ Complete profile: loans, repayments, timestamps
- ✅ Authorization system for updaters (escrow contracts, broker)

**Main Methods**:
```solidity
// Register a new agent
function registerAgent(address agentAddress) returns (uint256 tokenId)

// Record loan outcome (updates score)
function recordLoanOutcome(uint256 tokenId, bool successful)

// Get credit score
function getCreditScore(uint256 tokenId) returns (uint256)

// Get complete profile
function getAgentProfile(uint256 tokenId) returns (AgentProfile)
```

**Credit Scoring**:
- Initial score: 500 (neutral)
- Successful repayment: +20 points
- Payment default: -50 points
- Min: 0, Max: 1000

### 2. AgentEscrow.sol
**Role**: Dedicated escrow contract for an agent - intercepts client payments and distributes automatically

**Features**:
- ✅ Client payment reception
- ✅ Automatic distribution: lender (principal + interest) → borrower (profit) → platform (fee)
- ✅ x402 protocol support for fast payments (~200ms)
- ✅ One active loan at a time (MVP)
- ✅ Reentrancy protection

**Workflow**:
```
Client pays → Escrow.receivePayment()
                 ↓
          _distributePayment()
                 ↓
    ┌────────────┴────────────┐
    ↓            ↓             ↓
  Lender    Borrower      Platform
(principal+ (profit)      (fee)
 interest)
```

**Main Methods**:
```solidity
// Register active loan (called by broker/lender)
function registerLoan(
    address lenderAgent,
    address token,
    uint256 principal,
    uint256 totalRepayment
)

// Receive client payment (called by client or agent SDK)
function receivePayment(address token, uint256 amount)

// Check if loan is active
function hasActiveLoan() returns (bool)
```

## Installation & Setup

### Prerequisites
```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts
```

### Configuration
```bash
cd contracts

# Create .env
cp .env.example .env

# Edit .env with:
# PRIVATE_KEY=your_private_key_here
# CAPX_RPC_URL=https://global.rpc-zkevm.capx.fi
```

### Compile
```bash
forge build

# ABIs will be in out/
# out/AgentIdentity.sol/AgentIdentity.json
# out/AgentEscrow.sol/AgentEscrow.json
```

### Tests
```bash
# Run all tests
forge test

# Tests with verbosity
forge test -vvv

# Specific test
forge test --match-test testRegisterAgent
```

### Deployment

#### On CapX Testnet
```bash
# Check config
source .env
echo $PRIVATE_KEY  # Must be set
echo $CAPX_RPC_URL # Must be set

# Deploy
forge script script/Deploy.s.sol --rpc-url capx --broadcast --verify

# See deployed addresses in logs
# Copy to backend .env:
# AGENT_IDENTITY_ADDRESS=0x...
# PLATFORM_ADDRESS=0x...
```

#### Manual Deployment
```bash
# 1. Deploy AgentIdentity
forge create src/AgentIdentity.sol:AgentIdentity \
    --rpc-url capx \
    --private-key $PRIVATE_KEY

# 2. Deploy AgentEscrow (example)
forge create src/AgentEscrow.sol:AgentEscrow \
    --rpc-url capx \
    --private-key $PRIVATE_KEY \
    --constructor-args \
        0xYOUR_AGENT_ADDRESS \
        1 \
        0xPLATFORM_ADDRESS \
        50 \
        0x0000000000000000000000000000000000000000
```

## Backend Usage

### 1. Copy ABIs
```bash
# After compilation
cp out/AgentIdentity.sol/AgentIdentity.json ../src/abis/
cp out/AgentEscrow.sol/AgentEscrow.json ../src/abis/
```

### 2. Backend Configuration (.env)
```env
AGENT_IDENTITY_ADDRESS=0x...  # AgentIdentity contract address
PLATFORM_ADDRESS=0x...        # Your platform fee recipient
PLATFORM_FEE_RATE=50          # 0.5% in basis points
```

### 3. Usage in blockchain.service.ts
```typescript
// Register an agent
const tokenId = await blockchainService.registerAgent(agentAddress)

// Deploy escrow
const escrowAddress = await blockchainService.deployEscrow(
  agentAddress,
  tokenId
)

// Get credit score
const score = await blockchainService.getCreditScore(tokenId)
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│             AgentIdentity (ERC-8004)            │
│  ┌───────────────────────────────────────────┐  │
│  │  tokenId: 1 → Agent Profile               │  │
│  │  ├─ owner: 0x...                          │  │
│  │  ├─ agentAddress: 0x...                   │  │
│  │  ├─ creditScore: 520                      │  │
│  │  ├─ totalLoans: 5                         │  │
│  │  ├─ successfulRepayments: 4               │  │
│  │  └─ failedRepayments: 1                   │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↓
         (1 agent = 1 escrow)
                      ↓
┌─────────────────────────────────────────────────┐
│          AgentEscrow (dedicated)                │
│  ┌───────────────────────────────────────────┐  │
│  │  borrowerAgent: 0x...                     │  │
│  │  agentIdentityId: 1                       │  │
│  │  currentLoan:                             │  │
│  │    ├─ lenderAgent: 0x...                  │  │
│  │    ├─ principal: 100 USDC                 │  │
│  │    ├─ totalRepayment: 103 USDC            │  │
│  │    └─ repaidAmount: 0 USDC                │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Client Payment (150 USDC) →                   │
│    ├─ Lender: 103 USDC (principal + interest)  │
│    ├─ Borrower: 46.25 USDC (profit)            │
│    └─ Platform: 0.75 USDC (0.5% fee)           │
└─────────────────────────────────────────────────┘
```


