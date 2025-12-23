"""
Wallet and funds management service for Hivee Lender Agents
"""

from typing import Dict, List, Optional
from decimal import Decimal
from datetime import datetime, timedelta
import uuid
import asyncio
import json
import logging
from web3 import Web3
from eth_account import Account

from core.models.models import (
    WalletInfo, WalletConnectionStatus, FundTransaction, TransactionType,
    TransactionStatus, DepositRequest, WithdrawalRequest, WalletConnectSession,
    AgentWalletInfo
)

logger = logging.getLogger(__name__)

class WalletService:
    """Service for managing wallet connections and fund transactions"""

    def __init__(self, rpc_endpoint: str = "https://chiliz-spicy-rpc.publicnode.com"):
        self.rpc_endpoint = rpc_endpoint
        self.web3 = Web3(Web3.HTTPProvider(rpc_endpoint))

        # In-memory storage (in production, use proper database)
        self.agent_wallets: Dict[str, AgentWalletInfo] = {}
        self.wallet_sessions: Dict[str, WalletConnectSession] = {}
        self.transactions: Dict[str, FundTransaction] = {}

        # WalletConnect configuration
        self.walletconnect_project_id = "your-project-id"  # Replace with actual project ID

        logger.info(f"WalletService initialized with RPC: {rpc_endpoint}")

    async def initiate_wallet_connection(self, agent_id: str) -> Dict:
        """
        Initiate a WalletConnect session for an agent
        Returns connection URI and session details
        """
        try:
            session_id = str(uuid.uuid4())

            # Generate WalletConnect URI (simplified for demo)
            # In production, use actual WalletConnect library
            connection_uri = f"wc:{session_id}@1?bridge=https://bridge.walletconnect.org&key=wallet-connect-key"

            # Store session info
            session = WalletConnectSession(
                session_id=session_id,
                agent_id=agent_id,
                wallet_address="",  # Will be filled when user connects
                chain_id=88882,  # Chiliz Spicy chain ID
                connected_at=datetime.now(),
                expires_at=datetime.now() + timedelta(minutes=5),
                is_active=True
            )

            self.wallet_sessions[session_id] = session

            return {
                "session_id": session_id,
                "connection_uri": connection_uri,
                "expires_at": session.expires_at.isoformat(),
                "status": "waiting_for_connection"
            }

        except Exception as e:
            logger.error(f"Failed to initiate wallet connection for agent {agent_id}: {str(e)}")
            raise Exception(f"Connection initiation failed: {str(e)}")

    async def confirm_wallet_connection(self, session_id: str, wallet_address: str, chain_id: int = 88882) -> Dict:
        """
        Confirm wallet connection and update agent's wallet info
        """
        try:
            if session_id not in self.wallet_sessions:
                raise ValueError("Invalid or expired session")

            session = self.wallet_sessions[session_id]

            # Validate wallet address
            if not Web3.is_address(wallet_address):
                raise ValueError("Invalid wallet address")

            # Update session
            session.wallet_address = wallet_address
            session.chain_id = chain_id
            session.connected_at = datetime.now()

            # Create or update agent wallet info
            if session.agent_id not in self.agent_wallets:
                self.agent_wallets[session.agent_id] = AgentWalletInfo(agent_id=session.agent_id)

            # Get wallet balance
            balance = await self.get_wallet_balance(wallet_address)

            # Create wallet info
            wallet_info = WalletInfo(
                address=wallet_address,
                chain_id=chain_id,
                balance=balance,
                connected_at=datetime.now(),
                status=WalletConnectionStatus.CONNECTED
            )

            # Add to agent's connected wallets
            agent_wallet = self.agent_wallets[session.agent_id]

            # Remove existing wallet with same address if any
            agent_wallet.connected_wallets = [
                w for w in agent_wallet.connected_wallets
                if w.address.lower() != wallet_address.lower()
            ]

            agent_wallet.connected_wallets.append(wallet_info)
            agent_wallet.total_balance = sum(w.balance for w in agent_wallet.connected_wallets)

            return {
                "agent_id": session.agent_id,
                "wallet_address": wallet_address,
                "balance": float(balance),
                "chain_id": chain_id,
                "status": "connected"
            }

        except Exception as e:
            logger.error(f"Failed to confirm wallet connection for session {session_id}: {str(e)}")
            raise Exception(f"Connection confirmation failed: {str(e)}")

    async def get_wallet_balance(self, wallet_address: str) -> Decimal:
        """Get wallet balance from blockchain"""
        try:
            if not self.web3.is_connected():
                logger.warning("Web3 not connected, returning mock balance")
                return Decimal("1000.0")  # Mock balance for demo

            balance_wei = self.web3.eth.get_balance(wallet_address)
            balance_eth = self.web3.from_wei(balance_wei, 'ether')
            return Decimal(str(balance_eth))

        except Exception as e:
            logger.error(f"Failed to get balance for {wallet_address}: {str(e)}")
            return Decimal("0")

    async def process_deposit(self, deposit_request: DepositRequest) -> FundTransaction:
        """Process a deposit from user's wallet to agent"""
        try:
            transaction_id = str(uuid.uuid4())

            # Create transaction record
            transaction = FundTransaction(
                id=transaction_id,
                agent_id=deposit_request.agent_id,
                transaction_type=TransactionType.DEPOSIT,
                amount=deposit_request.amount,
                wallet_address=deposit_request.wallet_address,
                transaction_hash=deposit_request.transaction_hash,
                status=TransactionStatus.PENDING,
                created_at=datetime.now(),
                metadata={
                    "deposit_type": "wallet_connect",
                    "source": "user_wallet"
                }
            )

            self.transactions[transaction_id] = transaction

            # Add to agent's pending deposits
            if deposit_request.agent_id not in self.agent_wallets:
                self.agent_wallets[deposit_request.agent_id] = AgentWalletInfo(agent_id=deposit_request.agent_id)

            self.agent_wallets[deposit_request.agent_id].pending_deposits.append(transaction)

            # In a real implementation, you would:
            # 1. Verify the transaction on-chain
            # 2. Wait for confirmations
            # 3. Update agent's available capital

            # For demo, auto-confirm after a delay
            asyncio.create_task(self._simulate_transaction_confirmation(transaction_id))

            return transaction

        except Exception as e:
            logger.error(f"Failed to process deposit: {str(e)}")
            raise Exception(f"Deposit processing failed: {str(e)}")

    async def process_withdrawal(self, withdrawal_request: WithdrawalRequest) -> FundTransaction:
        """Process a withdrawal from agent to user's wallet"""
        try:
            transaction_id = str(uuid.uuid4())

            # Check if agent has sufficient balance
            agent_wallet = self.agent_wallets.get(withdrawal_request.agent_id)
            if not agent_wallet or agent_wallet.total_balance < withdrawal_request.amount:
                raise ValueError("Insufficient balance for withdrawal")

            # Create transaction record
            transaction = FundTransaction(
                id=transaction_id,
                agent_id=withdrawal_request.agent_id,
                transaction_type=TransactionType.WITHDRAWAL,
                amount=withdrawal_request.amount,
                wallet_address=withdrawal_request.destination_address,
                status=TransactionStatus.PENDING,
                created_at=datetime.now(),
                metadata={
                    "withdrawal_type": "user_request",
                    "destination": withdrawal_request.destination_address
                }
            )

            self.transactions[transaction_id] = transaction

            # Add to agent's pending withdrawals
            agent_wallet.pending_withdrawals.append(transaction)

            # In a real implementation, you would:
            # 1. Create and sign the transaction
            # 2. Broadcast to the network
            # 3. Wait for confirmations

            # For demo, auto-confirm after a delay
            asyncio.create_task(self._simulate_transaction_confirmation(transaction_id))

            return transaction

        except Exception as e:
            logger.error(f"Failed to process withdrawal: {str(e)}")
            raise Exception(f"Withdrawal processing failed: {str(e)}")

    async def _simulate_transaction_confirmation(self, transaction_id: str):
        """Simulate transaction confirmation (for demo purposes)"""
        await asyncio.sleep(5)  # Simulate network confirmation time

        try:
            transaction = self.transactions.get(transaction_id)
            if not transaction:
                return

            # Update transaction status
            transaction.status = TransactionStatus.CONFIRMED
            transaction.confirmed_at = datetime.now()
            transaction.transaction_hash = f"0x{uuid.uuid4().hex}"

            # Update agent wallet
            agent_wallet = self.agent_wallets.get(transaction.agent_id)
            if agent_wallet:
                # Remove from pending and add to history
                if transaction.transaction_type == TransactionType.DEPOSIT:
                    agent_wallet.pending_deposits = [
                        t for t in agent_wallet.pending_deposits if t.id != transaction_id
                    ]
                    # Update total balance
                    agent_wallet.total_balance += transaction.amount

                elif transaction.transaction_type == TransactionType.WITHDRAWAL:
                    agent_wallet.pending_withdrawals = [
                        t for t in agent_wallet.pending_withdrawals if t.id != transaction_id
                    ]
                    # Update total balance
                    agent_wallet.total_balance -= transaction.amount

                agent_wallet.transaction_history.append(transaction)

            logger.info(f"Transaction {transaction_id} confirmed successfully")

        except Exception as e:
            logger.error(f"Failed to confirm transaction {transaction_id}: {str(e)}")
            # Update transaction status to failed
            if transaction_id in self.transactions:
                self.transactions[transaction_id].status = TransactionStatus.FAILED

    def get_agent_wallet_info(self, agent_id: str) -> Optional[AgentWalletInfo]:
        """Get wallet information for an agent"""
        return self.agent_wallets.get(agent_id)

    def get_transaction_status(self, transaction_id: str) -> Optional[FundTransaction]:
        """Get transaction status by ID"""
        return self.transactions.get(transaction_id)

    def disconnect_wallet(self, agent_id: str, wallet_address: str) -> bool:
        """Disconnect a wallet from an agent"""
        try:
            agent_wallet = self.agent_wallets.get(agent_id)
            if not agent_wallet:
                return False

            # Remove wallet from connected wallets
            initial_count = len(agent_wallet.connected_wallets)
            agent_wallet.connected_wallets = [
                w for w in agent_wallet.connected_wallets
                if w.address.lower() != wallet_address.lower()
            ]

            # Update total balance
            agent_wallet.total_balance = sum(w.balance for w in agent_wallet.connected_wallets)

            # Deactivate related sessions
            for session in self.wallet_sessions.values():
                if (session.agent_id == agent_id and
                    session.wallet_address.lower() == wallet_address.lower()):
                    session.is_active = False

            return len(agent_wallet.connected_wallets) < initial_count

        except Exception as e:
            logger.error(f"Failed to disconnect wallet {wallet_address} from agent {agent_id}: {str(e)}")
            return False

    def get_agent_transactions(self, agent_id: str, transaction_type: Optional[TransactionType] = None) -> List[FundTransaction]:
        """Get transaction history for an agent"""
        agent_wallet = self.agent_wallets.get(agent_id)
        if not agent_wallet:
            return []

        transactions = agent_wallet.transaction_history.copy()

        # Add pending transactions
        transactions.extend(agent_wallet.pending_deposits)
        transactions.extend(agent_wallet.pending_withdrawals)

        # Filter by transaction type if specified
        if transaction_type:
            transactions = [t for t in transactions if t.transaction_type == transaction_type]

        # Sort by creation date (newest first)
        transactions.sort(key=lambda t: t.created_at, reverse=True)

        return transactions