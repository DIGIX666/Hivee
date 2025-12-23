import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * Create a task for a specific agent
 * Usage:
 *   npx tsx scripts/create-task.ts [agentId] [amount] [description]
 */
async function createTask() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let agentId = args[0];
    let amount = args[1] ? parseFloat(args[1]) : 15.0;
    let description = args[2] || 'AI research task: Analyze market trends';

    // If no agentId provided, fetch the first active agent
    if (!agentId) {
      console.log('📋 No agentId provided, fetching active agents...\n');
      const agentsRes = await axios.get(`${API_URL}/api/agents?status=ACTIVE`);
      const agents = agentsRes.data.data.agents;

      if (agents.length === 0) {
        console.error('❌ No active agents found');
        console.log('💡 Please upload and deploy an agent first');
        console.log('\nUsage:');
        console.log('  npx tsx scripts/create-task.ts [agentId] [amount] [description]');
        console.log('\nExamples:');
        console.log('  npx tsx scripts/create-task.ts abc123 15.5 "AI research task"');
        console.log('  npx tsx scripts/create-task.ts abc123 8.0');
        console.log('  npx tsx scripts/create-task.ts abc123');
        console.log('  npx tsx scripts/create-task.ts  (uses first active agent)\n');
        process.exit(1);
      }

      agentId = agents[0].id;
      console.log(`✅ Using agent: ${agents[0].name} (${agentId})\n`);
    }

    // Generate client ID
    const clientId = `client_${Math.floor(Math.random() * 10000)}`;

    // Create task data
    const taskData = {
      agentId,
      clientId,
      amount,
      description,
      loanThreshold: 10.0,
    };

    console.log('🎬 Creating Task...\n');
    console.log('📋 Task Details:');
    console.log('─────────────────────────────────────────');
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Client ID: ${clientId}`);
    console.log(`   Amount: ${amount} USDC`);
    console.log(`   Description: ${description}`);
    console.log(`   Loan Threshold: 10.0 USDC`);
    console.log(`   Will require loan: ${amount > 10.0 ? 'YES ✅' : 'NO ❌'}`);
    console.log('─────────────────────────────────────────\n');

    // Create the task
    console.log('🚀 Sending request to API...');
    const taskRes = await axios.post(`${API_URL}/api/tasks`, taskData);
    const task = taskRes.data.data.task;

    console.log('✅ Task created successfully!\n');
    console.log('📊 Task Information:');
    console.log('─────────────────────────────────────────');
    console.log(`   Task ID: ${task.id}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Requires Loan: ${task.requiresLoan ? 'YES' : 'NO'}`);
    console.log('─────────────────────────────────────────\n');

    // Wait for async processing
    console.log('⏳ Waiting for ZK proof generation and loan processing...');
    console.log('   (This may take a few seconds)\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Fetch updated task
    console.log('🔍 Fetching updated task status...');
    const updatedTaskRes = await axios.get(`${API_URL}/api/tasks/${task.id}`);
    const updatedTask = updatedTaskRes.data.data.task;

    console.log('\n📊 Final Status:');
    console.log('═════════════════════════════════════════');
    console.log(`   Task ID: ${updatedTask.id}`);
    console.log(`   Status: ${updatedTask.status}`);
    console.log(`   Amount: ${updatedTask.amount} USDC`);
    console.log(`   Client Hash: ${updatedTask.clientHash.substring(0, 20)}...`);

    // ZK Proof status
    if (updatedTask.zkProofHash) {
      console.log(`   ZK Proof Hash: ${updatedTask.zkProofHash.substring(0, 24)}... ✅`);
    } else {
      console.log('   ZK Proof: Still generating... ⏳');
    }

    // Loan status
    if (updatedTask.loan) {
      console.log('\n💰 Loan Information:');
      console.log('─────────────────────────────────────────');
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
      console.log('\n💰 Loan: Creating... ⏳');
    } else {
      console.log('\n💰 Loan: Not required ✅');
    }

    console.log('═════════════════════════════════════════\n');

    // Status explanation
    console.log('ℹ️  Status Explanation:');
    switch (updatedTask.status) {
      case 'PENDING':
        console.log('   ⏳ Task is pending - ZK proof generation in progress');
        break;
      case 'AWAITING_FUNDS':
        console.log('   💰 Task is awaiting funds from a lender');
        if (updatedTask.loan?.status === 'PENDING') {
          console.log('   📌 Loan is in PENDING status - waiting for a lender to accept');
        } else if (updatedTask.loan?.status === 'REQUESTED') {
          console.log('   📌 Loan has been requested from a lender - awaiting approval');
        }
        break;
      case 'FUNDED':
        console.log('   ✅ Task is funded and ready to execute');
        break;
      case 'IN_PROGRESS':
        console.log('   🔄 Task is being executed by the agent');
        break;
      case 'COMPLETED':
        console.log('   ✅ Task completed successfully');
        break;
      case 'PAID':
        console.log('   💸 Task payment received');
        break;
      case 'FAILED':
        console.log('   ❌ Task failed');
        break;
      default:
        console.log(`   Status: ${updatedTask.status}`);
    }

    console.log('\n🎉 Task creation process complete!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data?.error?.message || error.message);
    if (error.response?.data?.error) {
      console.error('   Details:', error.response.data.error);
    }
    console.log('\nUsage:');
    console.log('  npx tsx scripts/create-task.ts [agentId] [amount] [description]\n');
    process.exit(1);
  }
}

// Run the script
createTask();
