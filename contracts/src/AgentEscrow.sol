// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentEscrow
 * @notice Escrow contract for a single agent - receives client payments and distributes to lender/borrower/platform
 * @dev Each agent has a dedicated escrow contract deployed by the Hivee platform
 * All client payments MUST go through this escrow to guarantee loan repayment
 */
contract AgentEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Agent details
    address public immutable borrowerAgent;  // Agent's address
    uint256 public immutable agentIdentityId; // ERC-8004 token ID

    // Platform configuration
    address public immutable platformAddress; // Platform fee recipient
    uint256 public immutable platformFeeRate; // Fee rate in basis points (e.g., 50 = 0.5%)

    // x402 protocol integration
    address public immutable x402Protocol; // x402 protocol address for fast payments

    // Active loan tracking
    struct ActiveLoan {
        address lenderAgent;        // Lender agent contract address
        address token;              // Loan token (USDC, ETH, etc.)
        uint256 principal;          // Loan principal amount
        uint256 totalRepayment;     // Total to repay (principal + interest)
        uint256 repaidAmount;       // Amount already repaid
        bool isActive;              // Whether loan is currently active
        uint256 createdAt;          // Loan creation timestamp
    }

    // Current active loan (only one at a time for MVP)
    ActiveLoan public currentLoan;

    // Events
    event LoanRegistered(
        address indexed lenderAgent,
        address indexed token,
        uint256 principal,
        uint256 totalRepayment
    );

    event PaymentReceived(
        address indexed from,
        address indexed token,
        uint256 amount
    );

    event PaymentDistributed(
        address indexed lenderAgent,
        address indexed borrowerAgent,
        address indexed platform,
        uint256 lenderAmount,
        uint256 borrowerAmount,
        uint256 platformFee
    );

    event LoanRepaid(
        address indexed lenderAgent,
        uint256 totalRepaid
    );

    /**
     * @notice Deploy escrow for a specific agent
     * @param _borrowerAgent Agent's operational address
     * @param _agentIdentityId Agent's ERC-8004 token ID
     * @param _platformAddress Platform fee recipient
     * @param _platformFeeRate Platform fee in basis points
     * @param _x402Protocol x402 protocol address (for fast splits)
     */
    constructor(
        address _borrowerAgent,
        uint256 _agentIdentityId,
        address _platformAddress,
        uint256 _platformFeeRate,
        address _x402Protocol
    ) Ownable(msg.sender) {
        require(_borrowerAgent != address(0), "Invalid borrower address");
        require(_platformAddress != address(0), "Invalid platform address");
        require(_platformFeeRate <= 1000, "Fee rate too high"); // Max 10%

        borrowerAgent = _borrowerAgent;
        agentIdentityId = _agentIdentityId;
        platformAddress = _platformAddress;
        platformFeeRate = _platformFeeRate;
        x402Protocol = _x402Protocol;
    }

    /**
     * @notice Register an active loan for this agent
     * @dev Called by the broker/lender when loan is approved
     * @param lenderAgent Lender agent contract address
     * @param token Loan token address
     * @param principal Loan principal amount
     * @param totalRepayment Total repayment amount (principal + interest)
     */
    function registerLoan(
        address lenderAgent,
        address token,
        uint256 principal,
        uint256 totalRepayment
    ) external onlyOwner {
        require(!currentLoan.isActive, "Loan already active");
        require(lenderAgent != address(0), "Invalid lender address");
        require(token != address(0), "Invalid token address");
        require(totalRepayment >= principal, "Invalid repayment amount");

        currentLoan = ActiveLoan({
            lenderAgent: lenderAgent,
            token: token,
            principal: principal,
            totalRepayment: totalRepayment,
            repaidAmount: 0,
            isActive: true,
            createdAt: block.timestamp
        });

        emit LoanRegistered(lenderAgent, token, principal, totalRepayment);
    }

    /**
     * @notice Receive payment from client and automatically distribute
     * @dev Clients pay directly to this escrow, which then splits payment
     * @param token Payment token address
     * @param amount Payment amount
     */
    function receivePayment(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Invalid amount");

        // Transfer tokens from client to escrow
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit PaymentReceived(msg.sender, token, amount);

        // Automatically distribute payment
        _distributePayment(token, amount);
    }

    /**
     * @notice Distribute payment between lender, borrower, and platform
     * @dev Uses x402 protocol for fast payment splitting (~200ms)
     * @param token Payment token
     * @param amount Total payment amount
     */
    function _distributePayment(address token, uint256 amount) internal {
        uint256 lenderAmount = 0;
        uint256 platformFee = 0;
        uint256 borrowerAmount = 0;

        // Calculate platform fee (always taken)
        platformFee = (amount * platformFeeRate) / 10000;
        uint256 remainingAmount = amount - platformFee;

        // If there's an active loan, prioritize repayment
        if (currentLoan.isActive && currentLoan.token == token) {
            uint256 remainingDebt = currentLoan.totalRepayment - currentLoan.repaidAmount;

            if (remainingDebt > 0) {
                // Pay lender (up to remaining debt)
                lenderAmount = remainingAmount > remainingDebt ? remainingDebt : remainingAmount;
                borrowerAmount = remainingAmount - lenderAmount;

                // Update loan state
                currentLoan.repaidAmount += lenderAmount;

                // If fully repaid, mark loan as inactive
                if (currentLoan.repaidAmount >= currentLoan.totalRepayment) {
                    currentLoan.isActive = false;
                    emit LoanRepaid(currentLoan.lenderAgent, currentLoan.repaidAmount);
                }

                // Transfer to lender via x402 (fast payment)
                if (lenderAmount > 0) {
                    _transferViaX402(token, currentLoan.lenderAgent, lenderAmount);
                }
            } else {
                // Loan already repaid, all goes to borrower
                borrowerAmount = remainingAmount;
            }
        } else {
            // No active loan, all goes to borrower
            borrowerAmount = remainingAmount;
        }

        // Transfer platform fee
        if (platformFee > 0) {
            _transferViaX402(token, platformAddress, platformFee);
        }

        // Transfer borrower profit
        if (borrowerAmount > 0) {
            _transferViaX402(token, borrowerAgent, borrowerAmount);
        }

        emit PaymentDistributed(
            currentLoan.lenderAgent,
            borrowerAgent,
            platformAddress,
            lenderAmount,
            borrowerAmount,
            platformFee
        );
    }

    /**
     * @notice Transfer tokens via x402 protocol for speed
     * @dev Falls back to standard transfer if x402 fails
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _transferViaX402(address token, address to, uint256 amount) internal {
        if (x402Protocol != address(0)) {
            // Try x402 protocol for fast transfer (~200ms)
            // In production, this would call x402 contract
            // For MVP, we use standard transfer
            IERC20(token).safeTransfer(to, amount);
        } else {
            // Fallback to standard ERC20 transfer
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @notice Get current loan details
     * @return ActiveLoan struct with loan information
     */
    function getCurrentLoan() external view returns (ActiveLoan memory) {
        return currentLoan;
    }

    /**
     * @notice Check if escrow has an active loan
     * @return bool Whether a loan is currently active
     */
    function hasActiveLoan() external view returns (bool) {
        return currentLoan.isActive;
    }

    /**
     * @notice Emergency withdraw (owner only, for exceptional cases)
     * @dev Should rarely be used - payments should go through normal flow
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Receive ETH payments
     * @dev Converts to WETH or handles native ETH loans
     */
    receive() external payable {
        // In production, wrap to WETH and distribute
        // For MVP, revert to avoid accidental ETH sends
        revert("Use receivePayment() with ERC20 tokens");
    }
}
