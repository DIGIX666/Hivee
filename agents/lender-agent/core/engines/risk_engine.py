from decimal import Decimal
from typing import Dict, Any
from core.models.models import LoanRequest, LoanEvaluation, RiskLevel

class RiskEngine:
    """
    Risk assessment engine for evaluating loan requests
    """

    def __init__(self):
        self.risk_weights = {
            "credit_score": 0.4,
            "loan_amount": 0.2,
            "interest_rate": 0.15,
            "duration": 0.1,
            "zk_proof_validity": 0.15
        }

    def evaluate_loan(self, loan_request: LoanRequest, lender_config) -> LoanEvaluation:
        """
        Evaluate a loan request and return risk assessment
        """
        analysis = {}

        # Credit score analysis
        credit_risk = self._assess_credit_score(loan_request.credit_score)
        analysis["credit_assessment"] = credit_risk

        # Amount risk analysis
        amount_risk = self._assess_loan_amount(loan_request.amount, lender_config.max_loan_amount)
        analysis["amount_assessment"] = amount_risk

        # Interest rate analysis
        interest_risk = self._assess_interest_rate(loan_request.interest_rate, lender_config.max_interest_rate)
        analysis["interest_assessment"] = interest_risk

        # Duration analysis
        duration_risk = self._assess_duration(loan_request.duration_days)
        analysis["duration_assessment"] = duration_risk

        # ZK proof validation
        zk_validity = self._validate_zk_proof(loan_request.zk_proof)
        analysis["zk_proof_assessment"] = zk_validity

        # Calculate overall risk score
        risk_score = (
            credit_risk["score"] * self.risk_weights["credit_score"] +
            amount_risk["score"] * self.risk_weights["loan_amount"] +
            interest_risk["score"] * self.risk_weights["interest_rate"] +
            duration_risk["score"] * self.risk_weights["duration"] +
            zk_validity["score"] * self.risk_weights["zk_proof_validity"]
        )

        # Determine recommendation
        recommendation = self._get_recommendation(risk_score, lender_config)
        confidence = self._calculate_confidence(analysis)

        return LoanEvaluation(
            loan_id=loan_request.id,
            risk_score=risk_score,
            recommendation=recommendation,
            confidence=confidence,
            analysis=analysis
        )

    def _assess_credit_score(self, credit_score: int) -> Dict[str, Any]:
        """Assess credit score risk (0-100, lower is better)"""
        if credit_score >= 800:
            score = 10
            level = "excellent"
        elif credit_score >= 700:
            score = 25
            level = "good"
        elif credit_score >= 600:
            score = 50
            level = "fair"
        elif credit_score >= 500:
            score = 75
            level = "poor"
        else:
            score = 95
            level = "very_poor"

        return {
            "score": score,
            "level": level,
            "raw_score": credit_score
        }

    def _assess_loan_amount(self, amount: Decimal, max_amount: Decimal) -> Dict[str, Any]:
        """Assess loan amount risk"""
        ratio = float(amount / max_amount)

        if ratio <= 0.25:
            score = 10
            level = "low"
        elif ratio <= 0.5:
            score = 25
            level = "moderate"
        elif ratio <= 0.75:
            score = 50
            level = "high"
        elif ratio <= 1.0:
            score = 75
            level = "very_high"
        else:
            score = 100
            level = "exceeds_limit"

        return {
            "score": score,
            "level": level,
            "ratio": ratio,
            "amount": float(amount)
        }

    def _assess_interest_rate(self, rate: Decimal, max_rate: Decimal) -> Dict[str, Any]:
        """Assess interest rate attractiveness"""
        if rate > max_rate:
            score = 100
            level = "unacceptable"
        elif rate >= max_rate * Decimal("0.8"):
            score = 20
            level = "acceptable"
        elif rate >= max_rate * Decimal("0.6"):
            score = 15
            level = "good"
        else:
            score = 10
            level = "excellent"

        return {
            "score": score,
            "level": level,
            "rate": float(rate)
        }

    def _assess_duration(self, duration_days: int) -> Dict[str, Any]:
        """Assess loan duration risk"""
        if duration_days <= 30:
            score = 10
            level = "short_term"
        elif duration_days <= 90:
            score = 20
            level = "medium_term"
        elif duration_days <= 180:
            score = 35
            level = "long_term"
        else:
            score = 50
            level = "very_long_term"

        return {
            "score": score,
            "level": level,
            "duration": duration_days
        }

    def _validate_zk_proof(self, zk_proof: str) -> Dict[str, Any]:
        """Validate Zero-Knowledge proof (simplified for POC)"""
        # In a real implementation, this would verify the actual ZK proof
        if len(zk_proof) >= 64 and zk_proof.startswith("0x"):
            score = 10
            valid = True
            level = "valid"
        else:
            score = 100
            valid = False
            level = "invalid"

        return {
            "score": score,
            "valid": valid,
            "level": level,
            "proof_hash": zk_proof[:16] + "..." if len(zk_proof) > 16 else zk_proof
        }

    def _get_recommendation(self, risk_score: float, lender_config) -> str:
        """Get loan recommendation based on risk score and lender config"""
        if risk_score <= 20:
            return "approve"
        elif risk_score <= 40 and lender_config.risk_tolerance in [RiskLevel.MEDIUM, RiskLevel.HIGH]:
            return "approve"
        elif risk_score <= 60 and lender_config.risk_tolerance == RiskLevel.HIGH:
            return "approve"
        elif risk_score <= 80:
            return "manual_review"
        else:
            return "reject"

    def _calculate_confidence(self, analysis: Dict[str, Any]) -> float:
        """Calculate confidence score based on analysis quality"""
        confidence_factors = []

        # Credit score confidence
        if analysis["credit_assessment"]["level"] in ["excellent", "good"]:
            confidence_factors.append(0.9)
        elif analysis["credit_assessment"]["level"] == "fair":
            confidence_factors.append(0.7)
        else:
            confidence_factors.append(0.5)

        # ZK proof confidence
        if analysis["zk_proof_assessment"]["valid"]:
            confidence_factors.append(0.9)
        else:
            confidence_factors.append(0.1)

        # Amount confidence
        if analysis["amount_assessment"]["level"] in ["low", "moderate"]:
            confidence_factors.append(0.8)
        else:
            confidence_factors.append(0.6)

        return sum(confidence_factors) / len(confidence_factors)