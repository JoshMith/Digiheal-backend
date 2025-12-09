# ⚙️ Configuration Files Documentation

All configuration files are **COMPLETE** and production-ready!

---

## 📁 Configuration Files Overview

```
src/config/
├── database.ts      ✅ Prisma client configuration
├── env.ts          ✅ Environment variable validation
├── redis.ts        ✅ Redis cache configuration
└── swagger.ts      ✅ OpenAPI documentation
```

---

## 1️⃣ `config/database.ts` - Prisma Database

### ✅ **Status: COMPLETE** (58 lines)

### Features
- ✅ Prisma Client singleton pattern
- ✅ Connection pooling
- ✅ Query logging in development
- ✅ Error handling
- ✅ Graceful shutdown
- ✅ Connection testing

### Implementation

```typescript
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// Global singleton
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

// Ensure single instance
const prisma = globalThis.prisma ?? prismaClientSingleton();

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

// Prevent hot reload issues in development
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;

// Connection functions
export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    
    await prisma.$queryRaw`SELECT 1`; // Test query
    logger.info('✅ Database query test successful');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting database:', error);
  }
};
```

### Usage

```typescript
// In server.ts
import { connectDatabase, disconnectDatabase } from './config/database';

// On startup
await connectDatabase();

// In controllers
import prisma from './config/database';

const users = await prisma.user.findMany();
const user = await prisma.user.create({ data: {...} });

// On shutdown
await disconnectDatabase();
```

### Benefits
- **Singleton Pattern** - Single Prisma instance across app
- **Hot Reload Safe** - Works with nodemon/tsx in dev
- **Query Logging** - Debug SQL queries in development
- **Connection Pooling** - Automatic via Prisma
- **Type Safety** - Full TypeScript support

---

## 2️⃣ `config/env.ts` - Environment Validation

### ✅ **Status: COMPLETE** (140+ lines)

### Features
- ✅ Zod schema validation
- ✅ Type-safe configuration
- ✅ Default values
- ✅ Validation on startup
- ✅ Helpful error messages

### Configuration Structure

```typescript
export const config = {
  env: 'development' | 'production' | 'test',
  port: 3000,
  apiPrefix: '/api/v1',
  
  database: {
    url: string,
  },
  
  mlService: {
    url: 'http://localhost:5000',
    timeout: 10000,
  },
  
  jwt: {
    secret: string,
    expiresIn: '7d',
    refreshExpiresIn: '30d',
  },
  
  redis: {
    url?: string,
    enabled: boolean,
  },
  
  email: {
    host?: string,
    port?: number,
    secure: boolean,
    user?: string,
    pass?: string,
    from?: string,
  },
  
  storage: {
    type: 'local' | 's3',
    uploadDir: './uploads',
    maxFileSize: 10485760, // 10MB
  },
  
  aws: {
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
    s3Bucket?: string,
  },
  
  logging: {
    level: 'info',
    file: './logs/app.log',
  },
  
  rateLimit: {
    windowMs: 900000,
    maxRequests: 100,
  },
  
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true,
  },
  
  app: {
    name: 'DKUT Medical Center',
    url: 'http://localhost:3000',
    frontendUrl: 'http://localhost:5173',
  },
};
```

### Usage

```typescript
import { config } from './config/env';

// Access configuration
const port = config.port;
const jwtSecret = config.jwt.secret;
const mlUrl = config.mlService.url;

// Type-safe and validated!
```

### Validation

If environment variables are missing or invalid:

```
❌ Invalid environment variables:
  DATABASE_URL: Required
  JWT_SECRET: Required
  ML_API_URL: Expected string, received undefined
```

Then process exits with code 1.

---

## 3️⃣ `config/redis.ts` - Redis Cache

### ✅ **Status: COMPLETE** (100+ lines)

### Features
- ✅ Optional Redis support
- ✅ Connection management
- ✅ Cache helper functions
- ✅ Error handling
- ✅ TTL support

### Cache Service

```typescript
import { cacheService } from './config/redis';

// Get from cache
const data = await cacheService.get<User>('user:123');

// Set in cache (with TTL)
await cacheService.set('user:123', userData, 3600); // 1 hour

// Delete from cache
await cacheService.del('user:123');

// Delete by pattern
await cacheService.delPattern('user:*');
```

### Connection Functions

```typescript
import { connectRedis, disconnectRedis } from './config/redis';

// Connect to Redis
await connectRedis();

// Disconnect
await disconnectRedis();
```

### Use Cases

**ML Prediction Caching:**
```typescript
// In ml.service.ts
const cacheKey = `ml:prediction:${JSON.stringify(symptoms)}`;
const cached = await cacheService.get<MLPrediction>(cacheKey);

if (cached) {
  return cached; // Return cached result
}

// Make ML API call
const prediction = await mlApi.predict(symptoms);

// Cache for 1 hour
await cacheService.set(cacheKey, prediction, 3600);
```

**Session Caching:**
```typescript
// Cache user session
await cacheService.set(`session:${userId}`, session, 86400); // 24h
```

