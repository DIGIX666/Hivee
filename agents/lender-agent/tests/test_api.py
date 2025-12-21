import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
import sys
import os

# Add project root to the path
project_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, project_root)

from app.main import app
from core.models.models import RiskLevel

client = TestClient(app)

class TestAPI:

    def test_root_endpoint(self):
        """Test the root health check endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Hivee Lender Agent"
        assert data["status"] == "active"
        assert "active_agents" in data

    def test_create_lender_agent(self):
        """Test creating a lender agent via API"""
        config_data = {
            "max_loan_amount": 5000,
            "min_credit_score": 600,
            "max_interest_rate": 15.0,
            "auto_approve_threshold": 1000,
            "risk_tolerance": "medium",
            "available_capital": 10000
        }

        response = client.post("/lender/create?name=Test Agent", json=config_data)
        assert response.status_code == 200

        data = response.json()
        assert data["name"] == "Test Agent"
        assert data["config"]["max_loan_amount"] == 5000
        assert data["total_loans_issued"] == 0
        assert data["is_active"] == True

        return data["id"]  # Return agent ID for other tests

    def test_get_lender_agent(self):
        """Test getting a lender agent via API"""
        # First create an agent
        agent_id = self.test_create_lender_agent()

        # Get the agent
        response = client.get(f"/lender/{agent_id}")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == agent_id
        assert data["name"] == "Test Agent"

    def test_get_nonexistent_lender_agent(self):
        """Test getting a non-existent lender agent"""
        response = client.get("/lender/non-existent-id")
        assert response.status_code == 404

    def test_configure_lender_agent(self):
        """Test updating lender agent configuration"""
        # First create an agent
        agent_id = self.test_create_lender_agent()

        new_config = {
            "max_loan_amount": 7500,
            "min_credit_score": 700,
            "max_interest_rate": 20.0,
            "auto_approve_threshold": 1500,
            "risk_tolerance": "high",
            "available_capital": 15000
        }

        response = client.put(f"/lender/{agent_id}/configure", json=new_config)
        assert response.status_code == 200

        # Verify the configuration was updated
        response = client.get(f"/lender/{agent_id}")
        data = response.json()
        assert data["config"]["max_loan_amount"] == 7500
        assert data["config"]["min_credit_score"] == 700

    def test_evaluate_loan_request(self):
        """Test evaluating a loan request"""
        # First create an agent
        agent_id = self.test_create_lender_agent()

        loan_request = {
            "id": "test-loan-001",
            "borrower_id": "borrower-123",
            "amount": 1000,
            "interest_rate": 10.0,
            "duration_days": 30,
            "credit_score": 750,
            "zk_proof": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        }

        response = client.post(f"/lender/{agent_id}/evaluate", json=loan_request)
        assert response.status_code == 200

        data = response.json()
        assert data["loan_id"] == "test-loan-001"
        assert "risk_score" in data
        assert "recommendation" in data
        assert "confidence" in data
        assert "analysis" in data

    def test_process_loan_request_approve(self):
        """Test processing a loan request that should be approved"""
        # First create an agent
        agent_id = self.test_create_lender_agent()

        loan_request = {
            "id": "test-loan-002",
            "borrower_id": "borrower-124",
            "amount": 1000,
            "interest_rate": 10.0,
            "duration_days": 30,
            "credit_score": 750,
            "zk_proof": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        }

        response = client.post(f"/lender/{agent_id}/loans/request", json=loan_request)
        assert response.status_code == 200

        data = response.json()
        assert data["loan_id"] == "test-loan-002"
        assert data["decision"] == "approved"
        assert "terms" in data

        return agent_id, "test-loan-002"

    def test_process_loan_request_insufficient_capital(self):
        """Test processing a loan request with insufficient capital"""
        # Create an agent with limited capital
        config_data = {
            "max_loan_amount": 5000,
            "min_credit_score": 600,
            "max_interest_rate": 15.0,
            "auto_approve_threshold": 1000,
            "risk_tolerance": "medium",
            "available_capital": 500  # Less than loan amount
        }

        response = client.post("/lender/create?name=Limited Agent", json=config_data)
        agent_id = response.json()["id"]

        loan_request = {
            "id": "test-loan-003",
            "borrower_id": "borrower-125",
            "amount": 1000,
            "interest_rate": 10.0,
            "duration_days": 30,
            "credit_score": 750,
            "zk_proof": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        }

        response = client.post(f"/lender/{agent_id}/loans/request", json=loan_request)
        assert response.status_code == 200

        data = response.json()
        assert data["decision"] == "rejected"
        assert "Insufficient capital" in data["reason"]

    def test_get_agent_portfolio(self):
        """Test getting agent portfolio"""
        # First process a loan
        agent_id, loan_id = self.test_process_loan_request_approve()

        response = client.get(f"/lender/{agent_id}/portfolio")
        assert response.status_code == 200

        data = response.json()
        assert data["agent_id"] == agent_id
        assert data["total_loans_issued"] == 1
        assert data["active_loans_count"] == 1
        assert len(data["active_loans"]) == 1
        assert data["active_loans"][0]["loan_id"] == loan_id

    def test_get_agent_balance(self):
        """Test getting agent balance"""
        # First process a loan
        agent_id, loan_id = self.test_process_loan_request_approve()

        response = client.get(f"/lender/{agent_id}/balance")
        assert response.status_code == 200

        data = response.json()
        assert data["agent_id"] == agent_id
        assert data["available_capital"] == 9000  # 10000 - 1000 loan
        assert data["total_amount_lent"] == 1000
        assert data["total_earnings"] == 0  # No repayments yet
        assert data["active_loans_count"] == 1

    def test_get_matching_criteria(self):
        """Test getting matching criteria"""
        agent_id = self.test_create_lender_agent()

        response = client.get(f"/lender/{agent_id}/criteria")
        assert response.status_code == 200

        data = response.json()
        assert data["agent_id"] == agent_id
        assert data["max_loan_amount"] == 5000
        assert data["min_credit_score"] == 600
        assert data["available_capital"] == 10000
        assert data["is_active"] == True

    def test_process_loan_repayment(self):
        """Test processing loan repayment"""
        # First process a loan
        agent_id, loan_id = self.test_process_loan_request_approve()

        # Get initial balance
        balance_response = client.get(f"/lender/{agent_id}/balance")
        initial_capital = balance_response.json()["available_capital"]

        # Process repayment with interest
        repayment_amount = 1100  # 1000 + 100 interest

        response = client.post(f"/loans/{loan_id}/repay?amount={repayment_amount}")
        assert response.status_code == 200

        data = response.json()
        assert "success" in data["message"]

        # Verify balance updated
        balance_response = client.get(f"/lender/{agent_id}/balance")
        updated_balance = balance_response.json()
        assert updated_balance["available_capital"] == initial_capital + repayment_amount
        assert updated_balance["total_earnings"] == 100
        assert updated_balance["active_loans_count"] == 0

    def test_process_nonexistent_loan_repayment(self):
        """Test processing repayment for non-existent loan"""
        response = client.post("/loans/non-existent-loan/repay?amount=1000")
        assert response.status_code == 404

    def test_list_lender_agents(self):
        """Test listing all lender agents"""
        response = client.get("/lenders")
        assert response.status_code == 200

        data = response.json()
        assert "agents" in data
        assert "total_count" in data
        assert isinstance(data["agents"], list)

    def test_get_system_stats(self):
        """Test getting system-wide statistics"""
        response = client.get("/stats")
        assert response.status_code == 200

        data = response.json()
        required_fields = [
            "total_agents", "active_agents", "total_loans_processed",
            "total_available_capital", "total_amount_lent", "total_earnings"
        ]

        for field in required_fields:
            assert field in data
            assert isinstance(data[field], (int, float))

    def test_loan_request_validation(self):
        """Test loan request validation"""
        agent_id = self.test_create_lender_agent()

        # Invalid loan request (negative amount)
        invalid_loan = {
            "id": "invalid-loan-001",
            "borrower_id": "borrower-999",
            "amount": -1000,  # Invalid
            "interest_rate": 10.0,
            "duration_days": 30,
            "credit_score": 750,
            "zk_proof": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        }

        response = client.post(f"/lender/{agent_id}/loans/request", json=invalid_loan)
        assert response.status_code == 422  # Validation error

    def test_lender_config_validation(self):
        """Test lender configuration validation"""
        # Invalid configuration (negative amount)
        invalid_config = {
            "max_loan_amount": -5000,  # Invalid
            "min_credit_score": 600,
            "max_interest_rate": 15.0,
            "auto_approve_threshold": 1000,
            "risk_tolerance": "medium",
            "available_capital": 10000
        }

        response = client.post("/lender/create?name=Invalid Agent", json=invalid_config)
        assert response.status_code == 422  # Validation error

    def test_high_risk_loan_rejection(self):
        """Test that high-risk loans are properly rejected"""
        agent_id = self.test_create_lender_agent()

        high_risk_loan = {
            "id": "high-risk-loan-001",
            "borrower_id": "risky-borrower",
            "amount": 4000,  # Large amount
            "interest_rate": 25.0,  # High rate
            "duration_days": 180,  # Long duration
            "credit_score": 400,  # Poor credit
            "zk_proof": "invalid_proof"  # Invalid proof
        }

        response = client.post(f"/lender/{agent_id}/loans/request", json=high_risk_loan)
        assert response.status_code == 200

        data = response.json()
        assert data["decision"] == "rejected"
        assert "Risk assessment failed" in data["reason"]