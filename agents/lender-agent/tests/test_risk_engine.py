import pytest
from decimal import Decimal
import sys
import os

# Add project root to the path
project_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, project_root)

from core.models.models import LoanRequest, LenderConfig, RiskLevel
from core.engines.risk_engine import RiskEngine

class TestRiskEngine:

    @pytest.fixture
    def risk_engine(self):
        return RiskEngine()

    @pytest.fixture
    def sample_loan_request(self):
        return LoanRequest(
            id="test-loan-001",
            borrower_id="borrower-123",
            amount=Decimal("1000"),
            interest_rate=Decimal("10.0"),
            duration_days=30,
            credit_score=750,
            zk_proof="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )

    @pytest.fixture
    def sample_lender_config(self):
        return LenderConfig(
            max_loan_amount=Decimal("5000"),
            min_credit_score=600,
            max_interest_rate=Decimal("15.0"),
            auto_approve_threshold=Decimal("1000"),
            risk_tolerance=RiskLevel.MEDIUM,
            available_capital=Decimal("10000")
        )

    def test_evaluate_loan_good_credit(self, risk_engine, sample_loan_request, sample_lender_config):
        """Test loan evaluation with good credit score"""
        evaluation = risk_engine.evaluate_loan(sample_loan_request, sample_lender_config)

        assert evaluation.loan_id == "test-loan-001"
        assert evaluation.risk_score <= 30  # Should be low risk
        assert evaluation.recommendation == "approve"
        assert evaluation.confidence > 0.7
        assert "credit_assessment" in evaluation.analysis

    def test_evaluate_loan_poor_credit(self, risk_engine, sample_lender_config):
        """Test loan evaluation with poor credit score"""
        poor_credit_loan = LoanRequest(
            id="test-loan-002",
            borrower_id="borrower-456",
            amount=Decimal("1000"),
            interest_rate=Decimal("10.0"),
            duration_days=30,
            credit_score=400,
            zk_proof="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )

        evaluation = risk_engine.evaluate_loan(poor_credit_loan, sample_lender_config)

        assert evaluation.risk_score > 50  # Should be high risk
        assert evaluation.recommendation in ["reject", "manual_review"]
        assert evaluation.analysis["credit_assessment"]["level"] == "very_poor"

    def test_evaluate_loan_large_amount(self, risk_engine, sample_lender_config):
        """Test loan evaluation with large amount"""
        large_amount_loan = LoanRequest(
            id="test-loan-003",
            borrower_id="borrower-789",
            amount=Decimal("4500"),  # 90% of max amount
            interest_rate=Decimal("10.0"),
            duration_days=30,
            credit_score=750,
            zk_proof="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )

        evaluation = risk_engine.evaluate_loan(large_amount_loan, sample_lender_config)

        assert evaluation.analysis["amount_assessment"]["ratio"] == 0.9
        assert evaluation.analysis["amount_assessment"]["level"] == "very_high"

    def test_evaluate_loan_invalid_zk_proof(self, risk_engine, sample_lender_config):
        """Test loan evaluation with invalid ZK proof"""
        invalid_proof_loan = LoanRequest(
            id="test-loan-004",
            borrower_id="borrower-101",
            amount=Decimal("1000"),
            interest_rate=Decimal("10.0"),
            duration_days=30,
            credit_score=750,
            zk_proof="invalid_proof"
        )

        evaluation = risk_engine.evaluate_loan(invalid_proof_loan, sample_lender_config)

        assert evaluation.analysis["zk_proof_assessment"]["valid"] == False
        assert evaluation.analysis["zk_proof_assessment"]["level"] == "invalid"
        assert evaluation.risk_score > 40  # Should increase risk significantly

    def test_evaluate_loan_high_interest_rate(self, risk_engine, sample_lender_config):
        """Test loan evaluation with high interest rate"""
        high_rate_loan = LoanRequest(
            id="test-loan-005",
            borrower_id="borrower-102",
            amount=Decimal("1000"),
            interest_rate=Decimal("20.0"),  # Above max rate
            duration_days=30,
            credit_score=750,
            zk_proof="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )

        evaluation = risk_engine.evaluate_loan(high_rate_loan, sample_lender_config)

        assert evaluation.analysis["interest_assessment"]["level"] == "unacceptable"

    def test_credit_score_assessment(self, risk_engine):
        """Test credit score assessment logic"""
        # Excellent credit
        excellent = risk_engine._assess_credit_score(850)
        assert excellent["level"] == "excellent"
        assert excellent["score"] == 10

        # Good credit
        good = risk_engine._assess_credit_score(750)
        assert good["level"] == "good"
        assert good["score"] == 25

        # Fair credit
        fair = risk_engine._assess_credit_score(650)
        assert fair["level"] == "fair"
        assert fair["score"] == 50

        # Poor credit
        poor = risk_engine._assess_credit_score(550)
        assert poor["level"] == "poor"
        assert poor["score"] == 75

        # Very poor credit
        very_poor = risk_engine._assess_credit_score(400)
        assert very_poor["level"] == "very_poor"
        assert very_poor["score"] == 95

    def test_loan_amount_assessment(self, risk_engine):
        """Test loan amount assessment logic"""
        max_amount = Decimal("1000")

        # Low amount
        low = risk_engine._assess_loan_amount(Decimal("200"), max_amount)
        assert low["level"] == "low"
        assert low["ratio"] == 0.2

        # Exceeds limit
        exceed = risk_engine._assess_loan_amount(Decimal("1500"), max_amount)
        assert exceed["level"] == "exceeds_limit"
        assert exceed["ratio"] == 1.5

    def test_zk_proof_validation(self, risk_engine):
        """Test ZK proof validation logic"""
        # Valid proof
        valid = risk_engine._validate_zk_proof("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
        assert valid["valid"] == True
        assert valid["level"] == "valid"
        assert valid["score"] == 10

        # Invalid proof
        invalid = risk_engine._validate_zk_proof("invalid")
        assert invalid["valid"] == False
        assert invalid["level"] == "invalid"
        assert invalid["score"] == 100

    def test_risk_tolerance_levels(self, risk_engine, sample_loan_request):
        """Test different risk tolerance levels"""
        # Conservative lender
        conservative_config = LenderConfig(
            max_loan_amount=Decimal("5000"),
            min_credit_score=700,
            max_interest_rate=Decimal("10.0"),
            auto_approve_threshold=Decimal("500"),
            risk_tolerance=RiskLevel.LOW,
            available_capital=Decimal("10000")
        )

        # Aggressive lender
        aggressive_config = LenderConfig(
            max_loan_amount=Decimal("5000"),
            min_credit_score=500,
            max_interest_rate=Decimal("25.0"),
            auto_approve_threshold=Decimal("2000"),
            risk_tolerance=RiskLevel.HIGH,
            available_capital=Decimal("10000")
        )

        # Test with moderate risk loan
        moderate_risk_loan = LoanRequest(
            id="test-loan-006",
            borrower_id="borrower-103",
            amount=Decimal("2000"),
            interest_rate=Decimal("15.0"),
            duration_days=60,
            credit_score=650,
            zk_proof="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )

        conservative_eval = risk_engine.evaluate_loan(moderate_risk_loan, conservative_config)
        aggressive_eval = risk_engine.evaluate_loan(moderate_risk_loan, aggressive_config)

        # Conservative lender should be more restrictive
        assert conservative_eval.recommendation in ["reject", "manual_review"]
        # Aggressive lender should be more accepting
        assert aggressive_eval.recommendation in ["approve", "manual_review"]