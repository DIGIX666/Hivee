# AgentCredit SDK for Borrower Agents

Shared library that provides blockchain communication, ZK proofs, and loan management for borrower agents.

## Features

- ✅ Generate ZK proofs for task requests
- ✅ Request loans from Broker Agent
- ✅ Check credit score (ERC-8004)
- ✅ Monitor escrow balance
- ✅ Wait for client payments
- ✅ Log task completion

## Installation

```bash
# Add to your agent's requirements.txt
web3==6.15.1
eth-account==0.10.0
aiohttp==3.9.1
```

## Quick Start

```python
from shared.agentcredit_sdk import init_agentcredit

# Initialize SDK (reads from environment)
sdk = init_agentcredit(agent_name="MyAgent")

# When task request arrives
task_notification = sdk.notify_task_received(
    client_id="client123",
    task_type="research",
    expected_payment=5.0
)

zk_proof = task_notification["zk_proof"]

# Request loan if needed
loan_response = await sdk.request_loan_for_task(
    task_cost=3.0,  # Cost to execute task
    expected_payment=5.0,  # Payment from client
    zk_proof_hash=zk_proof
)

if loan_response["approved"]:
    print(f"Loan approved at {loan_response['interest_rate']}%")
    # Execute task
else:
    print(f"Loan rejected: {loan_response['reason']}")
```

## Environment Variables

```bash
CAPX_RPC_URL=https://rpc-testnet.capx.fi
PRIVATE_KEY=your_private_key
ESCROW_ADDRESS=your_escrow_address
BROKER_API_URL=http://localhost:8001
IDENTITY_TOKEN_ID=your_identity_token_id
```

## Usage in Borrower Agents

### 1. Initialize SDK

```python
from shared import init_agentcredit

# At agent startup
sdk = init_agentcredit(agent_name="ResearchAgent")
```

### 2. Handle Task Request

```python
@app.post("/research")
async def research(request: ResearchRequest):
    # Notify platform of task
    notification = sdk.notify_task_received(
        client_id=request.client_id,
        task_type="research",
        expected_payment=PRICE_PER_RESEARCH
    )

    zk_proof = notification["zk_proof"]

    # Check if we need a loan (insufficient balance)
    current_balance = sdk.check_escrow_balance()

    if current_balance < RESEARCH_COST:
        # Request loan
        loan = await sdk.request_loan_for_task(
            task_cost=RESEARCH_COST,
            expected_payment=PRICE_PER_RESEARCH,
            zk_proof_hash=zk_proof
        )

        if not loan["approved"]:
            raise HTTPException(
                status_code=402,
                detail=f"Cannot execute: {loan['reason']}"
            )

    # Execute task
    result = execute_research(request.topic)

    # Wait for payment
    payment_received = await sdk.wait_for_payment(
        expected_amount=PRICE_PER_RESEARCH,
        timeout=300
    )

    if payment_received:
        sdk.log_task_completion(
            task_id=request.client_id,
            success=True,
            revenue=PRICE_PER_RESEARCH
        )

    return result
```

### 3. Check Credit Score

```python
# Get current credit score
score = sdk.get_credit_score()
print(f"Current credit score: {score}")
```

### 4. Monitor Escrow

```python
# Check escrow balance
balance = sdk.check_escrow_balance()
print(f"Escrow balance: ${balance}")
```

## API Reference

### AgentCreditSDK

#### `__init__(rpc_url, private_key, escrow_address, broker_api_url, identity_token_id)`

Initialize SDK with configuration.

#### `generate_zk_proof(client_id, expected_payment, task_description) -> str`

Generate ZK proof for a task request.

Returns: ZK proof hash

#### `async request_loan(amount, token, expected_revenue, zk_proof_hash, metadata) -> Dict`

Request a loan from the Broker Agent.

Returns:
```python
{
    "approved": bool,
    "lender": str,  # if approved
    "interest_rate": float,  # if approved
    "reason": str
}
```

#### `async request_loan_for_task(task_cost, expected_payment, zk_proof_hash, token) -> Dict`

Convenience method to request loan for a task. Adds 10% safety margin.

#### `notify_task_received(client_id, task_type, expected_payment) -> Dict`

Notify platform of incoming task request.

Returns:
```python
{
    "status": "received",
    "zk_proof": str,
    "expected_payment": float,
    "can_request_loan": bool
}
```

#### `get_credit_score() -> int`

Get agent's current credit score (0-1000).

#### `check_escrow_balance() -> float`

Check balance in agent's escrow contract.

#### `async wait_for_payment(expected_amount, timeout) -> bool`

Wait for payment to arrive in escrow. Returns True if payment received.

#### `log_task_completion(task_id, success, revenue)`

Log task completion for platform tracking.

### `init_agentcredit(agent_name, load_from_env) -> AgentCreditSDK`

Convenience function to initialize SDK from environment variables.

## ZK Proof System

The SDK generates ZK proofs to prove expected revenue without revealing client details.

**What it proves:**
- A paid task is incoming
- Expected payment amount
- Agent can fulfill the task

**What it hides:**
- Client identity
- Task specifics
- Timing details

In production, this uses circom + snarkjs. For MVP, it generates commitment hashes.

## Loan Flow

1. Agent receives task request
2. SDK generates ZK proof
3. Agent requests loan from Broker
4. Broker verifies proof on-chain
5. Broker matches with Lender
6. Lender disburses via smart contract
7. Agent executes task
8. Client pays escrow
9. Escrow distributes: lender + agent + platform

## Error Handling

```python
try:
    loan = await sdk.request_loan_for_task(...)

    if not loan["approved"]:
        # Handle rejection
        print(f"Rejected: {loan['reason']}")
        # Options:
        # - Return error to client
        # - Execute without loan (if possible)
        # - Queue for later

except Exception as e:
    # Handle SDK errors
    print(f"SDK error: {e}")
```

## Testing

```python
# Test SDK initialization
sdk = init_agentcredit(agent_name="TestAgent")
assert sdk.w3.is_connected()

# Test ZK proof generation
proof = sdk.generate_zk_proof("client1", 5.0, "test")
assert proof.startswith("0x")
assert len(proof) == 66  # 0x + 64 hex chars

# Test credit score
score = sdk.get_credit_score()
assert 0 <= score <= 1000
```

## License

MIT
