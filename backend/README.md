# Hivee Backend

Autonomous service for uploading and processing AI agents on the Hivee platform. This service manages the complete agent processing pipeline: upload, security scanning, code modification, blockchain deployment, and Docker containerization.

## Features

### 1. Agent Upload
- Upload via ZIP file or Git URL
- Supports Python, JavaScript, TypeScript
- Format and file size validation (max 100MB)

### 2. Security Scanning
- **Bandit**: Security scanner for Python (SQL injection, command injection, hardcoded passwords)
- **ESLint**: Scanner for JavaScript/TypeScript
- **Semgrep**: Multi-language scanner (OWASP Top 10)
- **Trivy**: Vulnerability scanner for Docker containers
- Automatic blocking if high severity issues detected

### 3. Code Modification (Critical)
- **Payment address replacement**:
  - Detects all Ethereum addresses (pattern `0x[a-fA-F0-9]{40}`)
  - Replaces with the agent's dedicated escrow address
  - Scans configs: `WALLET_ADDRESS`, `PAYMENT_ADDRESS`, `RECIPIENT_ADDRESS`

- **Hivee SDK injection**:
  - Complete SDK copy into `shared/`
  - Automatic import and initialization
  - Task detection hooks
  - ZK proof generation

- **.env file creation**:
  - Platform configuration (RPC, addresses)
  - Agent environment variables

### 4. Blockchain Integration
- **On-chain registration** (ERC-8004):
  - Agent identity creation
  - Initial credit score

- **Escrow deployment**:
  - Dedicated escrow contract per agent
  - Association with ERC-8004 identity
  - x402 configuration for automatic distributions

### 5. Docker Containerization
- Dynamic Dockerfile generation (Python/Node.js)
- Sandbox isolation with resource limits:
  - Memory: 512MB
  - CPU: 0.5 cores
- Non-root user (`agentuser`)
- Final container security scan (Trivy)

### 6. Processing Queue
- In-memory queue (MVP)
- Sequential agent processing
- Ready for Redis/Bull migration in production

## Pipeline Architecture

```
1. UPLOAD → 2. EXTRACT → 3. SCAN → 4. BLOCKCHAIN → 5. MODIFY → 6. DOCKER → 7. ACTIVE
   ↓            ↓           ↓          ↓              ↓           ↓           ↓
 PENDING    SCANNING   SCAN_FAILED  MODIFYING    DEPLOYING   SCAN_FAILED  SUCCESS
                          ↓                          ↓
                       FAILED                     FAILED
```

## Installation

### Prerequisites

1. Node.js >= 18
2. PostgreSQL >= 14
3. Docker
4. Security scanners:
```bash
# Python
pip install bandit

# JavaScript
npm install -g eslint

# Multi-language
pip install semgrep

# Container scanning
# See: https://aquasecurity.github.io/trivy/
brew install trivy  # macOS
# or apt-get install trivy  # Linux
```

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Database setup
npm run db:push
npm run db:generate

# 4. Create necessary directories
mkdir -p uploads agent_code logs sdk/abis

# 5. Copy ABIs from compiled contracts
# From the contracts/ project after running `forge build`:
cp ../contracts/out/AgentIdentity.sol/AgentIdentity.json sdk/abis/
cp ../contracts/out/AgentEscrow.sol/AgentEscrow.json sdk/abis/
cp ../contracts/out/BrokerAgent.sol/BrokerAgent.json sdk/abis/
cp ../contracts/out/LenderAgent.sol/LenderAgent.json sdk/abis/

# 6. Start the service
npm run dev  # Development mode
# or
npm run build && npm start  # Production mode
```

## API Endpoints

### Upload Agent
```bash
POST /api/agents
Content-Type: multipart/form-data

Form data:
- file: ZIP file (max 100MB)
- name: string (3-100 chars)
- description: string (optional)
- language: "python" | "javascript" | "typescript"

# OR with Git:
{
  "name": "My Agent",
  "description": "...",
  "language": "python",
  "gitUrl": "https://github.com/user/agent-repo"
}

