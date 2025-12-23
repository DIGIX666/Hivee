import { logger } from '../utils/logger';
import { agentProcessorService } from './agentProcessor.service';

/**
 * Simple in-memory job queue for agent processing
 * In production, use Redis Queue (Bull) or similar
 */
class QueueService {
  private processingQueue: string[] = [];
  private isProcessing: boolean = false;

  /**
   * Add agent to processing queue
   */
  async queueAgentProcessing(agentId: string): Promise<void> {
    logger.info(`Queuing agent ${agentId} for processing`);

    this.processingQueue.push(agentId);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    const agentId = this.processingQueue.shift();
    if (!agentId) {
      this.isProcessing = false;
      return;
    }

    try {
      logger.info(`Processing agent ${agentId} from queue`);
      await agentProcessorService.processAgent(agentId);
      logger.info(`Agent ${agentId} processed successfully`);
    } catch (error) {
      logger.error(`Error processing agent ${agentId}:`, error);
    }

    // Process next item
    setImmediate(() => this.processQueue());
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { queueLength: number; isProcessing: boolean } {
    return {
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.processingQueue = [];
    logger.info('Processing queue cleared');
  }
}

export const queueService = new QueueService();
