import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  server: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    apiUrl: process.env.API_URL || 'http://localhost:3001',
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  blockchain: {
    capxRpcUrl: process.env.CAPX_RPC_URL!,
    capxWsUrl: process.env.CAPX_WS_URL,
    capxChainId: parseInt(process.env.CAPX_CHAIN_ID || '756', 10),
    privateKey: process.env.PRIVATE_KEY!,
    agentIdentityAddress: process.env.AGENT_IDENTITY_ADDRESS!,
    brokerAgentAddress: process.env.BROKER_AGENT_ADDRESS!,
    x402ProtocolAddress: process.env.X402_PROTOCOL_ADDRESS!,
    tokenRegistryAddress: process.env.TOKEN_REGISTRY_ADDRESS!,
    mockUsdcAddress: process.env.MOCK_USDC_ADDRESS!,
  },
  brokerApiUrl: process.env.BROKER_AI_URL || 'http://localhost:8001',
  storage: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    agentCodeDir: process.env.AGENT_CODE_DIR || './agent_code',
  },
  sdk: {
    // Path to Hivee SDK source files
    // Default: relative to config directory (src/config -> src -> backend -> project root)
    sourcePath: process.env.HIVEE_SDK_PATH || path.join(__dirname, '..', '..', '..', 'sdk'),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production environment!');
      }
      console.warn('⚠️  WARNING: Using default JWT secret in development mode');
      return 'dev-secret-DO-NOT-USE-IN-PRODUCTION';
    })(),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  platform: {
    address: process.env.PLATFORM_ADDRESS!,
    feeRate: parseInt(process.env.PLATFORM_FEE_RATE || '50', 10),
  },
  scanning: {
    banditPath: process.env.BANDIT_PATH || 'bandit',
    eslintPath: process.env.ESLINT_PATH || 'eslint',
    semgrepPath: process.env.SEMGREP_PATH || 'semgrep',
    trivyPath: process.env.TRIVY_PATH || 'trivy',
  },
};

export default config;
