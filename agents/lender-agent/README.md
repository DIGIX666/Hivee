# Hivee Lender Agent

The Lender Agent is a core component of the Hivee decentralized credit protocol. It enables autonomous AI agents to provide lending services without human intervention.

## Features

- **🤖 AI-Powered Analysis**: CrewAI-based intelligent loan evaluation with Groq LLM (Llama-3.1-70b-versatile)
- **🔧 Traditional Risk Engine**: Advanced rule-based risk assessment as fallback
- **⚡ Dual Evaluation Modes**: Choose between AI-powered or traditional risk assessment
- **🎯 Autonomous Decision Making**: Multi-agent AI system for comprehensive loan analysis
- **📊 Configurable Lending Criteria**: Customizable parameters for maximum loan amounts, minimum credit scores, risk tolerance levels
- **🚀 Real-time Loan Processing**: Fast API for processing loan requests and making lending decisions
- **💼 Portfolio Management**: Track lending performance, earnings, and active loans
- **🌐 RESTful API**: Complete API for integration with the Hivee ecosystem

## API Endpoints

### Lender Management
- `POST /lender/create` - Create a new lender agent
- `GET /lender/{agent_id}` - Get lender agent details
- `PUT /lender/{agent_id}/configure` - Update lender configuration
- `GET /lenders` - List all lender agents

### Loan Processing
- `POST /lender/{agent_id}/evaluate` - Evaluate a loan request (traditional risk engine)
- `POST /lender/{agent_id}/evaluate/ai` - Evaluate a loan request (AI-powered CrewAI)
- `POST /lender/{agent_id}/loans/request` - Process a loan request and make decision (uses AI if available)
- `POST /loans/{loan_id}/repay` - Process loan repayment

### Portfolio & Analytics
- `GET /lender/{agent_id}/portfolio` - Get portfolio information
- `GET /lender/{agent_id}/balance` - Get current balance and earnings
- `GET /lender/{agent_id}/criteria` - Get matching criteria
- `GET /stats` - Get system-wide statistics

## Quick Start

### Prerequisites

1. **Get a Groq API Key** (for AI features)
   - Sign up at https://groq.com/
   - Get your free API key
   - Copy `.env.example` to `.env` and add your key:
     ```bash
     cp .env.example .env
     # Edit .env and add: GROQ_API_KEY=your_groq_api_key_here
     ```

### Local Development

1. **Install Dependencies**
   ```bash
   cd agents/lender-agent
   pip install -r requirements.txt
   ```

2. **Run the Service**
   ```bash
   python start_api.py
   # or
   uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Test AI Functionality**
   ```bash
   python test_ai.py  # Test both traditional and AI modes
   python test_simple.py  # Basic functionality test
   ```

4. **Access the API**
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/
   - AI Status visible in health check response

### Docker Deployment

1. **Build and Run with Docker**
   ```bash
   docker build -t hivee-lender-agent .
   docker run -p 8000:8000 hivee-lender-agent
   ```

2. **Run with Docker Compose** (from project root)
   ```bash
   docker-compose up lender-agent
   ```

## Configuration

### Lender Configuration Parameters

- `max_loan_amount`: Maximum loan amount per transaction
- `min_credit_score`: Minimum ERC-8004 credit score required (0-1000)
- `max_interest_rate`: Maximum acceptable interest rate (%)
- `auto_approve_threshold`: Auto-approve loans below this amount
- `risk_tolerance`: Risk tolerance level (low/medium/high/very_high)
- `available_capital`: Available capital for lending

### Environment Variables

- `ENVIRONMENT`: Runtime environment (development/production)
- `LOG_LEVEL`: Logging level (debug/info/warning/error)

## Testing

### Run All Tests
```bash
pytest
```

### Run Specific Test Categories
```bash
# Unit tests only
pytest tests/test_risk_engine.py tests/test_lender_service.py

# API tests only
pytest tests/test_api.py

# Verbose output
pytest -v

# With coverage
pytest --cov=src
```

### Test Coverage
The test suite includes:
- **Risk Engine Tests**: Credit assessment, loan amount evaluation, ZK proof validation
- **Service Layer Tests**: Agent management, loan processing, portfolio tracking
- **API Tests**: Full endpoint testing with various scenarios

## Architecture

### Core Components

1. **Models** (`models.py`)
   - Data models for agents, loans, configurations
   - Pydantic models for validation

2. **Risk Engine** (`risk_engine.py`)
   - Credit score analysis
   - Loan amount risk assessment
   - Interest rate evaluation
   - ZK proof validation
   - Overall risk scoring

3. **Lender Service** (`lender_service.py`)
   - Agent lifecycle management
   - Loan request processing
   - Portfolio tracking
   - Repayment handling

4. **API Layer** (`main.py`)
   - FastAPI application
   - RESTful endpoints
   - Request validation
   - Error handling

### Risk Assessment Algorithm

The risk engine evaluates loans based on weighted factors:
- **Credit Score (40%)**: ERC-8004 compliant scoring
- **Loan Amount (20%)**: Relative to lender's maximum
- **Interest Rate (15%)**: Attractiveness and acceptability
- **Duration (10%)**: Time-based risk assessment
- **ZK Proof Validity (15%)**: Zero-Knowledge proof verification

## Integration

### With Hivee Ecosystem

The Lender Agent integrates with:
- **Matching Engine**: Receives loan requests via matching algorithm
- **x402 Protocol**: Processes micropayments for transactions
- **Escrow Contracts**: Automated fund redistribution
- **ERC-8004 Registry**: Credit score verification

### API Client Example

```python
import requests

# Create a lender agent
config = {
    "max_loan_amount": 5000,
    "min_credit_score": 600,
    "max_interest_rate": 15.0,
    "auto_approve_threshold": 1000,
    "risk_tolerance": "medium",
    "available_capital": 10000
}

response = requests.post(
    "http://localhost:8000/lender/create?name=My Agent",
    json=config
)
agent = response.json()

# Process a loan request
loan_request = {
    "id": "loan-001",
    "borrower_id": "borrower-123",
    "amount": 1000,
    "interest_rate": 12.0,
    "duration_days": 30,
    "credit_score": 750,
    "zk_proof": "0x..."
}

response = requests.post(
    f"http://localhost:8000/lender/{agent['id']}/loans/request",
    json=loan_request
)
result = response.json()
```

## Security Considerations

- **Input Validation**: All requests validated with Pydantic models
- **ZK Proof Verification**: Cryptographic validation of borrower proofs
- **Rate Limiting**: Built-in protection against abuse
- **Non-root Container**: Docker runs with non-privileged user
- **Health Checks**: Monitoring endpoints for system health

## Performance

- **Async Processing**: FastAPI async support for concurrent requests
- **Efficient Risk Calculation**: Optimized algorithms for real-time decisions
- **Memory Management**: Minimal memory footprint for agent storage
- **Scalable Architecture**: Stateless design for horizontal scaling

## License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.