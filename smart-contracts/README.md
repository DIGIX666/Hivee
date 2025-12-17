# KazoX Smart Contracts

Smart contracts for the KazoX decentralized AI agent credit protocol built with Foundry.

## 🛠️ Built with Foundry

KazoX uses [Foundry](https://getfoundry.sh/) for smart contract development, testing, and deployment.

## 📁 Structure

```
smart-contracts/
├── src/                    # Smart contract source code
│   ├── core/              # Core lending contracts
│   ├── reputation/        # ERC-8004 reputation system
│   ├── zk/               # Zero-Knowledge proof contracts
│   └── tokens/           # Token contracts
├── script/               # Deployment scripts
├── test/                 # Contract tests
├── lib/                  # Dependencies (git submodules)
├── out/                  # Compiled contracts
└── cache/                # Build cache
```

## 🚀 Quick Start

### Prerequisites

- [Foundry](https://getfoundry.sh/)
- [Git](https://git-scm.com/)

### Installation

1. **Install dependencies**
   ```bash
   forge install
   ```

2. **Install OpenZeppelin contracts**
   ```bash
   forge install OpenZeppelin/openzeppelin-contracts
   ```

3. **Install Forge Standard Library**
   ```bash
   forge install foundry-rs/forge-std
   ```

### Build

```bash
forge build
```

### Test

```bash
# Run all tests
forge test

# Run tests with verbosity
forge test -vvv

# Run specific test
forge test --match-test testLendingPool
```

### Deploy

1. **Set environment variables**
   ```bash
   export PRIVATE_KEY=your_private_key
   export CAPX_TESTNET_RPC=https://testnet-rpc.capx.ai
   ```

2. **Deploy to CapX Testnet**
   ```bash
   forge script script/Deploy.s.sol --rpc-url capx_testnet --private-key $PRIVATE_KEY --broadcast
   ```

## 📋 Contracts

### Core Contracts

- **LendingPool.sol** - Main lending pool for liquidity management
- **EscrowContract.sol** - Automated escrow for agent transactions
- **MatchingEngine.sol** - AI-powered loan matching algorithm

### Reputation System

- **ReputationSystem.sol** - ERC-8004 compliant on-chain reputation

### Zero-Knowledge

- **ZKProofVerifier.sol** - Privacy-preserving transaction verification

### Tokens

- **AgentToken.sol** - Native token for agent operations

## 🧪 Testing

Tests are written in Solidity using Forge's testing framework:

```bash
# Run all tests
forge test

# Generate coverage report
forge coverage

# Generate gas report
forge test --gas-report
```

## 🚀 Deployment

### Local Development

```bash
# Start local node
anvil

# Deploy to local node
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --private-key $PRIVATE_KEY --broadcast
```

### CapX Testnet

```bash
forge script script/Deploy.s.sol --rpc-url capx_testnet --private-key $PRIVATE_KEY --broadcast --verify
```

## 🔧 Configuration

Configuration is managed through `foundry.toml`:

- Solidity version: 0.8.19
- Optimizer: enabled with 200 runs
- Networks: CapX mainnet and testnet
- Dependencies: OpenZeppelin, Forge Standard Library

## 📖 Documentation

Generate documentation:

```bash
forge doc
```

## 🛡️ Security

- All contracts use OpenZeppelin's audited implementations
- Comprehensive test coverage required
- Gas optimization enabled
- Reentrancy protection implemented

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write comprehensive tests
4. Ensure all tests pass: `forge test`
5. Submit a pull request

## 📄 License

Apache 2.0 License - see [LICENSE](../LICENSE) for details.