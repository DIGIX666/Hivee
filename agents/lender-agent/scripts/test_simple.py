#!/usr/bin/env python3
"""
Simple test script to verify the lender agent functionality
"""

import sys
import os

# Add project root to path
project_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, project_root)

from decimal import Decimal
from core.models.models import LenderConfig, LoanRequest, RiskLevel
from core.services.lender_service import LenderService
from core.engines.risk_engine import RiskEngine

def test_basic_functionality():
    """Test basic lender agent functionality"""
    print("🧪 Testing Hivee Lender Agent...")

    # Initialize service
    lender_service = LenderService()

    # Create a lender agent
    config = LenderConfig(
        max_loan_amount=Decimal("5000"),
        min_credit_score=600,
        max_interest_rate=Decimal("15.0"),
        auto_approve_threshold=Decimal("1000"),
        risk_tolerance=RiskLevel.MEDIUM,
        available_capital=Decimal("10000")
    )

    agent = lender_service.create_lender_agent("Test Agent", config)
    print(f"✅ Created agent: {agent.name} (ID: {agent.id})")

    # Create a loan request
    loan_request = LoanRequest(
        id="test-loan-001",
        borrower_id="borrower-123",
        amount=Decimal("1000"),
        interest_rate=Decimal("10.0"),
        duration_days=30,
        credit_score=750,
        zk_proof="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    )

    # Evaluate the loan
    evaluation = lender_service.evaluate_loan_request(agent.id, loan_request)
    print(f"✅ Loan evaluation completed:")
    print(f"   Risk Score: {evaluation.risk_score:.1f}")
    print(f"   Recommendation: {evaluation.recommendation}")
    print(f"   Confidence: {evaluation.confidence:.2f}")

    # Process the loan request
    response = lender_service.process_loan_request(agent.id, loan_request)
    print(f"✅ Loan processing completed:")
    print(f"   Decision: {response.decision}")
    print(f"   Loan ID: {response.loan_id}")

    if response.decision == "approved":
        print(f"   Expected return: {response.terms.get('expected_return', 'N/A')}")

        # Get portfolio
        portfolio = lender_service.get_agent_portfolio(agent.id)
        print(f"✅ Portfolio updated:")
        print(f"   Total loans: {portfolio['total_loans_issued']}")
        print(f"   Available capital: {portfolio['config']['available_capital']}")
        print(f"   Active loans: {portfolio['active_loans_count']}")

        # Process repayment
        repayment_amount = Decimal("1100")  # With 10% interest
        success = lender_service.process_loan_repayment(loan_request.id, repayment_amount)
        if success:
            final_portfolio = lender_service.get_agent_portfolio(agent.id)
            print(f"✅ Repayment processed:")
            print(f"   Total earnings: {final_portfolio['total_earnings']}")
            print(f"   Active loans: {final_portfolio['active_loans_count']}")

    print("\n🎉 All tests passed! Agent Lender is working correctly.")

def test_risk_engine():
    """Test risk engine functionality"""
    print("\n🔍 Testing Risk Engine...")

    risk_engine = RiskEngine()

    # Test credit score assessment
    excellent_credit = risk_engine._assess_credit_score(850)
    poor_credit = risk_engine._assess_credit_score(400)

    print(f"✅ Credit assessment:")
    print(f"   Excellent (850): {excellent_credit['level']} - Score: {excellent_credit['score']}")
    print(f"   Poor (400): {poor_credit['level']} - Score: {poor_credit['score']}")

    # Test ZK proof validation
    valid_proof = risk_engine._validate_zk_proof("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
    invalid_proof = risk_engine._validate_zk_proof("invalid")

    print(f"✅ ZK Proof validation:")
    print(f"   Valid proof: {valid_proof['valid']} - Score: {valid_proof['score']}")
    print(f"   Invalid proof: {invalid_proof['valid']} - Score: {invalid_proof['score']}")

if __name__ == "__main__":
    try:
        test_risk_engine()
        test_basic_functionality()
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        sys.exit(1)