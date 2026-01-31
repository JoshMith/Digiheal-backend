import dotenv from 'dotenv'
dotenv.config();

export const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Application Configuration
  app: {
    name: process.env.APP_NAME || 'DigiHeal API',
    url: process.env.APP_URL || 'http://localhost:3000' || 'https://miffiest-tom-pyramidally.ngrok-free.dev',
    version: process.env.APP_VERSION || '1.0.0'
  },
  
  // API Configuration
  apiPrefix: process.env.API_PREFIX || '',
  
  // Environment flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Environment string
  env: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'https://digiheal-hub.lovable.app',
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },
  
  // Bcrypt Configuration
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')
  },
  
  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100')
  }
};