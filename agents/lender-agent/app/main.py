from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from decimal import Decimal
from typing import List, Dict
import uvicorn

from core.models.models import (
    LenderConfig, LoanRequest, LoanResponse,
    LenderAgent, LoanEvaluation, DepositRequest,
    WithdrawalRequest, FundTransaction, AgentWalletInfo
)
from core.services.lender_service import LenderService
from core.services.wallet_service import WalletService

app = FastAPI(
    title="Hivee Lender Agent API",
    description="API for autonomous lending agents in the Hivee protocol",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global service instances
lender_service = LenderService()
wallet_service = WalletService()

@app.get("/", tags=["health"])
async def root():
    """Health check endpoint"""
    return {
        "service": "Hivee Lender Agent",
        "status": "active",
        "version": "1.0.0",
        "active_agents": len(lender_service.agents),
        "ai_enabled": lender_service.ai_enabled,
        "ai_model": "groq/llama-3.1-70b-versatile" if lender_service.ai_enabled else None,
        "evaluation_methods": ["traditional", "ai-powered"] if lender_service.ai_enabled else ["traditional"]
    }

@app.post("/lender/create", response_model=LenderAgent, tags=["lender"])
async def create_lender_agent(name: str, config: LenderConfig):
    """Create a new lender agent"""
    try:
        agent = lender_service.create_lender_agent(name, config)
        return agent
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create lender agent: {str(e)}"
        )

@app.get("/lender/{agent_id}", response_model=LenderAgent, tags=["lender"])
async def get_lender_agent(agent_id: str):
    """Get lender agent details"""
    agent = lender_service.get_lender_agent(agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lender agent not found"
        )
    return agent

@app.put("/lender/{agent_id}/configure", tags=["lender"])
async def configure_lender_agent(agent_id: str, config: LenderConfig):
    """Update lender agent configuration"""
    success = lender_service.update_lender_config(agent_id, config)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lender agent not found"
        )
    return {"message": "Configuration updated successfully"}

@app.post("/lender/{agent_id}/evaluate", response_model=LoanEvaluation, tags=["loans"])
async def evaluate_loan_request(agent_id: str, loan_request: LoanRequest):
    """Evaluate a loan request without approving it (traditional risk engine)"""
    try:
        evaluation = lender_service.evaluate_loan_request(agent_id, loan_request)
        return evaluation
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate loan: {str(e)}"
        )

@app.post("/lender/{agent_id}/evaluate/ai", response_model=LoanEvaluation, tags=["loans"])
async def evaluate_loan_request_ai(agent_id: str, loan_request: LoanRequest):
    """Evaluate a loan request using AI-powered CrewAI agents"""
    try:
        evaluation = lender_service.evaluate_loan_request_ai(agent_id, loan_request)
        return evaluation
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate loan with AI: {str(e)}"
        )

@app.post("/lender/{agent_id}/loans/request", response_model=LoanResponse, tags=["loans"])
async def process_loan_request(agent_id: str, loan_request: LoanRequest):
    """Process a loan request and make a lending decision"""
    try:
        response = lender_service.process_loan_request(agent_id, loan_request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process loan request: {str(e)}"
        )

@app.get("/lender/{agent_id}/portfolio", tags=["portfolio"])
async def get_agent_portfolio(agent_id: str):
    """Get portfolio information for a lender agent"""
    portfolio = lender_service.get_agent_portfolio(agent_id)
    if "error" in portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=portfolio["error"]
        )
    return portfolio

@app.get("/lender/{agent_id}/balance", tags=["portfolio"])
async def get_agent_balance(agent_id: str):
    """Get current balance and earnings for a lender agent"""
    agent = lender_service.get_lender_agent(agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lender agent not found"
        )

    return {
        "agent_id": agent_id,
        "available_capital": float(agent.config.available_capital),
        "total_amount_lent": float(agent.total_amount_lent),
        "total_earnings": float(agent.total_earnings),
        "active_loans_count": len(agent.active_loans)
    }

@app.get("/lender/{agent_id}/criteria", tags=["matching"])
async def get_matching_criteria(agent_id: str):
    """Get matching criteria for loan requests"""
    criteria = lender_service.get_matching_criteria(agent_id)
    if "error" in criteria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=criteria["error"]
        )
    return criteria

@app.post("/loans/{loan_id}/repay", tags=["loans"])
async def process_loan_repayment(loan_id: str, amount: float):
    """Process loan repayment"""
    success = lender_service.process_loan_repayment(loan_id, Decimal(str(amount)))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found or repayment failed"
        )
    return {"message": "Repayment processed successfully"}

@app.get("/lenders", tags=["lender"])
async def list_lender_agents():
    """List all lender agents"""
    return {
        "agents": lender_service.list_agents(),
        "total_count": len(lender_service.agents)
    }

@app.get("/stats", tags=["analytics"])
async def get_system_stats():
    """Get system-wide statistics"""
    total_agents = len(lender_service.agents)
    total_loans = len(lender_service.loan_history)
    active_agents = sum(1 for agent in lender_service.agents.values() if agent.is_active)

    total_capital = sum(
        float(agent.config.available_capital)
        for agent in lender_service.agents.values()
    )

    total_lent = sum(
        float(agent.total_amount_lent)
        for agent in lender_service.agents.values()
    )

    total_earnings = sum(
        float(agent.total_earnings)
        for agent in lender_service.agents.values()
    )

    return {
        "total_agents": total_agents,
        "active_agents": active_agents,
        "total_loans_processed": total_loans,
        "total_available_capital": total_capital,
        "total_amount_lent": total_lent,
        "total_earnings": total_earnings
    }

