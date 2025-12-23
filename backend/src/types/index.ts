export interface AgentUpload {
  name: string;
  description?: string;
  language: 'python' | 'javascript' | 'typescript';
  file?: Express.Multer.File;
  gitUrl?: string;
}

export interface LenderConfig {
  name: string;
  maxLoanAmount: string;
  interestRate: number;
  minCreditScore: number;
}

export interface LoanRequest {
  agentId: string;
  amount: string;
  zkProofHash: string;
  expectedRevenue: string;
}

export interface PaymentInfo {
  token: string;
  amount: string;
  from: string;
  to: string;
}

export interface ScanFinding {
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  line?: number;
  file?: string;
}

export interface ScanResult {
  scanType: string;
  passed: boolean;
  findings: ScanFinding[];
  severity: 'high' | 'medium' | 'low';
}

export interface CodeModification {
  originalPath: string;
  modifiedPath: string;
  addressesReplaced: number;
  hooksInjected: string[];
  originalPaymentAddress: string | null;
}

export interface AgentProfile {
  owner: string;
  agentAddress: string;
  creditScore: number;
  totalLoans: number;
  successfulRepayments: number;
  failedRepayments: number;
  createdAt: number;
}

export interface LoanMatchResult {
  lenderId: string;
  lenderAddress: string;
  maxLoanAmount: string;
  interestRate: number;
  minCreditScore: number;
}

export interface TaskDetectionEvent {
  agentId: string;
  taskHash: string;
  amount: string;
  clientHash: string;
  timestamp: number;
}
