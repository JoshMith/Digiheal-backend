import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import dotenv from "dotenv"

dotenv.config()

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  });
};

const prisma = globalThis.prisma ?? prismaClientSingleton();

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: any) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;

// Test database connection
export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    
    // Run a simple query to verify
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database query test successful');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Graceful shutdown
export const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting database:', error);
  }
};