@app.post("/lender/{agent_id}/calculate-costs", tags=["loans"])
async def calculate_loan_costs(
    agent_id: str,
    loan_amount: float,
    duration_days: int
):
    """Calculate total costs and fees for a potential loan"""
    agent = lender_service.get_lender_agent(agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lender agent not found"
        )

    try:
        costs = lender_service.calculate_total_loan_cost(
            agent.config,
            Decimal(str(loan_amount)),
            duration_days
        )

        # Convert Decimal to float for JSON response
        return {
            "agent_id": agent_id,
            "loan_amount": loan_amount,
            "duration_days": duration_days,
            "base_interest_rate": float(agent.config.base_interest_rate),
            "credit_fee_percentage": float(agent.config.credit_fee_percentage),
            "fixed_processing_fee": float(agent.config.fixed_processing_fee),
            "breakdown": {
                "principal": float(costs["principal"]),
                "interest": float(costs["interest"]),
                "fees": float(costs["fees"]),
                "total_repayment": float(costs["total_repayment"]),
                "effective_apr": float(costs["effective_apr"])
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate loan costs: {str(e)}"
        )

# Wallet and Funds Management Endpoints

@app.post("/wallet/connect", tags=["wallet"])
async def initiate_wallet_connection(agent_id: str):
    """Initiate WalletConnect session for an agent"""
    try:
        connection_info = await wallet_service.initiate_wallet_connection(agent_id)
        return connection_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate wallet connection: {str(e)}"
        )

@app.post("/wallet/confirm", tags=["wallet"])
async def confirm_wallet_connection(session_id: str, wallet_address: str, chain_id: int = 421614):
    """Confirm wallet connection after user approval"""
    try:
        connection_result = await wallet_service.confirm_wallet_connection(
            session_id, wallet_address, chain_id
        )
        return connection_result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm wallet connection: {str(e)}"
        )

@app.get("/wallet/{agent_id}", response_model=AgentWalletInfo, tags=["wallet"])
async def get_agent_wallet_info(agent_id: str):
    """Get wallet information for an agent"""
    wallet_info = wallet_service.get_agent_wallet_info(agent_id)
    if not wallet_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No wallet information found for agent"
        )
    return wallet_info

@app.post("/wallet/disconnect", tags=["wallet"])
async def disconnect_wallet(agent_id: str, wallet_address: str):
    """Disconnect a wallet from an agent"""
    success = wallet_service.disconnect_wallet(agent_id, wallet_address)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found or already disconnected"
        )
    return {"message": "Wallet disconnected successfully"}

@app.post("/funds/deposit", response_model=FundTransaction, tags=["funds"])
async def deposit_funds(deposit_request: DepositRequest):
    """Process a deposit to agent's funds"""
    try:
        transaction = await wallet_service.process_deposit(deposit_request)

        # Update agent's available capital in lender service
        agent = lender_service.get_lender_agent(deposit_request.agent_id)
        if agent and transaction.status.value == "confirmed":
            agent.config.available_capital += deposit_request.amount

        return transaction
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process deposit: {str(e)}"
        )

@app.post("/funds/withdraw", response_model=FundTransaction, tags=["funds"])
async def withdraw_funds(withdrawal_request: WithdrawalRequest):
    """Process a withdrawal from agent's funds"""
    try:
        # Check if agent exists and has sufficient balance
        agent = lender_service.get_lender_agent(withdrawal_request.agent_id)
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lender agent not found"
            )

        if agent.config.available_capital < withdrawal_request.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient available capital for withdrawal"
            )

        transaction = await wallet_service.process_withdrawal(withdrawal_request)

        # Update agent's available capital
        if transaction.status.value == "confirmed":
            agent.config.available_capital -= withdrawal_request.amount

        return transaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process withdrawal: {str(e)}"
        )

@app.get("/funds/{agent_id}/transactions", tags=["funds"])
async def get_agent_transactions(agent_id: str, transaction_type: str = None):
    """Get transaction history for an agent"""
    try:
        from core.models.models import TransactionType

        filter_type = None
        if transaction_type:
            try:
                filter_type = TransactionType(transaction_type.lower())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid transaction type: {transaction_type}"
                )

        transactions = wallet_service.get_agent_transactions(agent_id, filter_type)

        return {
            "agent_id": agent_id,
            "transactions": transactions,
            "total_count": len(transactions)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get transactions: {str(e)}"
        )

@app.get("/transaction/{transaction_id}", response_model=FundTransaction, tags=["funds"])
async def get_transaction_status(transaction_id: str):
    """Get status of a specific transaction"""
    transaction = wallet_service.get_transaction_status(transaction_id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    return transaction

@app.get("/wallet/{agent_id}/balance", tags=["funds"])
async def get_agent_funds_balance(agent_id: str):
    """Get detailed balance information for an agent"""
    # Get wallet info
    wallet_info = wallet_service.get_agent_wallet_info(agent_id)

    # Get lender agent info
    agent = lender_service.get_lender_agent(agent_id)

    if not agent and not wallet_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )

    return {
        "agent_id": agent_id,
        "wallet_balance": float(wallet_info.total_balance) if wallet_info else 0.0,
        "available_capital": float(agent.config.available_capital) if agent else 0.0,
        "total_amount_lent": float(agent.total_amount_lent) if agent else 0.0,
        "total_earnings": float(agent.total_earnings) if agent else 0.0,
        "connected_wallets": len(wallet_info.connected_wallets) if wallet_info else 0,
        "pending_deposits": len(wallet_info.pending_deposits) if wallet_info else 0,
        "pending_withdrawals": len(wallet_info.pending_withdrawals) if wallet_info else 0
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)