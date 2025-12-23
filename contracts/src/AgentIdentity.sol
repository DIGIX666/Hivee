// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentIdentity
 * @notice ERC-8004 compliant on-chain identity and reputation system for AI agents
 * @dev Each agent receives a unique NFT (tokenId) representing their identity
 * Credit scores are calculated based on loan repayment history
 */
contract AgentIdentity is ERC721, Ownable {
    uint256 private _nextTokenId;

    struct AgentProfile {
        address owner;                    // Agent owner's wallet
        address agentAddress;             // Agent's operational address
        uint256 creditScore;              // 0-1000 credit score
        uint256 totalLoans;               // Total number of loans taken
        uint256 successfulRepayments;     // Number of successful repayments
        uint256 failedRepayments;         // Number of failed/defaulted repayments
        uint256 createdAt;                // Timestamp of identity creation
        bool isActive;                    // Whether agent is active
    }

    // Mapping from tokenId to agent profile
    mapping(uint256 => AgentProfile) public agents;

    // Mapping from agent address to tokenId
    mapping(address => uint256) public agentToTokenId;

    // Authorized contracts that can update credit scores (escrow contracts, broker)
    mapping(address => bool) public authorizedUpdaters;

    // Events
    event AgentRegistered(uint256 indexed tokenId, address indexed owner, address indexed agentAddress);
    event CreditScoreUpdated(uint256 indexed tokenId, uint256 newScore, uint256 oldScore);
    event LoanRecorded(uint256 indexed tokenId, bool successful);
    event AgentStatusChanged(uint256 indexed tokenId, bool isActive);
    event UpdaterAuthorized(address indexed updater, bool authorized);

    constructor() ERC721("Hivee Identity", "HVI") Ownable(msg.sender) {
        _nextTokenId = 1; // Start from 1 (0 is invalid)
    }

    /**
     * @notice Register a new agent and mint an ERC-8004 identity NFT
     * @param agentAddress The operational address of the agent
     * @return tokenId The unique identifier for this agent
     */
    function registerAgent(address agentAddress) external returns (uint256) {
        require(agentAddress != address(0), "Invalid agent address");
        require(agentToTokenId[agentAddress] == 0, "Agent already registered");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        agents[tokenId] = AgentProfile({
            owner: msg.sender,
            agentAddress: agentAddress,
            creditScore: 500, // Initial neutral score
            totalLoans: 0,
            successfulRepayments: 0,
            failedRepayments: 0,
            createdAt: block.timestamp,
            isActive: true
        });

        agentToTokenId[agentAddress] = tokenId;

        emit AgentRegistered(tokenId, msg.sender, agentAddress);

        return tokenId;
    }

    /**
     * @notice Update agent's credit score based on loan repayment
     * @dev Can only be called by authorized contracts (escrow, broker)
     * @param tokenId Agent's identity token ID
     * @param successful Whether the loan was successfully repaid
     */
    function recordLoanOutcome(uint256 tokenId, bool successful) external {
        require(authorizedUpdaters[msg.sender], "Not authorized");
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");

        AgentProfile storage agent = agents[tokenId];
        agent.totalLoans++;

        uint256 oldScore = agent.creditScore;

        if (successful) {
            agent.successfulRepayments++;
            // Increase score (max 1000)
            agent.creditScore = _min(1000, agent.creditScore + 20);
        } else {
            agent.failedRepayments++;
            // Decrease score significantly (min 0)
            agent.creditScore = agent.creditScore > 50 ? agent.creditScore - 50 : 0;
        }

        emit CreditScoreUpdated(tokenId, agent.creditScore, oldScore);
        emit LoanRecorded(tokenId, successful);
    }

    /**
     * @notice Get agent's credit score
     * @param tokenId Agent's identity token ID
     * @return creditScore Current credit score (0-1000)
     */
    function getCreditScore(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        return agents[tokenId].creditScore;
    }

    /**
     * @notice Get complete agent profile
     * @param tokenId Agent's identity token ID
     * @return AgentProfile struct with all agent data
     */
    function getAgentProfile(uint256 tokenId) external view returns (AgentProfile memory) {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        return agents[tokenId];
    }

    /**
     * @notice Get tokenId from agent address
     * @param agentAddress Agent's operational address
     * @return tokenId The agent's identity token ID
     */
    function getTokenIdByAddress(address agentAddress) external view returns (uint256) {
        uint256 tokenId = agentToTokenId[agentAddress];
        require(tokenId != 0, "Agent not found");
        return tokenId;
    }

    /**
     * @notice Authorize/deauthorize a contract to update credit scores
     * @dev Only owner can authorize (typically escrow factory, broker)
     * @param updater Address to authorize
     * @param authorized Whether to authorize or revoke
     */
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        authorizedUpdaters[updater] = authorized;
        emit UpdaterAuthorized(updater, authorized);
    }

    /**
     * @notice Pause/unpause an agent
     * @dev Only the agent owner can change status
     * @param tokenId Agent's identity token ID
     * @param active New active status
     */
    function setAgentStatus(uint256 tokenId, bool active) external {
        require(ownerOf(tokenId) == msg.sender, "Not agent owner");
        agents[tokenId].isActive = active;
        emit AgentStatusChanged(tokenId, active);
    }

    /**
     * @dev Internal helper to get minimum of two numbers
     */
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @dev Override to prevent transfers (identity is soulbound)
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("AgentIdentity: Identity tokens are soulbound");
        }
        return super._update(to, tokenId, auth);
    }
}
