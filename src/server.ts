import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { swaggerSpec } from './config/swagger';
import { errorHandler, notFound } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import logger, { stream } from './utils/logger';
import routes from './routes';

class Server {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(
      cors({
        origin: config.cors.origin,
        credentials: config.cors.credentials,
        methods: config.cors.methods,
        allowedHeaders: config.cors.allowedHeaders
      })
    );

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // HTTP request logging
    if (config.isDevelopment) {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined', { stream }));
    }

    // Rate limiting
    this.app.use(apiLimiter);

    // Request ID and timestamp
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      next();
    });
  }

  private initializeRoutes(): void {
    // API Documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'DKUT Medical Center API',
        version: '1.0.0',
        documentation: `${config.app.url}/api-docs`,
      });
    });

    // API routes
    this.app.use(config.apiPrefix, routes);
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();

      // Connect to Redis (optional)
      if (config.redis.enabled) {
        await connectRedis();
      }

      // Start server
      const server = this.app.listen(config.port, () => {
        logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   DKUT MEDICAL CENTER API                                ║
║                                                           ║
║   Environment: ${config.env.toUpperCase().padEnd(44)}║
║   Port: ${config.port.toString().padEnd(50)}║
║   API Prefix: ${config.apiPrefix.padEnd(46)}║
║   Documentation: ${`${config.app.url}/api-docs`.padEnd(40)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
        `);
      });

      // Graceful shutdown
      const gracefulShutdown = async (signal: string) => {
        logger.info(`${signal} signal received: closing HTTP server`);
        
        server.close(async () => {
          logger.info('HTTP server closed');
          
          await disconnectDatabase();
          await disconnectRedis();
          
          logger.info('Application shutdown complete');
          process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
          logger.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 10000);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

      // Handle unhandled rejections
      process.on('unhandledRejection', (reason: Error) => {
        logger.error('Unhandled Rejection:', reason);
        throw reason;
      });

      // Handle uncaught exceptions
      process.on('uncaughtException', (error: Error) => {
        logger.error('Uncaught Exception:', error);
        process.exit(1);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Create and start server
const server = new Server();
server.start();

export default server.app;