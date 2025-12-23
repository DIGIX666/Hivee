#!/usr/bin/env python3
"""
Simple API starter for the Hivee Lender Agent
"""

import sys
import os

# Add project root to path
project_root = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, project_root)

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("🚀 Starting Hivee Lender Agent API...")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("🏥 Health Check: http://localhost:8000/")
    print("🛑 Press Ctrl+C to stop")

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")