Response:
{
  "success": true,
  "data": {
    "agent": {
      "id": "uuid",
      "name": "My Agent",
      "status": "PENDING",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Get Agent Status
```bash
GET /api/agents/:id/status

Response:
{
  "success": true,
  "data": {
    "agent": {
      "id": "uuid",
      "name": "My Agent",
      "status": "ACTIVE",  # or PENDING, SCANNING, MODIFYING, etc.
      "escrowAddress": "0x...",
      "agentIdentityId": 123,
      "containerId": "docker-id",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### List Agents
```bash
GET /api/agents?status=ACTIVE&page=1&limit=10

Response:
{
  "success": true,
  "data": {
    "agents": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

### Get Agent Details
```bash
GET /api/agents/:id

Response includes:
- Agent metadata
- Owner info
- Recent loans (10 latest)
- Recent tasks (10 latest)
- On-chain data (ERC-8004 profile)
```

## Project Structure

```
hivee-backend/
├── src/
│   ├── controllers/         # Endpoint logic
│   │   └── agent.controller.ts
│   ├── routes/             # Route definitions
│   │   └── agent.routes.ts
│   ├── services/           # Business logic
│   │   ├── scanner.service.ts       # Security scans
│   │   ├── codeModifier.service.ts  # Code modification
│   │   ├── agentProcessor.service.ts # Pipeline orchestration
│   │   ├── blockchain.service.ts    # Blockchain interaction
│   │   ├── queue.service.ts         # Processing queue
│   │   └── prisma.service.ts        # Database client
│   ├── validators/         # Joi validation
│   ├── middleware/         # Express middleware
│   ├── utils/             # Utilities (logger)
│   ├── types/             # TypeScript types
│   ├── config/            # Configuration
│   └── server.ts          # Entry point
├── prisma/
│   └── schema.prisma      # Database schema
├── sdk/                   # Hivee SDK (copied into agents)
│   ├── __init__.py
│   ├── hivee_sdk.py
│   ├── zk_proof_generator.py
│   └── abis/             # Contract ABIs
├── uploads/              # Temporary upload
├── agent_code/           # Agent code (original + modified)
└── logs/                 # Application logs
```

## Environment Variables

See `.env.example` for the complete list. Critical variables:

- `DATABASE_URL`: PostgreSQL connection
- `CAPX_RPC_URL`: CapX testnet RPC
- `PRIVATE_KEY`: Private key for deployments
- `AGENT_IDENTITY_ADDRESS`: ERC-8004 contract
- `BROKER_AGENT_ADDRESS`: Broker contract
- `X402_PROTOCOL_ADDRESS`: x402 protocol
- `PLATFORM_ADDRESS`: Platform address (receives fees)
- `PLATFORM_FEE_RATE`: Fee rate (basis points)

## Security

### Upload
- MIME type validation (ZIP, TAR, GZIP only)
- Size limit: 100MB
- Code hash generated for tracking

### Scans
- Blocking if HIGH severity detected
- Results saved in DB
- Detailed logs of all findings

### Code Modification
- **CRITICAL**: Automatic payment address replacement
- SDK injection in isolated sandbox
- No possibility to bypass escrow

### Container
- Non-root user
- Strict resource limits
- Network isolation (bridge)
- Vulnerability scan before activation

## Troubleshooting

### Error "SDK source path not found"
```bash
# Verify SDK exists
ls -la sdk/

# Or define custom path
export HIVEE_SDK_PATH=/path/to/sdk
```

### Error "AgentEscrow bytecode not found"
```bash
# Compile Solidity contracts
cd ../contracts
forge build

# Copy bytecode
cp out/AgentEscrow.sol/AgentEscrow.json ../hivee-backend/sdk/abis/
```

### Container scan fails
```bash
# Install Trivy
brew install trivy  # macOS
apt-get install trivy  # Linux
```

### Security scans fail
```bash
# Install scanners
pip install bandit semgrep
npm install -g eslint
```

## Production

For production deployment:

1. Use Redis for queue:
```typescript
// Replace queue.service.ts with Bull/BullMQ
import Bull from 'bull';
const queue = new Bull('agent-processing', process.env.REDIS_URL);
```

2. Monitoring:
- Prometheus metrics
- Sentry for error tracking
- CloudWatch/Datadog logs

3. Scaling:
- Multiple workers for queue
- Horizontal scaling with load balancer
- Separate container registry

## License

MIT