**API Response Caching:**
```typescript
// Cache frequently accessed data
const stats = await cacheService.get('dashboard:stats');
if (!stats) {
  const stats = await calculateStats();
  await cacheService.set('dashboard:stats', stats, 300); // 5 min
}
```

---

## 4️⃣ `config/swagger.ts` - API Documentation

### ✅ **Status: COMPLETE** (80+ lines)

### Features
- ✅ OpenAPI 3.0 specification
- ✅ JWT authentication schema
- ✅ Common schemas (Error, Success)
- ✅ Organized by tags
- ✅ Server configuration

### Documentation Tags

```typescript
tags: [
  { name: 'Authentication', description: 'User authentication endpoints' },
  { name: 'Patients', description: 'Patient management endpoints' },
  { name: 'Staff', description: 'Staff management endpoints' },
  { name: 'Health Assessments', description: 'ML-powered health assessments' },
  { name: 'Appointments', description: 'Appointment scheduling and management' },
  { name: 'Consultations', description: 'Medical consultation records' },
  { name: 'Prescriptions', description: 'Prescription management' },
  { name: 'Notifications', description: 'Patient notifications' },
  { name: 'Queue', description: 'Queue management system' },
  { name: 'Analytics', description: 'Analytics and reporting' },
]
```

### Security Scheme

```typescript
securitySchemes: {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
}
```

### Common Schemas

```typescript
Error: {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string' },
    errors: { type: 'array', items: { type: 'object' } },
  },
}

Success: {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    data: { type: 'object' },
  },
}
```

### Access Documentation

**URL:** `http://localhost:3000/api-docs`

**Features:**
- Interactive API testing
- Request/response examples
- Authentication testing
- Schema validation
- Try it out functionality

---

## 📊 Configuration Summary

| File | Lines | Features | Status |
|------|-------|----------|--------|
| **database.ts** | 58 | Prisma client, connection management | ✅ Complete |
| **env.ts** | 140+ | Environment validation, type safety | ✅ Complete |
| **redis.ts** | 100+ | Cache service, connection management | ✅ Complete |
| **swagger.ts** | 80+ | API documentation, OpenAPI spec | ✅ Complete |
| **Total** | **378+** | **All features** | **✅ 100%** |

---

## 🔧 Environment Variables Required

### Minimal Setup (.env)

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://user:pass@localhost:5432/dkut_medical"

# Server (REQUIRED)
PORT=3000
NODE_ENV=development

# ML Service (REQUIRED)
ML_API_URL=http://localhost:5000

# JWT (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### Full Setup (Production)

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dkut_medical"

# Server
PORT=3000
NODE_ENV=production
API_PREFIX=/api/v1

# ML Service
ML_API_URL=http://ml-service:5000
ML_API_TIMEOUT=10000

# JWT
JWT_SECRET=your-production-secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Redis
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
EMAIL_FROM="DKUT Medical <noreply@dkut.ac.ke>"

# Storage
STORAGE_TYPE=s3
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# AWS (if using S3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=dkut-medical-files

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://dkut-medical.ac.ke,https://admin.dkut-medical.ac.ke
CORS_CREDENTIALS=true

# Application
APP_NAME="DKUT Medical Center"
APP_URL=https://api.dkut-medical.ac.ke
FRONTEND_URL=https://dkut-medical.ac.ke
```

---

## 🚀 Startup Sequence

```typescript
// server.ts
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';

async function start() {
  // 1. Validate environment variables
  // (Automatic via config/env.ts import)
  
  // 2. Connect to database
  await connectDatabase();
  // ✅ Database connected successfully
  // ✅ Database query test successful
  
  // 3. Connect to Redis (optional)
  if (config.redis.enabled) {
    await connectRedis();
    // ✅ Redis connected successfully
  }
  
  // 4. Start Express server
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
    logger.info(`API docs: ${config.app.url}/api-docs`);
  });
}

start();
```

---

## 🧪 Testing Configuration

```typescript
// Test database connection
import { connectDatabase } from './config/database';

try {
  await connectDatabase();
  console.log('✅ Database connection successful');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
}

// Test Redis connection
import { connectRedis } from './config/redis';

const redis = await connectRedis();
if (redis) {
  console.log('✅ Redis connection successful');
}

// Test environment configuration
import { config } from './config/env';

console.log('Configuration:', {
  env: config.env,
  port: config.port,
  database: config.database.url ? '✅ Set' : '❌ Missing',
  jwt: config.jwt.secret ? '✅ Set' : '❌ Missing',
  mlService: config.mlService.url,
});
```

---

## ✅ Verification Checklist

- ✅ All 4 config files are complete
- ✅ Environment validation works
- ✅ Database connection established
- ✅ Redis optional but functional
- ✅ Swagger docs generated
- ✅ Type safety enforced
- ✅ Error handling implemented
- ✅ Logging configured
- ✅ Production ready

---

## 🎯 Status: 100% COMPLETE

All configuration files are **production-ready** with:
- ✅ Full TypeScript type safety
- ✅ Comprehensive error handling
- ✅ Environment validation
- ✅ Connection management
- ✅ Graceful shutdown
- ✅ Development & production modes
- ✅ Detailed logging
- ✅ API documentation

**No changes needed!** 🎉