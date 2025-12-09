# 🔧 Prisma Setup & Troubleshooting Guide

## ❌ Error: Module '@prisma/client' has no exported member 'PrismaClient'

This error occurs because **Prisma Client has not been generated yet**.

---

## ✅ Quick Fix (3 Steps)

### Step 1: Install Dependencies

```bash
# If you haven't installed dependencies yet
pnpm install

# Or with npm
npm install

# Or with yarn
yarn install
```

### Step 2: Generate Prisma Client

```bash
# Using pnpm (recommended)
pnpm prisma generate

# Or with npm
npx prisma generate

# Or with yarn
yarn prisma generate
```

### Step 3: Verify TypeScript Can Find Types

```bash
# Restart your TypeScript server in VS Code
# Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)
# Type: "TypeScript: Restart TS Server"
# Press Enter
```

---

## 📋 Complete Setup From Scratch

### 1. Install All Dependencies

```bash
# One command to install everything
pnpm install && cd ml_service && pip install -r requirements.txt && cd ..
```

### 2. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your database credentials
nano .env  # or use your preferred editor
```

**Minimum required in .env:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dkut_medical"
JWT_SECRET="your-super-secret-key"
ML_API_URL="http://localhost:5000"
```

### 3. Generate Prisma Client

```bash
pnpm prisma generate
```

**Expected output:**
```
✔ Generated Prisma Client (5.22.0) to ./node_modules/@prisma/client
```

### 4. Create Database

```bash
# Option A: Using createdb command
createdb dkut_medical

# Option B: Using psql
psql -U postgres
CREATE DATABASE dkut_medical;
\q
```

### 5. Run Migrations

```bash
pnpm prisma migrate dev --name init
```

**Expected output:**
```
✔ Your database is now in sync with your schema
✔ Generated Prisma Client to ./node_modules/@prisma/client
```

### 6. Optional: Seed Database

```bash
pnpm prisma:seed
```

---

## 🔍 Troubleshooting Common Issues

### Issue 1: "Command 'prisma' not found"

**Solution:**
```bash
# Install Prisma CLI globally
npm install -g prisma

# Or use with npx
npx prisma generate
```

### Issue 2: "Environment variable not found: DATABASE_URL"

**Solution:**
```bash
# Make sure .env file exists
cp .env.example .env

# Edit .env and add:
DATABASE_URL="postgresql://user:password@localhost:5432/dkut_medical"
```

### Issue 3: TypeScript still shows error after generating

**Solutions:**

**A. Restart TypeScript Server (VS Code)**
```
1. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)
2. Type: "TypeScript: Restart TS Server"
3. Press Enter
```

**B. Restart VS Code**
```bash
# Close and reopen VS Code
```

**C. Delete node_modules and reinstall**
```bash
rm -rf node_modules
pnpm install
pnpm prisma generate
```

### Issue 4: "P1001: Can't reach database server"

**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Or on Mac
brew services list

# Start PostgreSQL if stopped
sudo systemctl start postgresql  # Linux
brew services start postgresql   # Mac
```

### Issue 5: Prisma Client is outdated

**Solution:**
```bash
# Regenerate Prisma Client
pnpm prisma generate

# Or force regenerate
rm -rf node_modules/.prisma
pnpm prisma generate
```

---

## 📦 Prisma Commands Reference

### Generate Client
```bash
pnpm prisma generate          # Generate Prisma Client
```

### Database Migrations
```bash
pnpm prisma migrate dev       # Create and apply migration (dev)
pnpm prisma migrate deploy    # Apply migrations (production)
pnpm prisma migrate reset     # Reset database and apply all migrations
pnpm prisma migrate status    # Check migration status
```

### Database Management
```bash
pnpm prisma db push           # Push schema changes without migration
pnpm prisma db pull           # Pull schema from existing database
pnpm prisma db seed           # Run seed script
```

### Prisma Studio (Database GUI)
```bash
pnpm prisma studio            # Open database GUI
# Runs on http://localhost:5555
```

### Schema Formatting
```bash
pnpm prisma format            # Format schema file
pnpm prisma validate          # Validate schema
```

---

## 🏗️ Understanding Prisma Client Generation

### What Happens When You Run `prisma generate`?

1. **Reads** `prisma/schema.prisma`
2. **Generates** TypeScript types based on your models
3. **Creates** `node_modules/@prisma/client/` directory
4. **Provides** fully typed database client

### Generated Files Location
```
node_modules/
└── @prisma/
    └── client/
        ├── index.d.ts          # TypeScript types
        ├── index.js            # JavaScript client
        └── runtime/            # Prisma runtime
