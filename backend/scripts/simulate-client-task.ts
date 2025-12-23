import axios from 'axios';
import { logger } from '../src/utils/logger';

const API_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * Simulate a client requesting a task from an agent
 */
async function simulateClientTask() {
  try {
    console.log('🎬 Simulating client task request...\n');

    // 1. Get an active agent
    console.log('📋 Fetching active agents...');
    const agentsRes = await axios.get(`${API_URL}/api/agents?status=ACTIVE`);
    const agents = agentsRes.data.data.agents;

    if (agents.length === 0) {
      console.error('❌ No active agents found');
      console.log('💡 Please upload and deploy an agent first using the /api/agents endpoint');
      return;
    }

    const agent = agents[0];
    console.log(`✅ Selected agent: ${agent.name} (${agent.id})\n`);

    // 2. Generate random task data
    const taskAmount = Math.random() < 0.5
      ? parseFloat((Math.random() * 8 + 2).toFixed(2))  // 2-10 USDC (50% chance - below threshold)
      : parseFloat((Math.random() * 20 + 11).toFixed(2)); // 11-31 USDC (50% chance - above threshold)

    const clientId = `client_${Math.floor(Math.random() * 1000)}`;

    const taskDescriptions = [
      'AI research task: Analyze market trends for DeFi protocols',
      'Data processing: Extract insights from blockchain transactions',
      'ML model training: Predict token price movements',
      'Content generation: Create technical documentation',
      'Code analysis: Review smart contract security',
      'Data visualization: Create interactive dashboards',
      'API integration: Connect to multiple data sources',
      'Research report: Analyze DAO governance patterns',
    ];

    const description = taskDescriptions[Math.floor(Math.random() * taskDescriptions.length)];

    const taskData = {
      agentId: agent.id,
      clientId,
      amount: taskAmount,
      description,
      loanThreshold: 10.0,
    };

    console.log('📋 Task details:');
    console.log(`   Client ID: ${clientId}`);
    console.log(`   Amount: ${taskAmount} USDC`);
    console.log(`   Description: ${description}`);
    console.log(`   Loan Threshold: 10.0 USDC`);
    console.log(`   Will require loan: ${taskAmount > 10.0 ? 'YES ✅' : 'NO ❌'}`);
    console.log('');

    // 3. Send the task request
    console.log('🚀 Creating task...');
    const taskRes = await axios.post(`${API_URL}/api/tasks`, taskData);
    const task = taskRes.data.data.task;

    console.log(`✅ Task created successfully!`);
    console.log(`   Task ID: ${task.id}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Requires loan: ${task.requiresLoan}`);
    console.log('');

    // 4. Wait for ZK proof generation and loan request
    console.log('⏳ Waiting for ZK proof generation and loan request...');
    console.log('   (This may take a few seconds)\n');

    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    // 5. Check the updated task status
    console.log('🔍 Checking task status...');
    const updatedTaskRes = await axios.get(`${API_URL}/api/agents/${agent.id}/tasks`);
    const tasks = updatedTaskRes.data.data.tasks;
    const updatedTask = tasks.find((t: any) => t.id === task.id);

    if (!updatedTask) {
      console.error('❌ Could not find updated task');
      return;
    }

    console.log('');
    console.log('📊 Final Task Status:');
    console.log('─────────────────────────────────────────');
    console.log(`   Task ID: ${updatedTask.id}`);
    console.log(`   Status: ${updatedTask.status}`);
    console.log(`   Amount: ${updatedTask.amount} USDC`);
    console.log(`   Client Hash: ${updatedTask.clientHash.substring(0, 16)}...`);

    if (updatedTask.zkProofHash) {
      console.log(`   ZK Proof: ${updatedTask.zkProofHash.substring(0, 20)}... ✅`);
    } else {
      console.log('   ZK Proof: Pending ⏳');
    }

    if (updatedTask.loan) {
      console.log('');
      console.log('💰 Loan Details:');
      console.log(`   Loan ID: ${updatedTask.loan.id}`);
      console.log(`   Status: ${updatedTask.loan.status}`);
      console.log(`   Principal: ${updatedTask.loan.principal} USDC`);

      if (updatedTask.loan.lenderAgent) {
        console.log(`   Lender: ${updatedTask.loan.lenderAgent.name}`);
        console.log(`   Interest Rate: ${updatedTask.loan.interestRate}bp`);
        console.log(`   Expected Repayment: ${updatedTask.loan.expectedRepayment} USDC`);
      } else {
        console.log('   Lender: PENDING (awaiting a lender) ⏳');
        console.log('   Interest Rate: TBD');
        console.log('   Expected Repayment: TBD');
      }
    } else if (updatedTask.requiresLoan) {
      console.log('');
      console.log('💰 Loan: Requested but not yet created ⏳');
    } else {
      console.log('');
      console.log('💰 Loan: Not required ✅');
    }

    console.log('─────────────────────────────────────────');
    console.log('');

    // Status explanation
    if (updatedTask.status === 'AWAITING_FUNDS') {
      console.log('ℹ️  Status Explanation:');
      console.log('   The task is waiting for loan approval and fund disbursement.');
      console.log('   Once the lender approves and disburses funds, the task will move to FUNDED status.');
    } else if (updatedTask.status === 'FUNDED') {
      console.log('ℹ️  Status Explanation:');
      console.log('   The task is ready to be executed by the agent.');
    } else if (updatedTask.status === 'PENDING') {
      console.log('ℹ️  Status Explanation:');
      console.log('   ZK proof generation is still in progress.');
    }

    console.log('');
    console.log('🎉 Simulation complete!\n');

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('   Details:', error.response.data.error);
    }
    process.exit(1);
  }
}

/**
 * Simulate multiple tasks
 */
async function simulateMultipleTasks(count: number = 3) {
  console.log(`🎬 Simulating ${count} client task requests...\n`);

  for (let i = 1; i <= count; i++) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TASK ${i} of ${count}`);
    console.log('='.repeat(60) + '\n');

    await simulateClientTask();

    if (i < count) {
      console.log('⏸️  Waiting 3 seconds before next task...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n✅ All tasks simulated successfully!\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'multiple') {
  const count = parseInt(args[1]) || 3;
  simulateMultipleTasks(count);
} else {
  simulateClientTask();
}
