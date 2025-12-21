import os
from typing import Dict, Any
from dotenv import load_dotenv
import json

from crewai import Agent, Task, Crew, Process
from groq import Groq

# Load environment variables
load_dotenv()

class LenderCrewAI:
    """
    Simplified CrewAI-powered intelligent lending analysis system with direct Groq integration
    """

    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")

        # Initialize Groq client directly
        self.groq_client = Groq(api_key=self.groq_api_key)
        self.model = "llama-3.3-70b-versatile"

        # For CrewAI, we'll use a simple approach without custom LLM
        print("🚀 Initializing CrewAI with Groq backend...")

    def analyze_loan_request(self, loan_data: Dict[str, Any], lender_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a loan request using a multi-step AI analysis (simulating CrewAI workflow)
        """
        try:
            print("🔍 Step 1: Risk Analysis...")
            risk_analysis = self._perform_risk_analysis(loan_data, lender_config)

            print("🏦 Step 2: Credit Evaluation...")
            credit_evaluation = self._perform_credit_evaluation(loan_data, lender_config, risk_analysis)

            print("⚖️  Step 3: Final Decision...")
            final_decision = self._make_final_decision(loan_data, lender_config, risk_analysis, credit_evaluation)

            return self._combine_results(risk_analysis, credit_evaluation, final_decision)

        except Exception as e:
            print(f"❌ AI analysis failed: {e}")
            return self._fallback_analysis(loan_data, lender_config)

    def _perform_risk_analysis(self, loan_data: Dict[str, Any], lender_config: Dict[str, Any]) -> Dict[str, Any]:
        """Step 1: Risk Analysis Agent"""
        prompt = f"""
You are a Senior Risk Analyst with 15+ years of experience in DeFi lending protocols.

Analyze this loan application for financial risks:

LOAN DETAILS:
- Amount: ${loan_data.get('amount', 0):,}
- Interest Rate: {loan_data.get('interest_rate', 0)}%
- Duration: {loan_data.get('duration_days', 0)} days
- Credit Score: {loan_data.get('credit_score', 0)}/1000 (ERC-8004)
- ZK Proof: {loan_data.get('zk_proof', 'N/A')[:20]}...
- Purpose: {loan_data.get('purpose', 'Not specified')}

LENDER CONFIG:
- Max Loan: ${lender_config.get('max_loan_amount', 0):,}
- Min Credit Score: {lender_config.get('min_credit_score', 0)}/1000
- Risk Tolerance: {lender_config.get('risk_tolerance', 'medium')}
- Available Capital: ${lender_config.get('available_capital', 0):,}

Provide your risk assessment as JSON:
{{
  "risk_score": 35.5,
  "risk_level": "moderate",
  "key_risks": ["duration longer than average", "credit score acceptable"],
  "zk_proof_valid": true,
  "capital_ratio": 0.2,
  "recommendations": ["Monitor repayment closely", "Set appropriate terms"]
}}
"""

        response = self.groq_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=500
        )

        try:
            content = response.choices[0].message.content
            print(f"🔍 Risk Analysis Response: {content[:200]}...")

            # Extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                return json.loads(json_str)
            else:
                # Try to parse the entire content as JSON
                return json.loads(content)
        except Exception as e:
            print(f"⚠️  Risk analysis JSON parse failed: {e}")
            print(f"Raw content: {response.choices[0].message.content[:300]}...")
            return {"risk_score": 50.0, "risk_level": "moderate", "key_risks": [], "zk_proof_valid": True}

    def _perform_credit_evaluation(self, loan_data: Dict[str, Any], lender_config: Dict[str, Any], risk_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Step 2: Credit Evaluation Agent"""
        prompt = f"""
You are a Credit Evaluation Specialist for decentralized finance.

Based on the risk analysis, evaluate this borrower's creditworthiness:

PREVIOUS RISK ANALYSIS:
- Risk Score: {risk_analysis.get('risk_score', 50)}
- Risk Level: {risk_analysis.get('risk_level', 'moderate')}
- Key Risks: {', '.join(risk_analysis.get('key_risks', []))}

BORROWER PROFILE:
- Credit Score: {loan_data.get('credit_score', 0)}/1000
- Loan Amount: ${loan_data.get('amount', 0):,}
- Interest Rate: {loan_data.get('interest_rate', 0)}%

Provide your credit evaluation as JSON:
{{
  "credit_grade": "B+",
  "repayment_probability": 85.5,
  "recommended_interest_rate": 12.0,
  "loan_amount_adjustment": 0,
  "evaluation_notes": ["Strong credit history", "Reasonable loan terms"]
}}
"""

        response = self.groq_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=400
        )

        try:
            content = response.choices[0].message.content
            print(f"🏦 Credit Evaluation Response: {content[:200]}...")

            # Extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                return json.loads(json_str)
            else:
                # Try to parse the entire content as JSON
                return json.loads(content)
        except Exception as e:
            print(f"⚠️  Credit evaluation JSON parse failed: {e}")
            print(f"Raw content: {response.choices[0].message.content[:300]}...")
            return {"credit_grade": "B", "repayment_probability": 75.0, "recommended_interest_rate": loan_data.get('interest_rate', 12)}

    def _make_final_decision(self, loan_data: Dict[str, Any], lender_config: Dict[str, Any], risk_analysis: Dict[str, Any], credit_evaluation: Dict[str, Any]) -> Dict[str, Any]:
        """Step 3: Final Decision Agent"""
        prompt = f"""
You are an Autonomous Lending Decision Maker for the Hivee protocol.

Make the final lending decision based on all analysis:

RISK ANALYSIS:
- Risk Score: {risk_analysis.get('risk_score', 50)}
- Risk Level: {risk_analysis.get('risk_level', 'moderate')}

CREDIT EVALUATION:
- Credit Grade: {credit_evaluation.get('credit_grade', 'B')}
- Repayment Probability: {credit_evaluation.get('repayment_probability', 75)}%

LOAN DETAILS:
- Amount: ${loan_data.get('amount', 0):,}
- Interest Rate: {loan_data.get('interest_rate', 0)}%
- Borrower Credit Score: {loan_data.get('credit_score', 0)}

LENDER SETTINGS:
- Risk Tolerance: {lender_config.get('risk_tolerance', 'medium')}
- Available Capital: ${lender_config.get('available_capital', 0):,}

Make your final decision as JSON:
{{
  "decision": "APPROVE",
  "confidence": 87.5,
  "reasoning": "Strong credit score, reasonable risk level, good repayment probability",
  "expected_return": 1120.0,
  "key_factors": ["Excellent credit score", "Moderate risk", "Good terms"]
}}

Decision options: APPROVE, REJECT, MANUAL_REVIEW
"""

        response = self.groq_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=400
        )

        try:
            content = response.choices[0].message.content
            print(f"⚖️  Final Decision Response: {content[:200]}...")

            # Extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                return json.loads(json_str)
            else:
                # Try to parse the entire content as JSON
                return json.loads(content)
        except Exception as e:
            print(f"⚠️  Final decision JSON parse failed: {e}")
            print(f"Raw content: {response.choices[0].message.content[:300]}...")
            return {"decision": "MANUAL_REVIEW", "confidence": 50.0, "reasoning": "Analysis completed but needs review"}

    def _combine_results(self, risk_analysis: Dict[str, Any], credit_evaluation: Dict[str, Any], final_decision: Dict[str, Any]) -> Dict[str, Any]:
        """Combine all analysis results"""
        decision = final_decision.get("decision", "MANUAL_REVIEW").lower()
        if decision == "approve":
            recommendation = "approve"
        elif decision == "reject":
            recommendation = "reject"
        else:
            recommendation = "manual_review"

        return {
            "recommendation": recommendation,
            "confidence": final_decision.get("confidence", 50.0) / 100.0,  # Convert to 0-1 scale
            "risk_score": risk_analysis.get("risk_score", 50.0),
            "analysis": {
                "full_analysis": {
                    "risk_analysis": risk_analysis,
                    "credit_evaluation": credit_evaluation,
                    "final_decision": final_decision
                },
                "ai_powered": True,
                "llm_model": self.model,
                "crew_agents": ["risk_analyst", "credit_evaluator", "loan_decisioner"],
                "evaluation_method": "crewai_workflow_groq",
                "key_factors": final_decision.get("key_factors", []),
                "reasoning": final_decision.get("reasoning", "")
            },
            "reasoning": final_decision.get("reasoning", "Multi-agent AI analysis completed")
        }

    def _fallback_analysis(self, loan_data: Dict[str, Any], lender_config: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback analysis if AI fails"""
        credit_score = loan_data.get("credit_score", 500)
        amount = loan_data.get("amount", 0)
        max_amount = lender_config.get("max_loan_amount", 5000)

        # Simple rule-based fallback
        if credit_score >= 750 and amount <= max_amount * 0.5:
            recommendation = "approve"
            risk_score = 25.0
            confidence = 0.8
        elif credit_score >= 600 and amount <= max_amount:
            recommendation = "manual_review"
            risk_score = 45.0
            confidence = 0.6
        else:
            recommendation = "reject"
            risk_score = 75.0
            confidence = 0.9

        return {
            "recommendation": recommendation,
            "confidence": confidence,
            "risk_score": risk_score,
            "analysis": {
                "ai_powered": False,
                "llm_model": "fallback_rules",
                "evaluation_method": "fallback_crewai_simulation",
                "note": "AI workflow failed, using fallback analysis"
            },
            "reasoning": f"Fallback analysis: Credit {credit_score}, Amount ${amount:,}"
        }