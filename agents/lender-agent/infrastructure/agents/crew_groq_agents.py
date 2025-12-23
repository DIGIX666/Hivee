import os
from typing import Dict, Any
from dotenv import load_dotenv

from crewai import Agent, Task, Crew, Process
from langchain.llms.base import LLM
from groq import Groq

# Load environment variables
load_dotenv()

class GroqLLM(LLM):
    """Custom LLM wrapper for Groq to work with CrewAI"""

    def __init__(self, model_name: str = "llama-3.3-70b-versatile"):
        super().__init__()
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")

        self.client = Groq(api_key=self.groq_api_key)
        self.model_name = model_name

    def _call(self, prompt: str, stop=None, **kwargs) -> str:
        """Call Groq API"""
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error calling Groq API: {str(e)}"

    @property
    def _llm_type(self) -> str:
        return "groq"

class LenderCrewAI:
    """
    CrewAI-powered intelligent lending analysis system with Groq LLM
    """

    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")

        # Initialize Groq LLM for CrewAI
        self.llm = GroqLLM()

        # Initialize agents
        self.risk_analyst = self._create_risk_analyst()
        self.credit_evaluator = self._create_credit_evaluator()
        self.loan_decisioner = self._create_loan_decisioner()

        # Initialize crew
        self.crew = Crew(
            agents=[self.risk_analyst, self.credit_evaluator, self.loan_decisioner],
            process=Process.sequential,
            verbose=True
        )

    def _create_risk_analyst(self) -> Agent:
        """Create the risk analysis agent"""
        return Agent(
            role="Senior Risk Analyst",
            goal="Analyze loan applications for financial risks and provide comprehensive risk assessments",
            backstory="""You are a seasoned financial risk analyst with 15+ years of experience in
            DeFi lending protocols. You specialize in evaluating creditworthiness using advanced
            metrics including ERC-8004 scores, Zero-Knowledge proofs, and behavioral patterns.
            You're known for your ability to spot potential defaults while maintaining competitive
            approval rates.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm,
            max_iter=3,
        )

    def _create_credit_evaluator(self) -> Agent:
        """Create the credit evaluation agent"""
        return Agent(
            role="Credit Evaluation Specialist",
            goal="Evaluate borrower creditworthiness and determine optimal loan terms",
            backstory="""You are an expert in credit evaluation for decentralized finance.
            You understand the nuances of on-chain credit scoring, reputation systems, and
            Zero-Knowledge proof validation. Your recommendations balance risk management
            with profit maximization. You have deep knowledge of DeFi lending protocols
            and autonomous agent behavior patterns.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm,
            max_iter=3,
        )

    def _create_loan_decisioner(self) -> Agent:
        """Create the loan decision agent"""
        return Agent(
            role="Autonomous Lending Decision Maker",
            goal="Make final lending decisions based on risk analysis and credit evaluation",
            backstory="""You are an AI-powered lending decision maker for the Hivee protocol.
            You synthesize complex risk assessments and credit evaluations to make optimal
            lending decisions. You consider market conditions, portfolio balance, liquidity
            requirements, and risk tolerance. Your decisions directly impact the lender's
            profitability and risk exposure.""",
            verbose=True,
            allow_delegation=False,
            llm=self.llm,
            max_iter=2,
        )

    def analyze_loan_request(self, loan_data: Dict[str, Any], lender_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a loan request using CrewAI agents with Groq LLM
        """

        # Create tasks for each agent
        risk_analysis_task = Task(
            description=f"""
            Analyze the following loan request for financial risks:

            Loan Details:
            - Amount: {loan_data.get('amount', 'N/A'):,} CAPX
            - Interest Rate: {loan_data.get('interest_rate', 'N/A')}%
            - Duration: {loan_data.get('duration_days', 'N/A')} days
            - Borrower Credit Score: {loan_data.get('credit_score', 'N/A')}/1000 (ERC-8004)
            - ZK Proof: {loan_data.get('zk_proof', 'N/A')[:20]}...
            - Purpose: {loan_data.get('purpose', 'Not specified')}

            Lender Configuration:
            - Max Loan Amount: {lender_config.get('max_loan_amount', 'N/A'):,} CAPX
            - Min Credit Score: {lender_config.get('min_credit_score', 'N/A')}/1000
            - Risk Tolerance: {lender_config.get('risk_tolerance', 'N/A')}
            - Available Capital: {lender_config.get('available_capital', 'N/A'):,} CAPX

            Provide a comprehensive risk analysis including:
            1. Credit risk assessment (0-100 scale, lower is better)
            2. Market risk factors
            3. Liquidity risk considerations
            4. ZK proof validation status
            5. Key risk indicators and red flags
            6. Risk mitigation recommendations

            Format your response with clear risk scores and reasoning.
            """,
            agent=self.risk_analyst,
            expected_output="Structured risk analysis with numerical scores and detailed explanations"
        )

        credit_evaluation_task = Task(
            description=f"""
            Based on the risk analysis, evaluate the borrower's creditworthiness and recommend loan terms:

            Consider:
            1. ERC-8004 credit score interpretation
            2. Loan-to-income ratio implications
            3. Interest rate competitiveness
            4. Collateral requirements (if applicable)
            5. Repayment probability
            6. Optimal loan terms adjustments

            Provide:
            1. Credit grade (A, B, C, D, F)
            2. Recommended interest rate adjustment (if any)
            3. Suggested loan amount (if different from requested)
            4. Repayment probability (0-100%)
            5. Credit evaluation reasoning
            """,
            agent=self.credit_evaluator,
            expected_output="Credit evaluation with specific recommendations and probability scores"
        )

        decision_task = Task(
            description=f"""
            Make the final lending decision based on the risk analysis and credit evaluation.

            Provide a clear decision with:
            1. Final recommendation: APPROVE, REJECT, or MANUAL_REVIEW
            2. Confidence level (0-100%)
            3. Final loan terms (if approved)
            4. Key decision factors
            5. Expected return on investment
            6. Risk-adjusted return calculation

            Consider the lender's current portfolio balance and risk exposure.
            Ensure the decision aligns with the configured risk tolerance.
            """,
            agent=self.loan_decisioner,
            expected_output="Final lending decision with confidence scores and detailed reasoning"
        )

        # Execute the crew
        tasks = [risk_analysis_task, credit_evaluation_task, decision_task]
        result = self.crew.kickoff(tasks=tasks)

        return self._parse_crew_result(result)

    def _parse_crew_result(self, crew_result) -> Dict[str, Any]:
        """
        Parse CrewAI result into structured format
        """
        try:
            # Extract key information from the crew result
            result_text = str(crew_result)

            # Parse the final recommendation
            recommendation = "manual_review"  # Default
            confidence = 0.5  # Default

            if "APPROVE" in result_text.upper():
                recommendation = "approve"
            elif "REJECT" in result_text.upper():
                recommendation = "reject"

            # Try to extract confidence level
            import re
            confidence_match = re.search(r'confidence.*?(\d+(?:\.\d+)?)', result_text.lower())
            if confidence_match:
                confidence = float(confidence_match.group(1))
                if confidence > 1:  # If percentage
                    confidence = confidence / 100

            return {
                "recommendation": recommendation,
                "confidence": confidence,
                "analysis": {
                    "full_analysis": result_text,
                    "ai_powered": True,
                    "llm_model": "groq/llama-3.3-70b-versatile",
                    "crew_agents": ["risk_analyst", "credit_evaluator", "loan_decisioner"],
                    "evaluation_method": "crewai_with_groq"
                },
                "risk_score": self._extract_risk_score(result_text),
                "reasoning": self._extract_reasoning(result_text)
            }

        except Exception as e:
            # Fallback if parsing fails
            return {
                "recommendation": "manual_review",
                "confidence": 0.3,
                "analysis": {
                    "full_analysis": str(crew_result),
                    "ai_powered": True,
                    "error": str(e),
                    "fallback_mode": True,
                    "evaluation_method": "crewai_with_groq_fallback"
                },
                "risk_score": 50.0,
                "reasoning": "AI analysis completed but requires manual review"
            }

    def _extract_risk_score(self, text: str) -> float:
        """Extract risk score from analysis text"""
        import re

        # Look for risk score patterns
        patterns = [
            r'risk.*?score.*?(\d+(?:\.\d+)?)',
            r'score.*?(\d+(?:\.\d+)?)',
            r'risk.*?(\d+(?:\.\d+)?)'
        ]

        for pattern in patterns:
            match = re.search(pattern, text.lower())
            if match:
                score = float(match.group(1))
                return min(max(score, 0), 100)  # Ensure 0-100 range

        return 50.0  # Default moderate risk

    def _extract_reasoning(self, text: str) -> str:
        """Extract key reasoning from analysis"""
        lines = text.split('\n')
        reasoning_lines = []

        keywords = ['because', 'due to', 'given', 'considering', 'based on', 'recommendation']

        for line in lines:
            if any(keyword in line.lower() for keyword in keywords):
                reasoning_lines.append(line.strip())

        if reasoning_lines:
            return ' '.join(reasoning_lines[:3])  # First 3 relevant lines

        return text[:200] + "..." if len(text) > 200 else text