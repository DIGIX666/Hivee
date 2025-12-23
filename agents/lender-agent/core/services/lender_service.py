from decimal import Decimal
from typing import Dict, List, Optional
import uuid
import os
from datetime import datetime

from core.models.models import (
    LenderAgent, LenderConfig, LoanRequest, LoanResponse,
    LoanEvaluation, LoanStatus
)
from core.engines.risk_engine import RiskEngine

class LenderService:
    """
    Core service for managing lending operations
    """

    def __init__(self):
        self.agents: Dict[str, LenderAgent] = {}
        self.risk_engine = RiskEngine()
        self.loan_history: Dict[str, dict] = {}

        # Initialize CrewAI with Groq LLM if API key is available
        self.ai_crew = None
        self.ai_enabled = False
        if os.getenv("GROQ_API_KEY"):
            try:
                from infrastructure.agents.crew_simple import LenderCrewAI
                self.ai_crew = LenderCrewAI()
                self.ai_enabled = True
                print("✅ CrewAI with Groq LLM initialized successfully")
            except Exception as e:
                print(f"⚠️  CrewAI with Groq initialization failed: {e}")
                print("🔄 Falling back to traditional risk engine")
                import traceback
                traceback.print_exc()
        else:
            print("⚠️  GROQ_API_KEY not found - using traditional risk engine only")

    def create_lender_agent(self, name: str, config: LenderConfig) -> LenderAgent:
        """Create a new lender agent"""
        agent_id = str(uuid.uuid4())
        agent = LenderAgent(
            id=agent_id,
            name=name,
            config=config
        )
        self.agents[agent_id] = agent
        return agent

    def get_lender_agent(self, agent_id: str) -> Optional[LenderAgent]:
        """Get lender agent by ID"""
        return self.agents.get(agent_id)

    def update_lender_config(self, agent_id: str, config: LenderConfig) -> bool:
        """Update lender agent configuration"""
        if agent_id not in self.agents:
            return False

        self.agents[agent_id].config = config
        return True

    def evaluate_loan_request(self, agent_id: str, loan_request: LoanRequest) -> LoanEvaluation:
        """Evaluate a loan request using the risk engine"""
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Lender agent {agent_id} not found")

        return self.risk_engine.evaluate_loan(loan_request, agent.config)

    def evaluate_loan_request_ai(self, agent_id: str, loan_request: LoanRequest) -> LoanEvaluation:
        """Evaluate a loan request using AI-powered CrewAI agents"""
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Lender agent {agent_id} not found")

        if not self.ai_enabled or not self.ai_crew:
            # Fallback to traditional evaluation
            print("🔄 AI not available, using traditional risk engine")
            return self.risk_engine.evaluate_loan(loan_request, agent.config)

        try:
            # Prepare data for AI analysis
            loan_data = {
                "amount": float(loan_request.amount),
                "interest_rate": float(loan_request.interest_rate),
                "duration_days": loan_request.duration_days,
                "credit_score": loan_request.credit_score,
                "zk_proof": loan_request.zk_proof,
                "purpose": loan_request.purpose,
                "borrower_id": loan_request.borrower_id
            }

            lender_config_data = {
                "max_loan_amount": float(agent.config.max_loan_amount),
                "min_credit_score": agent.config.min_credit_score,
                "max_interest_rate": float(agent.config.max_interest_rate),
                "risk_tolerance": agent.config.risk_tolerance.value,
                "available_capital": float(agent.config.available_capital),
                "auto_approve_threshold": float(agent.config.auto_approve_threshold)
            }

            # Get AI analysis
            print("🤖 Analyzing loan request with CrewAI + Groq LLM...")
            ai_result = self.ai_crew.analyze_loan_request(loan_data, lender_config_data)

            # Create enhanced LoanEvaluation with AI results
            evaluation = LoanEvaluation(
                loan_id=loan_request.id,
                risk_score=ai_result.get("risk_score", 50.0),
                recommendation=ai_result.get("recommendation", "manual_review"),
                confidence=ai_result.get("confidence", 0.5),
                analysis={
                    **ai_result.get("analysis", {}),
                    "ai_reasoning": ai_result.get("reasoning", ""),
                    "evaluation_method": "ai_powered_crewai_groq",
                    "groq_model": "llama-3.3-70b-versatile"
                }
            )

            print(f"🎯 AI Recommendation: {evaluation.recommendation} (confidence: {evaluation.confidence:.2f})")
            return evaluation

        except Exception as e:
            print(f"❌ AI evaluation failed: {e}")
            print("🔄 Falling back to traditional risk engine")
            # Fallback to traditional evaluation
            return self.risk_engine.evaluate_loan(loan_request, agent.config)

    def process_loan_request(self, agent_id: str, loan_request: LoanRequest) -> LoanResponse:
        """Process a loan request and return decision"""
        agent = self.agents.get(agent_id)
        if not agent:
            return LoanResponse(
                loan_id=loan_request.id,
                decision="rejected",
                reason="Lender agent not found"
            )

        if not agent.is_active:
            return LoanResponse(
                loan_id=loan_request.id,
                decision="rejected",
                reason="Lender agent is inactive"
            )

        # Check if sufficient capital is available
        if loan_request.amount > agent.config.available_capital:
            return LoanResponse(
                loan_id=loan_request.id,
                decision="rejected",
                reason="Insufficient capital available"
            )

        # Evaluate the loan request (use AI if available, otherwise traditional)
        if self.ai_enabled:
            evaluation = self.evaluate_loan_request_ai(agent_id, loan_request)
        else:
            evaluation = self.evaluate_loan_request(agent_id, loan_request)

        # Make decision based on evaluation
        if evaluation.recommendation == "approve":
            return self._approve_loan(agent, loan_request, evaluation)
        elif evaluation.recommendation == "manual_review":
            return LoanResponse(
                loan_id=loan_request.id,
                decision="pending",
                reason="Requires manual review",
                terms={
                    "risk_score": evaluation.risk_score,
                    "confidence": evaluation.confidence
                }
            )
        else:
            return LoanResponse(
                loan_id=loan_request.id,
                decision="rejected",
                reason="Risk assessment failed",
                terms={
                    "risk_score": evaluation.risk_score,
                    "analysis": evaluation.analysis
                }
            )

    def _approve_loan(self, agent: LenderAgent, loan_request: LoanRequest, evaluation: LoanEvaluation) -> LoanResponse:
        """Approve a loan and update agent state"""
        # Update agent statistics
        agent.total_loans_issued += 1
        agent.total_amount_lent += loan_request.amount
        agent.config.available_capital -= loan_request.amount
        agent.active_loans.append(loan_request.id)

        # Store loan in history
        self.loan_history[loan_request.id] = {
            "agent_id": agent.id,
            "loan_request": loan_request.dict(),
            "evaluation": evaluation.dict(),
            "status": LoanStatus.APPROVED,
            "approved_at": datetime.utcnow().isoformat(),
            "expected_return": float(loan_request.amount * (1 + loan_request.interest_rate / 100))
        }

        return LoanResponse(
            loan_id=loan_request.id,
            decision="approved",
            reason="Loan approved based on risk assessment",
            terms={
                "amount": float(loan_request.amount),
                "interest_rate": float(loan_request.interest_rate),
                "duration_days": loan_request.duration_days,
                "risk_score": evaluation.risk_score,
                "confidence": evaluation.confidence,
                "expected_return": float(loan_request.amount * (1 + loan_request.interest_rate / 100))
            }
        )

    def get_agent_portfolio(self, agent_id: str) -> Dict:
        """Get portfolio information for an agent"""
        agent = self.agents.get(agent_id)
        if not agent:
            return {"error": "Agent not found"}

        active_loans_details = []
        for loan_id in agent.active_loans:
            if loan_id in self.loan_history:
                loan_info = self.loan_history[loan_id]
                active_loans_details.append({
                    "loan_id": loan_id,
                    "amount": loan_info["loan_request"]["amount"],
                    "interest_rate": loan_info["loan_request"]["interest_rate"],
                    "borrower_id": loan_info["loan_request"]["borrower_id"],
                    "status": loan_info["status"],
                    "approved_at": loan_info["approved_at"]
                })

        return {
            "agent_id": agent.id,
            "agent_name": agent.name,
            "config": agent.config.dict(),
            "total_loans_issued": agent.total_loans_issued,
            "total_amount_lent": float(agent.total_amount_lent),
            "total_earnings": float(agent.total_earnings),
            "active_loans_count": len(agent.active_loans),
            "active_loans": active_loans_details,
            "is_active": agent.is_active
        }

    def calculate_loan_fees(self, agent_config: LenderConfig, loan_amount: Decimal) -> Dict[str, Decimal]:
        """Calculate all fees for a loan based on lender configuration"""
        processing_fee_percentage = loan_amount * (agent_config.credit_fee_percentage / 100)
        fixed_fee = agent_config.fixed_processing_fee
        total_fees = processing_fee_percentage + fixed_fee

        return {
            "processing_fee_percentage": processing_fee_percentage,
            "fixed_processing_fee": fixed_fee,
            "total_fees": total_fees
        }

    def calculate_total_loan_cost(self, agent_config: LenderConfig, loan_amount: Decimal, duration_days: int) -> Dict[str, Decimal]:
        """Calculate total cost of loan including interest and fees"""
        # Calculate fees
        fees = self.calculate_loan_fees(agent_config, loan_amount)

        # Calculate interest (annualized)
        annual_interest_rate = agent_config.base_interest_rate / 100
        daily_interest_rate = annual_interest_rate / 365
        total_interest = loan_amount * daily_interest_rate * duration_days

        # Total amount to repay
        total_repayment = loan_amount + total_interest + fees["total_fees"]

        return {
            "principal": loan_amount,
            "interest": total_interest,
            "fees": fees["total_fees"],
            "total_repayment": total_repayment,
            "effective_apr": ((total_repayment / loan_amount - 1) * (Decimal(str(365)) / Decimal(str(duration_days)))) * 100
        }

    def process_loan_repayment(self, loan_id: str, amount: Decimal) -> bool:
        """Process loan repayment"""
        if loan_id not in self.loan_history:
            return False

        loan_info = self.loan_history[loan_id]
        agent_id = loan_info["agent_id"]
        agent = self.agents.get(agent_id)

        if not agent:
            return False

        # Update loan status
        loan_info["status"] = LoanStatus.REPAID
        loan_info["repaid_at"] = datetime.utcnow().isoformat()
        loan_info["repaid_amount"] = float(amount)

        # Calculate earnings
        loan_amount = Decimal(str(loan_info["loan_request"]["amount"]))
        earnings = amount - loan_amount

        # Update agent state
        agent.config.available_capital += amount
        agent.total_earnings += earnings
        if loan_id in agent.active_loans:
            agent.active_loans.remove(loan_id)

        return True

    def get_matching_criteria(self, agent_id: str) -> Dict:
        """Get matching criteria for an agent"""
        agent = self.agents.get(agent_id)
        if not agent:
            return {"error": "Agent not found"}

        return {
            "agent_id": agent.id,
            "max_loan_amount": float(agent.config.max_loan_amount),
            "min_credit_score": agent.config.min_credit_score,
            "max_interest_rate": float(agent.config.max_interest_rate),
            "available_capital": float(agent.config.available_capital),
            "risk_tolerance": agent.config.risk_tolerance,
            "auto_approve_threshold": float(agent.config.auto_approve_threshold),
            "is_active": agent.is_active
        }

    def list_agents(self) -> List[Dict]:
        """List all lender agents with basic info"""
        return [
            {
                "id": agent.id,
                "name": agent.name,
                "available_capital": float(agent.config.available_capital),
                "total_loans_issued": agent.total_loans_issued,
                "is_active": agent.is_active
            }
            for agent in self.agents.values()
        ]