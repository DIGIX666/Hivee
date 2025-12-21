"""
Test script for WalletConnect integration with Lender Agent
"""

import asyncio
import requests
import json
from decimal import Decimal
from datetime import datetime

BASE_URL = "http://localhost:8000"

async def test_wallet_integration():
    """Test complete WalletConnect integration flow"""

    print("🚀 Testing Hivee Lender Agent WalletConnect Integration")
    print("=" * 60)

    # Step 1: Create a lender agent
    print("\n1️⃣ Creating a lender agent...")
    lender_config = {
        "max_loan_amount": 10000.0,
        "min_credit_score": 600,
        "max_interest_rate": 15.0,
        "base_interest_rate": 5.0,
        "credit_fee_percentage": 1.5,
        "fixed_processing_fee": 25.0,
        "auto_approve_threshold": 1000.0,
        "risk_tolerance": "medium",
        "available_capital": 5000.0
    }

    response = requests.post(
        f"{BASE_URL}/lender/create",
        params={"name": "TestLenderAgent"},
        json=lender_config
    )

    if response.status_code != 200:
        print(f"❌ Failed to create lender agent: {response.text}")
        return

    agent = response.json()
    agent_id = agent["id"]
    print(f"✅ Created lender agent: {agent_id}")

    # Step 2: Initiate wallet connection
    print("\n2️⃣ Initiating wallet connection...")
    response = requests.post(
        f"{BASE_URL}/wallet/connect",
        params={"agent_id": agent_id}
    )

    if response.status_code != 200:
        print(f"❌ Failed to initiate wallet connection: {response.text}")
        return

    connection_info = response.json()
    session_id = connection_info["session_id"]
    print(f"✅ Wallet connection initiated")
    print(f"   Session ID: {session_id}")
    print(f"   Connection URI: {connection_info['connection_uri']}")

    # Step 3: Simulate wallet connection confirmation
    print("\n3️⃣ Confirming wallet connection...")
    test_wallet_address = "0x742d35Cc6677C4532A8d7Aa9e7F8b7e4b8c8e8d8"
    chain_id = 1337  # CapX chain ID

    response = requests.post(
        f"{BASE_URL}/wallet/confirm",
        params={
            "session_id": session_id,
            "wallet_address": test_wallet_address,
            "chain_id": chain_id
        }
    )

    if response.status_code != 200:
        print(f"❌ Failed to confirm wallet connection: {response.text}")
        return

    connection_result = response.json()
    print(f"✅ Wallet connected successfully")
    print(f"   Address: {connection_result['wallet_address']}")
    print(f"   Balance: {connection_result['balance']} ETH")

    # Step 4: Get agent wallet info
    print("\n4️⃣ Getting agent wallet information...")
    response = requests.get(f"{BASE_URL}/wallet/{agent_id}")

    if response.status_code != 200:
        print(f"❌ Failed to get wallet info: {response.text}")
        return

    wallet_info = response.json()
    print(f"✅ Retrieved wallet information")
    print(f"   Connected wallets: {len(wallet_info['connected_wallets'])}")
    print(f"   Total balance: {wallet_info['total_balance']} ETH")

    # Step 5: Test deposit
    print("\n5️⃣ Testing deposit...")
    deposit_request = {
        "agent_id": agent_id,
        "amount": 500.0,
        "wallet_address": test_wallet_address,
        "transaction_hash": "0x1234567890abcdef"
    }

    response = requests.post(
        f"{BASE_URL}/funds/deposit",
        json=deposit_request
    )

    if response.status_code != 200:
        print(f"❌ Failed to process deposit: {response.text}")
        return

    deposit_transaction = response.json()
    deposit_id = deposit_transaction["id"]
    print(f"✅ Deposit processed")
    print(f"   Transaction ID: {deposit_id}")
    print(f"   Amount: {deposit_transaction['amount']} ETH")
    print(f"   Status: {deposit_transaction['status']}")

    # Step 6: Wait for transaction confirmation
    print("\n6️⃣ Waiting for transaction confirmation...")
    await asyncio.sleep(6)  # Wait for simulated confirmation

    response = requests.get(f"{BASE_URL}/transaction/{deposit_id}")
    if response.status_code == 200:
        updated_transaction = response.json()
        print(f"✅ Transaction status updated: {updated_transaction['status']}")
        if updated_transaction.get('transaction_hash'):
            print(f"   Transaction hash: {updated_transaction['transaction_hash']}")

    # Step 7: Check updated balance
    print("\n7️⃣ Checking updated balance...")
    response = requests.get(f"{BASE_URL}/wallet/{agent_id}/balance")

    if response.status_code != 200:
        print(f"❌ Failed to get balance: {response.text}")
        return

    balance_info = response.json()
    print(f"✅ Updated balance information")
    print(f"   Wallet balance: {balance_info['wallet_balance']} ETH")
    print(f"   Available capital: {balance_info['available_capital']} ETH")
    print(f"   Connected wallets: {balance_info['connected_wallets']}")

    # Step 8: Test withdrawal
    print("\n8️⃣ Testing withdrawal...")
    withdrawal_request = {
        "agent_id": agent_id,
        "amount": 100.0,
        "destination_address": test_wallet_address
    }

    response = requests.post(
        f"{BASE_URL}/funds/withdraw",
        json=withdrawal_request
    )

    if response.status_code != 200:
        print(f"❌ Failed to process withdrawal: {response.text}")
    else:
        withdrawal_transaction = response.json()
        print(f"✅ Withdrawal processed")
        print(f"   Transaction ID: {withdrawal_transaction['id']}")
        print(f"   Amount: {withdrawal_transaction['amount']} ETH")

    # Step 9: Get transaction history
    print("\n9️⃣ Getting transaction history...")
    response = requests.get(f"{BASE_URL}/funds/{agent_id}/transactions")

    if response.status_code != 200:
        print(f"❌ Failed to get transaction history: {response.text}")
        return

    transaction_history = response.json()
    print(f"✅ Retrieved transaction history")
    print(f"   Total transactions: {transaction_history['total_count']}")

    for i, tx in enumerate(transaction_history['transactions'][:3], 1):
        print(f"   Transaction {i}:")
        print(f"     Type: {tx['transaction_type']}")
        print(f"     Amount: {tx['amount']} ETH")
        print(f"     Status: {tx['status']}")

    # Step 10: Disconnect wallet
    print("\n🔟 Disconnecting wallet...")
    response = requests.post(
        f"{BASE_URL}/wallet/disconnect",
        params={
            "agent_id": agent_id,
            "wallet_address": test_wallet_address
        }
    )

    if response.status_code != 200:
        print(f"❌ Failed to disconnect wallet: {response.text}")
    else:
        print(f"✅ Wallet disconnected successfully")

    print("\n" + "=" * 60)
    print("✅ WalletConnect integration test completed successfully!")
    print("🎉 All features working correctly")

def main():
    """Main test function"""
    print("Starting WalletConnect integration test...")
    print("Make sure the Lender Agent API is running on localhost:8000")

    try:
        # Check if API is running
        response = requests.get(f"{BASE_URL}/")
        if response.status_code != 200:
            print("❌ API is not accessible. Please start the agent with:")
            print("   cd agents/lender-agent && python scripts/start_api.py")
            return

        # Run the test
        asyncio.run(test_wallet_integration())

    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to API. Please start the agent with:")
        print("   cd agents/lender-agent && python scripts/start_api.py")
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")

if __name__ == "__main__":
    main()