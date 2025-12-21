#!/usr/bin/env python3
"""
Test script for AI-powered lender agent functionality
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
project_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, project_root)

from decimal import Decimal
from core.models.models import LenderConfig, LoanRequest, RiskLevel

def test_without_groq():
    """Test the agent without Groq API key"""
    print("🧪 Testing Agent without GROQ_API_KEY...")

    # Temporarily unset GROQ_API_KEY
    original_key = os.environ.get('GROQ_API_KEY')
    if 'GROQ_API_KEY' in os.environ:
        del os.environ['GROQ_API_KEY']

    try:
        from core.services.lender_service import LenderService

        service = LenderService()
        print(f"✅ Service initialized - AI Enabled: {service.ai_enabled}")

        # Test basic functionality
        config = LenderConfig(
            max_loan_amount=Decimal("5000"),
            min_credit_score=600,
            max_interest_rate=Decimal("15.0"),
            auto_approve_threshold=Decimal("1000"),
            risk_tolerance=RiskLevel.MEDIUM,
            available_capital=Decimal("10000")
        )

        agent = service.create_lender_agent("Traditional Agent", config)
        print(f"✅ Agent created: {agent.name}")

        loan_request = LoanRequest(
            id="test-traditional-001",
            borrower_id="borrower-123",
            amount=Decimal("1000"),
            interest_rate=Decimal("10.0"),
            duration_days=30,
            credit_score=750,
            zk_proof="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        )

        response = service.process_loan_request(agent.id, loan_request)
        print(f"✅ Traditional evaluation: {response.decision}")

    finally:
        # Restore original key
        if original_key:
            os.environ['GROQ_API_KEY'] = original_key

def test_with_groq():
    """Test the agent with Groq API key"""
    groq_key = os.getenv('GROQ_API_KEY')

    if not groq_key:
        print("⚠️  GROQ_API_KEY not found - skipping AI tests")
        print("💡 To test AI functionality, add your Groq API key:")
        print("   export GROQ_API_KEY='your_groq_api_key_here'")
        return

    print("🤖 Testing Agent with GROQ_API_KEY...")

    try:
        from core.services.lender_service import LenderService

        service = LenderService()
        print(f"✅ Service initialized - AI Enabled: {service.ai_enabled}")

        if not service.ai_enabled:
            print("❌ AI not enabled despite API key present")
            return

        # Test AI functionality
        config = LenderConfig(
            max_loan_amount=Decimal("5000"),
            min_credit_score=600,
            max_interest_rate=Decimal("15.0"),
            auto_approve_threshold=Decimal("1000"),
            risk_tolerance=RiskLevel.MEDIUM,
            available_capital=Decimal("10000")
        )

        agent = service.create_lender_agent("AI Agent", config)
        print(f"✅ AI Agent created: {agent.name}")

        # Test different loan scenarios
        scenarios = [
            {
                "name": "Good Credit Loan",
                "loan": LoanRequest(
                    id="test-ai-good-001",
                    borrower_id="good-borrower",
                    amount=Decimal("1500"),
                    interest_rate=Decimal("12.0"),
                    duration_days=30,
                    credit_score=800,
                    zk_proof="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                    purpose="Business expansion loan for a growing tech startup"
                )
            },
            {
                "name": "Risky Credit Loan",
                "loan": LoanRequest(
                    id="test-ai-risky-001",
                    borrower_id="risky-borrower",
                    amount=Decimal("4500"),
                    interest_rate=Decimal("25.0"),
                    duration_days=180,
                    credit_score=450,
                    zk_proof="0x123456",
                    purpose="Urgent cash flow needs"
                )
            }
        ]

        for scenario in scenarios:
            print(f"\n🎯 Testing: {scenario['name']}")

            # AI Evaluation
            print("🤖 AI Evaluation:")
            ai_eval = service.evaluate_loan_request_ai(agent.id, scenario['loan'])
            print(f"   Recommendation: {ai_eval.recommendation}")
            print(f"   Risk Score: {ai_eval.risk_score:.1f}")
            print(f"   Confidence: {ai_eval.confidence:.2f}")

            # Traditional Evaluation (for comparison)
            print("🔧 Traditional Evaluation:")
            trad_eval = service.evaluate_loan_request(agent.id, scenario['loan'])
            print(f"   Recommendation: {trad_eval.recommendation}")
            print(f"   Risk Score: {trad_eval.risk_score:.1f}")
            print(f"   Confidence: {trad_eval.confidence:.2f}")

            print(f"📊 Comparison:")
            print(f"   AI vs Traditional Risk Score: {ai_eval.risk_score:.1f} vs {trad_eval.risk_score:.1f}")
            print(f"   AI vs Traditional Decision: {ai_eval.recommendation} vs {trad_eval.recommendation}")

        print("\n🎉 AI tests completed successfully!")

    except Exception as e:
        print(f"❌ AI test failed: {e}")
        import traceback
        traceback.print_exc()

def test_api_endpoints():
    """Test that the API can start with both configurations"""
    print("\n🌐 Testing API Startup...")

    try:
        from main import app
        print("✅ FastAPI app imported successfully")
        print("💡 You can test the API endpoints:")
        print("   - Health check: GET http://localhost:8000/")
        print("   - Traditional evaluation: POST http://localhost:8000/lender/{id}/evaluate")
        print("   - AI evaluation: POST http://localhost:8000/lender/{id}/evaluate/ai")
        print("   - API docs: http://localhost:8000/docs")

    except Exception as e:
        print(f"❌ API import failed: {e}")

if __name__ == "__main__":
    print("🧪 Hivee AI Lender Agent Test Suite\n")

    # Test without AI first
    test_without_groq()
    print("\n" + "="*50 + "\n")

    # Test with AI if available
    test_with_groq()
    print("\n" + "="*50 + "\n")

    # Test API
    test_api_endpoints()

    print("\n✅ All tests completed!")
    print("\n💡 Quick Setup Guide:")
    print("1. Get your free Groq API key: https://groq.com/")
    print("2. Copy .env.example to .env and add your key")
    print("3. Install dependencies: pip install -r requirements.txt")
    print("4. Start API: python start_api.py")
    print("5. Test AI: python test_ai.py")