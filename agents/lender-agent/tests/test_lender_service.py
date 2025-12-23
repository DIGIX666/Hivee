import pytest
from decimal import Decimal
import sys
import os

# Add project root to the path
project_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, project_root)

from core.models.models import LenderConfig, LoanRequest, RiskLevel, LoanStatus
from core.services.lender_service import LenderService

class TestLenderService:

    @pytest.fixture
    def lender_service(self):
        return LenderService()

    @pytest.fixture
    def sample_config(self):
        return LenderConfig(
            max_loan_amount=Decimal("5000"),
            min_credit_score=600,
            max_interest_rate=Decimal("15.0"),
            auto_approve_threshold=Decimal("1000"),
            risk_tolerance=RiskLevel.MEDIUM,
            available_capital=Decimal("10000")
        )

    @pytest.fixture
    def sample_loan_request(self):
        return LoanRequest(
            id="loan-001",
            borrower_id="borrower-123",
            amount=Decimal("1000"),
            interest_rate=Decimal("10.0"),
            duration_days=30,
            credit_score=750,
            zk_proof="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )

    def test_create_lender_agent(self, lender_service, sample_config):
        """Test creating a new lender agent"""
        agent = lender_service.create_lender_agent("Test Agent", sample_config)

        assert agent.name == "Test Agent"
        assert agent.config == sample_config
        assert agent.total_loans_issued == 0
        assert agent.total_amount_lent == Decimal("0")
        assert agent.total_earnings == Decimal("0")
        assert agent.is_active == True
        assert len(agent.active_loans) == 0

        # Verify agent is stored in service
        retrieved_agent = lender_service.get_lender_agent(agent.id)
        assert retrieved_agent == agent

    def test_get_nonexistent_agent(self, lender_service):
        """Test getting a non-existent agent"""
        agent = lender_service.get_lender_agent("non-existent-id")
        assert agent is None

    def test_update_lender_config(self, lender_service, sample_config):
        """Test updating lender agent configuration"""
        agent = lender_service.create_lender_agent("Test Agent", sample_config)

        new_config = LenderConfig(
            max_loan_amount=Decimal("10000"),
            min_credit_score=700,
            max_interest_rate=Decimal("20.0"),
            auto_approve_threshold=Decimal("2000"),
            risk_tolerance=RiskLevel.HIGH,
            available_capital=Decimal("15000")
        )

        success = lender_service.update_lender_config(agent.id, new_config)
        assert success == True

        updated_agent = lender_service.get_lender_agent(agent.id)
        assert updated_agent.config == new_config

        # Test updating non-existent agent
        success = lender_service.update_lender_config("non-existent-id", new_config)
        assert success == False

    def test_process_loan_request_approve(self, lender_service, sample_config, sample_loan_request):
        """Test processing a loan request that should be approved"""
        agent = lender_service.create_lender_agent("Test Agent", sample_config)

        response = lender_service.process_loan_request(agent.id, sample_loan_request)

        assert response.loan_id == sample_loan_request.id
        assert response.decision == "approved"
        assert response.terms is not None

        # Verify agent state updated
        updated_agent = lender_service.get_lender_agent(agent.id)
        assert updated_agent.total_loans_issued == 1
        assert updated_agent.total_amount_lent == sample_loan_request.amount
        assert updated_agent.config.available_capital == sample_config.available_capital - sample_loan_request.amount
        assert sample_loan_request.id in updated_agent.active_loans

        # Verify loan stored in history
        assert sample_loan_request.id in lender_service.loan_history

    def test_process_loan_request_insufficient_capital(self, lender_service, sample_loan_request):
        """Test processing a loan request with insufficient capital"""
        config = LenderConfig(
            max_loan_amount=Decimal("5000"),
            min_credit_score=600,
            max_interest_rate=Decimal("15.0"),
            auto_approve_threshold=Decimal("1000"),
            risk_tolerance=RiskLevel.MEDIUM,
            available_capital=Decimal("500")  # Less than loan amount
        )

        agent = lender_service.create_lender_agent("Test Agent", config)
        response = lender_service.process_loan_request(agent.id, sample_loan_request)

        assert response.decision == "rejected"
        assert "Insufficient capital" in response.reason

    def test_process_loan_request_inactive_agent(self, lender_service, sample_config, sample_loan_request):
        """Test processing a loan request for an inactive agent"""
        agent = lender_service.create_lender_agent("Test Agent", sample_config)
        agent.is_active = False

        response = lender_service.process_loan_request(agent.id, sample_loan_request)

        assert response.decision == "rejected"
        assert "inactive" in response.reason

    def test_process_loan_request_nonexistent_agent(self, lender_service, sample_loan_request):
        """Test processing a loan request for a non-existent agent"""
        response = lender_service.process_loan_request("non-existent-id", sample_loan_request)

        assert response.decision == "rejected"
        assert "not found" in response.reason

    def test_process_loan_request_high_risk(self, lender_service, sample_config):
        """Test processing a high-risk loan request"""
        high_risk_loan = LoanRequest(
            id="loan-002",
            borrower_id="borrower-456",
            amount=Decimal("4000"),
            interest_rate=Decimal("25.0"),  # High interest rate
            duration_days=180,  # Long duration
            credit_score=400,  # Poor credit
            zk_proof="invalid_proof"  # Invalid ZK proof
        )

        agent = lender_service.create_lender_agent("Test Agent", sample_config)
        response = lender_service.process_loan_request(agent.id, high_risk_loan)

        assert response.decision == "rejected"
        assert "Risk assessment failed" in response.reason

    def test_evaluate_loan_request(self, lender_service, sample_config, sample_loan_request):
        """Test evaluating a loan request without processing"""
        agent = lender_service.create_lender_agent("Test Agent", sample_config)

        evaluation = lender_service.evaluate_loan_request(agent.id, sample_loan_request)

        assert evaluation.loan_id == sample_loan_request.id
        assert evaluation.risk_score >= 0
        assert evaluation.confidence >= 0
        assert evaluation.recommendation in ["approve", "reject", "manual_review"]

        # Verify agent state not changed
        assert agent.total_loans_issued == 0
        assert len(agent.active_loans) == 0

    def test_get_agent_portfolio(self, lender_service, sample_config, sample_loan_request):
        """Test getting agent portfolio information"""
        agent = lender_service.create_lender_agent("Test Agent", sample_config)

        # Initially empty portfolio
        portfolio = lender_service.get_agent_portfolio(agent.id)
        assert portfolio["total_loans_issued"] == 0
        assert portfolio["active_loans_count"] == 0

        # Process a loan
        lender_service.process_loan_request(agent.id, sample_loan_request)

        # Check updated portfolio
        portfolio = lender_service.get_agent_portfolio(agent.id)
        assert portfolio["total_loans_issued"] == 1
        assert portfolio["active_loans_count"] == 1
        assert len(portfolio["active_loans"]) == 1

    def test_process_loan_repayment(self, lender_service, sample_config, sample_loan_request):
        """Test processing loan repayment"""
        agent = lender_service.create_lender_agent("Test Agent", sample_config)

        # First approve a loan
        response = lender_service.process_loan_request(agent.id, sample_loan_request)
        assert response.decision == "approved"

        initial_capital = agent.config.available_capital
        loan_amount = sample_loan_request.amount
        repayment_amount = loan_amount * Decimal("1.1")  # With interest

        # Process repayment
        success = lender_service.process_loan_repayment(sample_loan_request.id, repayment_amount)
        assert success == True

        # Verify agent state updated
        updated_agent = lender_service.get_lender_agent(agent.id)
        assert updated_agent.config.available_capital == initial_capital + repayment_amount
        assert updated_agent.total_earnings == repayment_amount - loan_amount
        assert sample_loan_request.id not in updated_agent.active_loans

        # Verify loan status in history
        loan_info = lender_service.loan_history[sample_loan_request.id]
        assert loan_info["status"] == LoanStatus.REPAID

    def test_process_nonexistent_loan_repayment(self, lender_service):
        """Test processing repayment for non-existent loan"""
        success = lender_service.process_loan_repayment("non-existent-loan", Decimal("1000"))
        assert success == False

    def test_get_matching_criteria(self, lender_service, sample_config):
        """Test getting matching criteria for an agent"""
        agent = lender_service.create_lender_agent("Test Agent", sample_config)

        criteria = lender_service.get_matching_criteria(agent.id)

        assert criteria["agent_id"] == agent.id
        assert criteria["max_loan_amount"] == float(sample_config.max_loan_amount)
        assert criteria["min_credit_score"] == sample_config.min_credit_score
        assert criteria["max_interest_rate"] == float(sample_config.max_interest_rate)
        assert criteria["available_capital"] == float(sample_config.available_capital)
        assert criteria["risk_tolerance"] == sample_config.risk_tolerance
        assert criteria["is_active"] == True

    def test_list_agents(self, lender_service, sample_config):
        """Test listing all lender agents"""
        # Initially empty
        agents = lender_service.list_agents()
        assert len(agents) == 0

        # Create multiple agents
        agent1 = lender_service.create_lender_agent("Agent 1", sample_config)
        agent2 = lender_service.create_lender_agent("Agent 2", sample_config)

        agents = lender_service.list_agents()
        assert len(agents) == 2

        agent_names = [agent["name"] for agent in agents]
        assert "Agent 1" in agent_names
        assert "Agent 2" in agent_names

    def test_multiple_loans_workflow(self, lender_service, sample_config):
        """Test complete workflow with multiple loans"""
        agent = lender_service.create_lender_agent("Multi-Loan Agent", sample_config)

        # Create multiple loan requests
        loans = []
        for i in range(3):
            loan = LoanRequest(
                id=f"loan-{i+1}",
                borrower_id=f"borrower-{i+1}",
                amount=Decimal("1000"),
                interest_rate=Decimal("12.0"),
                duration_days=30,
                credit_score=700 + i*10,
                zk_proof="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
            )
            loans.append(loan)

        # Process all loans
        approved_loans = []
        for loan in loans:
            response = lender_service.process_loan_request(agent.id, loan)
            if response.decision == "approved":
                approved_loans.append(loan.id)

        # Verify agent state
        updated_agent = lender_service.get_lender_agent(agent.id)
        assert updated_agent.total_loans_issued == len(approved_loans)
        assert len(updated_agent.active_loans) == len(approved_loans)

        # Process repayments
        for loan_id in approved_loans:
            success = lender_service.process_loan_repayment(loan_id, Decimal("1120"))  # 12% interest
            assert success == True

        # Verify final state
        final_agent = lender_service.get_lender_agent(agent.id)
        assert len(final_agent.active_loans) == 0
        assert final_agent.total_earnings > Decimal("0")