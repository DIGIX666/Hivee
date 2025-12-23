// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentIdentity.sol";
import "../src/AgentEscrow.sol";

/**
 * @title Deploy Script
 * @notice Deployment script for Hivee contracts on CapX Network
 * @dev Run with: forge script script/Deploy.s.sol --rpc-url capx --broadcast
 */
contract DeployScript is Script {
    function run() external {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy AgentIdentity (ERC-8004)
        console.log("\n=== Deploying AgentIdentity ===");
        AgentIdentity agentIdentity = new AgentIdentity();
        console.log("AgentIdentity deployed at:", address(agentIdentity));

        // 2. Deploy a sample AgentEscrow (for testing)
        console.log("\n=== Deploying Sample AgentEscrow ===");

        address sampleAgent = deployer; // For demo, use deployer as agent
        uint256 sampleAgentId = 999; // Sample ID
        address platformAddress = deployer; // Platform fee recipient
        uint256 platformFeeRate = 50; // 0.5% fee
        address x402Protocol = address(0); // No x402 in MVP

        AgentEscrow escrow = new AgentEscrow(
            sampleAgent,
            sampleAgentId,
            platformAddress,
            platformFeeRate,
            x402Protocol
        );
        console.log("Sample AgentEscrow deployed at:", address(escrow));

        vm.stopBroadcast();

        // Output deployment addresses for .env configuration
        console.log("\n=== Deployment Complete ===");
        console.log("Add these to your .env file:");
        console.log("AGENT_IDENTITY_ADDRESS=%s", address(agentIdentity));
        console.log("PLATFORM_ADDRESS=%s", platformAddress);
    }
}
