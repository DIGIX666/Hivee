#!/usr/bin/env python3
"""
Direct test of Groq API functionality
"""

import os
from dotenv import load_dotenv

load_dotenv()

def test_groq_direct():
    """Test Groq API directly"""
    print("🧪 Testing Groq API directly...")

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_api_key_here":
        print("⚠️  Please set a valid GROQ_API_KEY in .env file")
        print("💡 Get your free API key from: https://groq.com/")
        return False

    try:
        from groq import Groq

        # Initialize client with minimal parameters
        client = Groq(api_key=api_key)
        print("✅ Groq client initialized successfully")

        # Test a simple API call
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": "Analyze this loan: $1000, 750 credit score, 30 days. Should approve? Respond in JSON with recommendation, risk_score, and reasoning."
                }
            ],
            temperature=0.1,
            max_tokens=300
        )

        print("✅ Groq API call successful!")
        print(f"🤖 Response: {response.choices[0].message.content[:200]}...")
        return True

    except Exception as e:
        print(f"❌ Groq API test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_groq_direct()
    if success:
        print("\n✅ Groq integration is ready!")
    else:
        print("\n❌ Groq integration needs attention")
        print("\n📋 Troubleshooting checklist:")
        print("1. ✅ Install groq: pip install groq==0.11.0")
        print("2. ⭐ Get API key: https://groq.com/")
        print("3. 📝 Set in .env: GROQ_API_KEY=your_actual_key_here")
        print("4. 🔄 Restart the test script")