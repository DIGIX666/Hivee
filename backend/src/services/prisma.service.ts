import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

class PrismaService {
  private static instance: PrismaClient;

  static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient({
        log: [
          { level: 'warn', emit: 'event' },
          { level: 'error', emit: 'event' },
        ],
      });

      PrismaService.instance.$on('warn' as never, (e: any) => {
        logger.warn('Prisma warning:', e);
      });

      PrismaService.instance.$on('error' as never, (e: any) => {
        logger.error('Prisma error:', e);
      });
    }

    return PrismaService.instance;
  }

  static async disconnect(): Promise<void> {
    if (PrismaService.instance) {
      await PrismaService.instance.$disconnect();
    }
  }
}

export const prisma = PrismaService.getInstance();
export default PrismaService;
