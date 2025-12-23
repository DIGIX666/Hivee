from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from decimal import Decimal
from enum import Enum
from datetime import datetime

class LoanStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ACTIVE = "active"
    REPAID = "repaid"
    DEFAULTED = "defaulted"

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"

class LenderConfig(BaseModel):
    max_loan_amount: Decimal = Field(..., gt=0, description="Maximum loan amount per transaction")
    min_credit_score: int = Field(default=500, ge=0, le=1000, description="Minimum ERC-8004 credit score required")
    max_interest_rate: Decimal = Field(default=Decimal("20.0"), ge=0, le=100, description="Maximum acceptable interest rate (%)")
    base_interest_rate: Decimal = Field(default=Decimal("5.0"), ge=0, le=50, description="Base interest rate offered by this lender (%)")
    credit_fee_percentage: Decimal = Field(default=Decimal("1.0"), ge=0, le=10, description="Credit processing fee as percentage of loan amount (%)")
    fixed_processing_fee: Decimal = Field(default=Decimal("25.0"), ge=0, description="Fixed processing fee per loan")
    auto_approve_threshold: Decimal = Field(default=Decimal("1000"), ge=0, description="Auto-approve loans below this amount")
    risk_tolerance: RiskLevel = Field(default=RiskLevel.MEDIUM, description="Risk tolerance level")
    available_capital: Decimal = Field(..., gt=0, description="Available capital for lending")

class LoanRequest(BaseModel):
    id: str
    borrower_id: str
    amount: Decimal = Field(..., gt=0)
    interest_rate: Decimal = Field(..., ge=0, le=100)
    duration_days: int = Field(..., gt=0, le=365)
    credit_score: int = Field(..., ge=0, le=1000)
    zk_proof: str = Field(..., description="Zero-Knowledge proof hash")
    purpose: Optional[str] = None

class LoanResponse(BaseModel):
    loan_id: str
    decision: str  # "approved" or "rejected"
    reason: Optional[str] = None
    terms: Optional[dict] = None

class LenderAgent(BaseModel):
    id: str
    name: str
    config: LenderConfig
    total_loans_issued: int = 0
    total_amount_lent: Decimal = Decimal("0")
    total_earnings: Decimal = Decimal("0")
    active_loans: List[str] = []
    is_active: bool = True

class LoanEvaluation(BaseModel):
    loan_id: str
    risk_score: float = Field(..., ge=0, le=100)
    recommendation: str  # "approve", "reject", "manual_review"
    confidence: float = Field(..., ge=0, le=1)
    analysis: dict

# Wallet and Funds Management Models
class WalletConnectionStatus(str, Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"

class TransactionType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    LOAN_DISBURSEMENT = "loan_disbursement"
    LOAN_REPAYMENT = "loan_repayment"

class TransactionStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"

class WalletInfo(BaseModel):
    address: str
    chain_id: int
    balance: Decimal = Decimal("0")
    connected_at: Optional[datetime] = None
    status: WalletConnectionStatus = WalletConnectionStatus.DISCONNECTED

class FundTransaction(BaseModel):
    id: str
    agent_id: str
    transaction_type: TransactionType
    amount: Decimal = Field(..., gt=0)
    wallet_address: str
    transaction_hash: Optional[str] = None
    status: TransactionStatus = TransactionStatus.PENDING
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = {}

class DepositRequest(BaseModel):
    agent_id: str
    amount: Decimal = Field(..., gt=0, description="Amount to deposit")
    wallet_address: str = Field(..., description="Sender wallet address")
    transaction_hash: Optional[str] = Field(None, description="Transaction hash if already sent")

class WithdrawalRequest(BaseModel):
    agent_id: str
    amount: Decimal = Field(..., gt=0, description="Amount to withdraw")
    destination_address: str = Field(..., description="Destination wallet address")

class WalletConnectSession(BaseModel):
    session_id: str
    agent_id: str
    wallet_address: str
    chain_id: int
    connected_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool = True

class AgentWalletInfo(BaseModel):
    agent_id: str
    connected_wallets: List[WalletInfo] = []
    total_balance: Decimal = Decimal("0")
    pending_deposits: List[FundTransaction] = []
    pending_withdrawals: List[FundTransaction] = []
    transaction_history: List[FundTransaction] = []