# KazoX - Decentralized AI Agent Credit Protocol

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![CapX](https://img.shields.io/badge/blockchain-CapX-green.svg)](https://capx.ai/)
[![Hackathon](https://img.shields.io/badge/event-CAPX_Hackathon-orange.svg)](https://hackathon.capx.ai/)

> **Autonomous lending and borrowing protocol for AI agents**

KazoX is a revolutionary decentralized credit protocol that enables autonomous AI agents to lend and borrow without human intervention. Built on CapX blockchain with cutting-edge Zero-Knowledge proofs and micropayments technology.

##  Key Features

- **Zero-Knowledge Privacy**: Complete transaction privacy using ZK-proofs
- **Micropayments Protocol**: x402 protocol for efficient micro-transactions
- **On-chain Reputation**: ERC-8004 compliant reputation system
- **Autonomous Matching**: AI-powered lending/borrowing matching engine
- **Smart Escrow**: Automated escrow contracts for each agent
- **Risk Assessment**: Real-time risk evaluation and scoring

##  Project Structure

```
KazoX/
├──  smart-contracts/          # Solidity smart contracts
│   ├── contracts/
│   │   ├── core/               # Core lending contracts
│   │   ├── reputation/         # ERC-8004 reputation system
│   │   ├── zk/                # Zero-Knowledge proof contracts
│   │   └── tokens/            # Token contracts
│   ├── scripts/               # Deployment scripts
│   └── test/                  # Contract tests
│
├──  frontend/                 # Next.js React application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/            # Next.js pages
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API services
│   │   └── utils/            # Utility functions
│   └── public/               # Static assets
│
├──  backend/                  # Node.js Express API
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic services
│   │   ├── middleware/       # Express middleware
│   │   └── models/           # Data models
│   └── config/               # Configuration files
│
├──  ai-agents/               # Python AI agents
│   ├── src/
│   │   ├── agents/           # Agent implementations
│   │   ├── protocols/        # Communication protocols
│   │   └── reputation/       # Reputation logic
│   └── requirements.txt      # Python dependencies
│
└──  analytics/               # Monitoring & analytics
    ├── src/                  # Data processing
    └── dashboards/           # Grafana dashboards
```

##  Technology Stack

| Component | Technology |
|-----------|------------|
| **Blockchain** | CapX Testnet (EVM Compatible) |
| **Smart Contracts** | Solidity + Foundry + OpenZeppelin |
| **Frontend** | Next.js + TypeScript + TailwindCSS |
| **Backend** | Node.js + Express + PostgreSQL + Redis |
| **AI Agents** | Python + FastAPI + CrewAI |
| **Zero-Knowledge** | Circom + SnarkJS |
| **Micropayments** | x402 Protocol |
| **Analytics** | Grafana + Prometheus |

## 🚀 Quick Start

### Prerequisites

- [Foundry](https://getfoundry.sh/) (for smart contracts)
- Node.js v18+
- Python 3.9+
- PostgreSQL
- Redis
- CapX wallet

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/KazoX.git
   cd KazoX
   ```

2. **Install smart contract dependencies**
   ```bash
   cd smart-contracts
   forge install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Install backend dependencies**
   ```bash
   cd ../backend
   npm install
   ```

5. **Install AI agent dependencies**
   ```bash
   cd ../ai-agents
   pip install -r requirements.txt
   ```

6. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Development

1. **Start the database**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Deploy smart contracts**
   ```bash
   cd smart-contracts
   forge script script/Deploy.s.sol --rpc-url capx_testnet --private-key $PRIVATE_KEY --broadcast
   ```

3. **Start backend services**
   ```bash
   cd backend
   npm run dev
   ```

4. **Start frontend**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Start AI agents**
   ```bash
   cd ai-agents
   python src/main.py
   ```

##  API Endpoints

### Agents
- `GET /api/v1/agents` - List all agents
- `POST /api/v1/agents` - Register new agent
- `GET /api/v1/agents/:id` - Get agent details

### Lending
- `POST /api/v1/loans/request` - Create loan request
- `POST /api/v1/loans/offer` - Create loan offer
- `GET /api/v1/loans/match` - Get matching loans

### Reputation
- `GET /api/v1/reputation/:agentId` - Get agent reputation
- `POST /api/v1/reputation/update` - Update reputation score

### ZK Proofs
- `POST /api/v1/zkproofs/generate` - Generate ZK proof
- `POST /api/v1/zkproofs/verify` - Verify ZK proof

##  AI Agent Types

### Lender Agent
- Evaluates loan requests
- Proposes lending terms
- Manages risk assessment

### Borrower Agent
- Searches for optimal loans
- Negotiates terms
- Manages repayments

### Risk Agent
- Performs risk evaluation
- Updates credit scores
- Monitors defaults

### Reputation Agent
- Tracks agent behavior
- Updates reputation scores
- Manages ERC-8004 compliance

##  Market Opportunity

- **AI Agent Market Size**: $7.63-7.92B by 2025
- **Growth Rate**: 45-49.6% CAGR
- **Enterprise Adoption**: 51% of large enterprises use Agentic AI
- **Target**: Autonomous financial infrastructure

##  Roadmap

### Phase 1: Core Infrastructure
- [ ] Smart contract deployment
- [ ] Basic API endpoints
- [ ] Simple frontend interface

### Phase 2: AI Integration
- [ ] Agent implementation
- [ ] Reputation system
- [ ] Risk assessment

### Phase 3: Advanced Features
- [ ] Zero-Knowledge proofs
- [ ] Micropayments protocol
- [ ] Advanced matching engine

### Phase 4: Production Ready
- [ ] Security audits
- [ ] Performance optimization
- [ ] Mainnet deployment


##  License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## Links
- **App**: [Soon!](#)
- **Twitter**: [@KazoX](#)

## Acknowledgments

- [CapX](https://capx.ai/) for blockchain infrastructure
- [CAPX Hackathon](https://hackathon.capx.ai/) for the Hackathon
- OpenZeppelin for smart contract security
- CrewAI for agent framework

---

**Built with ❤️ by Kazai and Thox for the future of autonomous AI finance**