```

### When to Regenerate

You need to run `prisma generate` after:
- ✅ Initial installation
- ✅ Changing `schema.prisma`
- ✅ Adding/removing models
- ✅ Modifying fields
- ✅ Updating Prisma version

---

## 🔄 Complete Workflow

### First Time Setup
```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your database URL

# 3. Generate Prisma Client
pnpm prisma generate

# 4. Create database
createdb dkut_medical

# 5. Run migrations
pnpm prisma migrate dev --name init

# 6. Seed database (optional)
pnpm prisma:seed

# 7. Start development
pnpm dev
```

### After Schema Changes
```bash
# 1. Edit prisma/schema.prisma
# 2. Generate client
pnpm prisma generate

# 3. Create migration
pnpm prisma migrate dev --name your_migration_name

# 4. Restart dev server
pnpm dev
```

---

## 📝 Verify Installation

### Check if Prisma Client is Generated

```bash
# Check if client exists
ls -la node_modules/@prisma/client/

# Should see:
# index.d.ts
# index.js
# package.json
# runtime/
```

### Test Prisma Client in Code

Create a test file: `test-prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma Client working!');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query successful:', result);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();
```

Run test:
```bash
npx tsx test-prisma.ts
```

---

## 🎯 Package.json Scripts

Your `package.json` includes these Prisma scripts:

```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "tsx prisma/seed.ts"
  }
}
```

Usage:
```bash
pnpm prisma:generate    # Generate client
pnpm prisma:migrate     # Run migrations
pnpm prisma:studio      # Open GUI
pnpm prisma:seed        # Seed database
```

---

## 🐳 Docker Setup

If using Docker, Prisma Client is generated automatically:

```dockerfile
# In Dockerfile
RUN pnpm install
RUN pnpm prisma generate
```

Or in docker-compose.yml:
```yaml
services:
  backend:
    command: sh -c "pnpm prisma generate && pnpm dev"
```

---

## 🔐 Production Deployment

### Generate Prisma Client in Production

```bash
# 1. Install dependencies
pnpm install --prod

# 2. Generate Prisma Client
pnpm prisma generate

# 3. Run migrations
pnpm prisma migrate deploy

# 4. Start server
pnpm start
```

### Environment Variables for Production

```env
DATABASE_URL="postgresql://user:password@production-host:5432/dkut_medical?schema=public&sslmode=require"
```

---

## 📊 Database Schema Overview

Your Prisma schema includes:

- ✅ 15 tables (users, patients, staff, etc.)
- ✅ Complete relationships
- ✅ Optimized indexes
- ✅ Enums for type safety
- ✅ Validation constraints

**Location:** `prisma/schema.prisma`

---

## ⚠️ Important Notes

### 1. Gitignore
```
# Already in .gitignore
node_modules/
prisma/*.db
```

**Don't commit:**
- `node_modules/@prisma/client/` ❌
- `.env` file ❌

**Do commit:**
- `prisma/schema.prisma` ✅
- `prisma/migrations/` ✅

### 2. CI/CD Pipeline

Add to your CI/CD:
```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

### 3. Multiple Developers

Each developer must:
```bash
git pull
pnpm install
pnpm prisma generate
pnpm prisma migrate dev
```

---

## 🆘 Still Having Issues?

### Complete Reset

```bash
# 1. Remove everything
rm -rf node_modules
rm -rf prisma/migrations
rm pnpm-lock.yaml

# 2. Reinstall
pnpm install

# 3. Generate Prisma
pnpm prisma generate

# 4. Reset database
dropdb dkut_medical
createdb dkut_medical

# 5. Run migrations
pnpm prisma migrate dev --name init

# 6. Restart TypeScript
# In VS Code: Ctrl+Shift+P -> "Reload Window"
```

### Get Help

1. Check Prisma docs: https://www.prisma.io/docs
2. Review error logs carefully
3. Ensure PostgreSQL is running
4. Verify DATABASE_URL in .env
5. Check Node.js version (need 18+)

---

## ✅ Checklist

Before starting development:

- [ ] Dependencies installed (`pnpm install`)
- [ ] `.env` file configured
- [ ] PostgreSQL running
- [ ] Database created
- [ ] Prisma Client generated (`pnpm prisma generate`)
- [ ] Migrations applied (`pnpm prisma migrate dev`)
- [ ] TypeScript server restarted
- [ ] No import errors in IDE

---

## 🎉 Success!

If you can import without errors:

```typescript
import { PrismaClient } from '@prisma/client'; // ✅ No error!

const prisma = new PrismaClient();
```

You're ready to start developing! 🚀

---

**Last Updated:** December 1, 2024  
**Prisma Version:** 5.22.0  
**Status:** ✅ Complete