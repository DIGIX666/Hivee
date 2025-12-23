import os
import json
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

class GroqLLMAgent:
    """
    Simplified Groq LLM-powered lending analysis without CrewAI
    """

    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")

        self.client = Groq(api_key=self.groq_api_key)
        self.model = "llama-3.3-70b-versatile"

    def analyze_loan_request(self, loan_data: Dict[str, Any], lender_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a loan request using Groq LLM
        """
        try:
            # Construct the analysis prompt
            prompt = self._create_analysis_prompt(loan_data, lender_config)

            # Call Groq API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert financial risk analyst specializing in DeFi lending protocols. You analyze loan applications and provide comprehensive risk assessments. Always respond in JSON format."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for consistent analysis
                max_tokens=1000,
                response_format={"type": "json_object"}
            )

            # Parse the response
            analysis_text = response.choices[0].message.content
            analysis = json.loads(analysis_text)

            return self._parse_analysis(analysis, loan_data)

        except json.JSONDecodeError as e:
            print(f"⚠️  JSON parsing error: {e}")
            return self._fallback_analysis(loan_data, lender_config)
        except Exception as e:
            print(f"⚠️  Groq API error: {e}")
            return self._fallback_analysis(loan_data, lender_config)

    def _create_analysis_prompt(self, loan_data: Dict[str, Any], lender_config: Dict[str, Any]) -> str:
        """Create the analysis prompt for the LLM"""
        return f"""
Analyze this DeFi loan application and provide a comprehensive risk assessment:

**LOAN APPLICATION:**
- Amount: {loan_data.get('amount', 'N/A'):,} CAPX
- Interest Rate: {loan_data.get('interest_rate', 'N/A')}%
- Duration: {loan_data.get('duration_days', 'N/A')} days
- Borrower Credit Score: {loan_data.get('credit_score', 'N/A')}/1000 (ERC-8004)
- ZK Proof: {loan_data.get('zk_proof', 'N/A')[:20]}...
- Purpose: {loan_data.get('purpose', 'Not specified')}
- Borrower ID: {loan_data.get('borrower_id', 'N/A')}

**LENDER CONFIGURATION:**
- Max Loan Amount: {lender_config.get('max_loan_amount', 'N/A'):,} CAPX
- Min Credit Score Required: {lender_config.get('min_credit_score', 'N/A')}/1000
- Max Interest Rate: {lender_config.get('max_interest_rate', 'N/A')}%
- Risk Tolerance: {lender_config.get('risk_tolerance', 'N/A')}
- Available Capital: {lender_config.get('available_capital', 'N/A'):,} CAPX
- Auto-Approve Threshold: {lender_config.get('auto_approve_threshold', 'N/A'):,} CAPX

Please provide your analysis in the following JSON format:

{{
  "recommendation": "approve|reject|manual_review",
  "confidence": 0.85,
  "risk_score": 25.5,
  "key_factors": [
    "Credit score is excellent (750+)",
    "Interest rate is competitive at 12%",
    "Loan amount is within limits"
  ],
  "concerns": [
    "Duration is longer than typical",
    "ZK proof needs validation"
  ],
  "decision_reasoning": "Based on the strong credit score and reasonable terms...",
  "suggested_terms": {{
    "amount": 1500,
    "interest_rate": 12.0,
    "adjustments": "None needed"
  }}
}}

Consider the following in your analysis:
1. Credit score quality (excellent: 800+, good: 700-799, fair: 600-699, poor: <600)
2. Loan-to-capital ratio
3. Interest rate attractiveness for the lender
4. Duration risk (longer = higher risk)
5. ZK proof validity (starts with 0x and >64 chars = valid)
6. Alignment with lender's risk tolerance
7. Market conditions and DeFi lending best practices

Provide a thorough but concise analysis.
"""

    def _parse_analysis(self, analysis: Dict[str, Any], loan_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse and validate the LLM analysis"""
        try:
            recommendation = analysis.get("recommendation", "manual_review").lower()
            confidence = float(analysis.get("confidence", 0.5))
            risk_score = float(analysis.get("risk_score", 50.0))

            # Ensure values are in valid ranges
            confidence = max(0.0, min(1.0, confidence))
            risk_score = max(0.0, min(100.0, risk_score))

            return {
                "recommendation": recommendation,
                "confidence": confidence,
                "risk_score": risk_score,
                "analysis": {
                    "full_analysis": analysis,
                    "ai_powered": True,
                    "llm_model": self.model,
                    "key_factors": analysis.get("key_factors", []),
                    "concerns": analysis.get("concerns", []),
                    "decision_reasoning": analysis.get("decision_reasoning", ""),
                    "suggested_terms": analysis.get("suggested_terms", {}),
                    "evaluation_method": "groq_llm_direct"
                },
                "reasoning": analysis.get("decision_reasoning", "AI analysis completed")
            }

        except (ValueError, TypeError) as e:
            print(f"⚠️  Analysis parsing error: {e}")
            return self._fallback_analysis(loan_data, {})

    def _fallback_analysis(self, loan_data: Dict[str, Any], lender_config: Dict[str, Any]) -> Dict[str, Any]:
        """Provide a fallback analysis if AI fails"""
        credit_score = loan_data.get("credit_score", 500)
        amount = loan_data.get("amount", 0)
        max_amount = lender_config.get("max_loan_amount", 5000)

        # Simple rule-based fallback
        if credit_score >= 750 and amount <= max_amount * 0.5:
            recommendation = "approve"
            risk_score = 30.0
            confidence = 0.7
        elif credit_score >= 600 and amount <= max_amount:
            recommendation = "manual_review"
            risk_score = 50.0
            confidence = 0.6
        else:
            recommendation = "reject"
            risk_score = 80.0
            confidence = 0.8

        return {
            "recommendation": recommendation,
            "confidence": confidence,
            "risk_score": risk_score,
            "analysis": {
                "ai_powered": False,
                "llm_model": "fallback_rules",
                "evaluation_method": "fallback_rules",
                "note": "AI analysis failed, using fallback rules"
            },
            "reasoning": f"Fallback analysis based on credit score {credit_score} and amount {amount}"
        }