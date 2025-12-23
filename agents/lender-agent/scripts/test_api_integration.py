#!/usr/bin/env python3

"""
Test API integration for Hivee Lender Agent with CrewAI + Groq
"""

import os
import requests
import json
from decimal import Decimal
import time

# Set the API base URL
API_URL = "http://localhost:8000"

def test_health_check():
    """Test basic health check"""
    print("🏥 Testing Health Check...")
    response = requests.get(f"{API_URL}/")
    data = response.json()

    print(f"   Status: {data.get('status')}")
    print(f"   AI Enabled: {data.get('ai_enabled')}")
    print(f"   AI Model: {data.get('ai_model', 'N/A')}")
    print(f"   Evaluation Methods: {data.get('evaluation_methods', [])}")

    return data.get('ai_enabled', False)

def create_test_agent():
    """Create a test lender agent"""
    print("\n👤 Creating Test Lender Agent...")

    config_data = {
        "max_loan_amount": 10000,
        "min_credit_score": 400,
        "max_interest_rate": 25.0,
        "risk_tolerance": "medium",
        "available_capital": 50000,
        "auto_approve_threshold": 0.8
    }

    response = requests.post(
        f"{API_URL}/lender/create",
        params={"name": "AI Test Agent"},
        json=config_data
    )

    if response.status_code == 200:
        agent_data = response.json()
        agent_id = agent_data['id']
        print(f"   ✅ Agent created: {agent_id}")
        return agent_id
    else:
        print(f"   ❌ Failed to create agent: {response.text}")
        return None

def test_traditional_evaluation(agent_id):
    """Test traditional loan evaluation"""
    print("\n🔧 Testing Traditional Evaluation...")

    loan_data = {
        "id": "test_loan_traditional_001",
        "amount": 2500,
        "interest_rate": 15.0,
        "duration_days": 90,
        "credit_score": 750,
        "zk_proof": "zk_proof_data_example_12345",
        "purpose": "Business expansion",
        "borrower_id": "borrower_test_001"
    }

    response = requests.post(
        f"{API_URL}/lender/{agent_id}/evaluate",
        json=loan_data
    )

    if response.status_code == 200:
        result = response.json()
        print(f"   Recommendation: {result.get('recommendation')}")
        print(f"   Risk Score: {result.get('risk_score')}")
        print(f"   Confidence: {result.get('confidence'):.2f}")
        return result
    else:
        print(f"   ❌ Traditional evaluation failed: {response.text}")
        return None

def test_ai_evaluation(agent_id):
    """Test AI-powered loan evaluation"""
    print("\n🤖 Testing AI-Powered Evaluation...")

    loan_data = {
        "id": "test_loan_ai_001",
        "amount": 2500,
        "interest_rate": 15.0,
        "duration_days": 90,
        "credit_score": 750,
        "zk_proof": "zk_proof_data_example_12345",
        "purpose": "Business expansion",
        "borrower_id": "borrower_test_001"
    }

    try:
        response = requests.post(
            f"{API_URL}/lender/{agent_id}/evaluate/ai",
            json=loan_data,
            timeout=30  # AI evaluation might take longer
        )

        if response.status_code == 200:
            result = response.json()
            print(f"   Recommendation: {result.get('recommendation')}")
            print(f"   Risk Score: {result.get('risk_score')}")
            print(f"   Confidence: {result.get('confidence'):.2f}")

            # Check if it has AI-powered analysis
            analysis = result.get('analysis', {})
            if analysis.get('ai_powered'):
                print(f"   ✅ AI Analysis confirmed")
                print(f"   Model: {analysis.get('llm_model', 'N/A')}")
                print(f"   Method: {analysis.get('evaluation_method', 'N/A')}")

                # Show some reasoning
                reasoning = result.get('reasoning', '')
                if reasoning:
                    print(f"   Reasoning: {reasoning[:100]}...")

                return result
            else:
                print(f"   ⚠️  AI not used - fallback to traditional")
                return result
        else:
            print(f"   ❌ AI evaluation failed: {response.text}")
            return None

    except requests.exceptions.Timeout:
        print("   ⏰ AI evaluation timed out - this is normal for first run")
        return None
    except Exception as e:
        print(f"   ❌ AI evaluation error: {e}")
        return None

def process_loan_request(agent_id):
    """Test full loan processing"""
    print("\n📋 Testing Full Loan Processing...")

    loan_data = {
        "id": "test_loan_processing_001",
        "amount": 1800,
        "interest_rate": 12.0,
        "duration_days": 60,
        "credit_score": 820,
        "zk_proof": "zk_proof_excellent_credit_54321",
        "purpose": "Equipment purchase",
        "borrower_id": "borrower_excellent_001"
    }

    response = requests.post(
        f"{API_URL}/lender/{agent_id}/loans/request",
        json=loan_data
    )

    if response.status_code == 200:
        result = response.json()
        print(f"   Decision: {result.get('decision')}")
        print(f"   Loan ID: {result.get('loan_id')}")

        if result.get('terms'):
            terms = result['terms']
            print(f"   Amount: {terms.get('amount', 0):,.2f} CAPX")
            print(f"   Interest: {terms.get('interest_rate', 0)}%")
            print(f"   Expected Return: {terms.get('expected_return', 0):,.2f} CAPX")

        return result
    else:
        print(f"   ❌ Loan processing failed: {response.text}")
        return None

def main():
    print("🧪 Hivee Lender Agent API Integration Test")
    print("=" * 50)

    # Check if API is running
    try:
        ai_enabled = test_health_check()
    except Exception as e:
        print(f"❌ API not responding: {e}")
        print("💡 Make sure to start the API first: python start_api.py")
        return

    # Create test agent
    agent_id = create_test_agent()
    if not agent_id:
        return

    # Test traditional evaluation
    traditional_result = test_traditional_evaluation(agent_id)

    # Test AI evaluation if available
    if ai_enabled:
        ai_result = test_ai_evaluation(agent_id)

        # Compare results
        if traditional_result and ai_result:
            print("\n📊 Comparison:")
            print(f"   Traditional vs AI Risk Score: {traditional_result.get('risk_score', 0):.1f} vs {ai_result.get('risk_score', 0):.1f}")
            print(f"   Traditional vs AI Decision: {traditional_result.get('recommendation')} vs {ai_result.get('recommendation')}")
    else:
        print("\n⚠️  AI not enabled - testing traditional only")

    # Test full loan processing
    loan_result = process_loan_request(agent_id)

    print("\n✅ API Integration Tests Completed!")

    if ai_enabled and ai_result and ai_result.get('analysis', {}).get('ai_powered'):
        print("🎉 CrewAI + Groq multi-agent pipeline verified successfully!")
    else:
        print("⚠️  AI pipeline not fully verified - check API environment variables")

if __name__ == "__main__":
    main()