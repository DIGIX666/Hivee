# Agent Task Simulation Scripts

This directory contains scripts to simulate client task requests to agents.

## Scripts Disponibles

### 1. `create-task.ts` - Créer une tâche pour un agent spécifique (NOUVEAU)

Script simple pour créer une tâche ciblée sur un agent spécifique.

#### Usage:

```bash
# Avec un agent spécifique
npx tsx scripts/create-task.ts <agentId> [amount] [description]

# Exemples:
npx tsx scripts/create-task.ts abc123 15.5 "AI research task"
npx tsx scripts/create-task.ts abc123 8.0
npx tsx scripts/create-task.ts abc123

# Sans agentId (utilise le premier agent actif)
npx tsx scripts/create-task.ts
```

#### Paramètres:

- **agentId** (optionnel): ID de l'agent ciblé. Si non fourni, utilise le premier agent actif
- **amount** (optionnel): Montant en USDC. Défaut: 15.0
- **description** (optionnel): Description de la tâche. Défaut: "AI research task: Analyze market trends"

**Note**: Si aucun lender n'est disponible, le prêt sera créé avec status `PENDING` (nouvelle fonctionnalité).

---

### 2. `simulate-client-task.ts` - Simulate Client Task

The `simulate-client-task.ts` script simulates a client requesting a task from an active agent.

### Prerequisites

1. Ensure the backend server is running:
   ```bash
   cd backend
   npm run dev
   ```

2. Ensure PostgreSQL is running:
   ```bash
   docker-compose up -d postgres
   ```

3. Ensure you have at least one ACTIVE agent deployed

### Usage

#### Single Task Simulation

Run a single task simulation:

```bash
cd backend
npx tsx scripts/simulate-client-task.ts
```

This will:
1. Find an active agent
2. Generate a random task (50% chance of requiring a loan)
3. Create the task via API
4. Wait for ZK proof generation
5. Display the final task status and loan details (if applicable)

#### Multiple Tasks Simulation

Run multiple task simulations:

```bash
cd backend
npx tsx scripts/simulate-client-task.ts multiple 5
```

This will create 5 tasks sequentially with 3-second delays between each.

### What Happens

1. **Task Creation** (`PENDING`)
   - Client submits a task request with amount and description
   - System generates a unique task hash and client hash

2. **ZK Proof Generation** (5-10 seconds)
   - System generates a cryptographic proof of the task parameters
   - Proof type: Simplified hash-based (upgradable to real ZK-SNARK)
   - Private inputs: clientId, taskDescription, nonce, timestamp
   - Public inputs: agentAddress, expectedPayment, minLoanAmount

3. **Loan Decision**
   - If `amount > loanThreshold` (default: 10 USDC):
     - Status → `AWAITING_FUNDS`
     - Automatic loan request is created
     - System finds compatible lender
     - Loan request is sent to blockchain (if available)
   - Otherwise:
     - Status → `FUNDED`
     - Task is ready for execution

4. **Loan Workflow** (if loan is required)
   - Lender reviews and approves loan
   - Funds are disbursed to agent's escrow
   - Task status → `FUNDED`
   - Task is ready for execution

### Example Output

```
🎬 Simulating client task request...

📋 Fetching active agents...
✅ Selected agent: TestAgent-v1 (a1b2c3d4...)

📋 Task details:
   Client ID: client_742
   Amount: 15.5 USDC
   Description: AI research task: Analyze market trends for DeFi protocols
   Loan Threshold: 10.0 USDC
   Will require loan: YES ✅

🚀 Creating task...
✅ Task created successfully!
   Task ID: e5f6g7h8...
   Status: PENDING
   Requires loan: true

⏳ Waiting for ZK proof generation and loan request...

📊 Final Task Status:
─────────────────────────────────────────
   Task ID: e5f6g7h8...
   Status: AWAITING_FUNDS
   Amount: 15.5 USDC
   Client Hash: 8a9b0c1d2e3f4g5h...
   ZK Proof: 0x7f8e9d0c1b2a3... ✅

💰 Loan Details:
   Loan ID: i9j0k1l2...
   Lender: LenderAgent-1
   Status: REQUESTED
   Principal: 12.4 USDC
   Interest Rate: 500bp
   Expected Repayment: 13.02 USDC
─────────────────────────────────────────

ℹ️  Status Explanation:
   The task is waiting for loan approval and fund disbursement.
   Once the lender approves and disburses funds, the task will move to FUNDED status.

🎉 Simulation complete!
```

### Environment Variables

- `API_URL`: Backend API URL (default: `http://localhost:3001`)

### Task Status Flow

```
PENDING
  ↓ (ZK proof generated)
  ├─→ AWAITING_FUNDS (if loan required)
  │     ↓ (loan disbursed)
  │   FUNDED
  │
  └─→ FUNDED (if no loan required)
        ↓
      IN_PROGRESS
        ↓
      COMPLETED
        ↓
      PAID
```

### Troubleshooting

**Error: "No active agents found"**
- Upload and deploy an agent first using the `/api/agents` endpoint
- Check agent status: `GET /api/agents/:id/status`

**Error: "No compatible lender found"**
- Create a lender with sufficient funds
- Ensure lender's `minCreditScore` is low enough
- Ensure lender's `maxLoanAmount` is high enough

**Task stuck in PENDING**
- Check backend logs for errors
- ZK proof generation should complete within 10 seconds
- Verify the backend is running

**Task stuck in AWAITING_FUNDS**
- Check if lender exists and is active
- Manually approve the loan: `PATCH /api/loans/:loanId/approve`
- Manually disburse the loan: `POST /api/loans/:loanId/disburse`

### API Endpoints

**Create Task**
```http
POST /api/tasks
Content-Type: application/json

{
  "agentId": "agent-uuid",
  "clientId": "client_123",
  "amount": 15.5,
  "description": "Task description",
  "loanThreshold": 10.0
}
```

**Get Agent Tasks**
```http
GET /api/agents/:agentId/tasks?status=AWAITING_FUNDS
```

**Get Task Details**
```http
GET /api/tasks/:taskId
```

## Next Steps

After tasks are created and funded:

1. **Execute Task**: Agent processes the task (manual or automatic)
2. **Complete Task**: `POST /api/tasks/:taskId/complete`
3. **Client Pays**: Client sends payment to escrow contract
4. **Distribution**: Funds are distributed automatically (Lender, Agent, Platform)
5. **Mark as Paid**: `POST /api/tasks/:taskId/paid`
6. **Repay Loan**: `POST /api/loans/:loanId/repay`

## Dashboard

View all tasks in the frontend:

```
http://localhost:3000/agents/:agentId/tasks
```

Features:
- Real-time task status updates (polling every 5s)
- Loan details display
- ZK proof hash display
- Task statistics (total, awaiting funds, active, completed)
- Color-coded status indicators
