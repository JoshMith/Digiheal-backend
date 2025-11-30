# Digiheal-backend
# DKUT Medical Center - Backend API

Digital Health Management System backend with ML-powered disease prediction integration.

## 🏗️ Architecture

```
┌─────────────────┐      HTTP/REST      ┌──────────────────┐
│  React Frontend │ ◄──────────────────► │  Express Backend │
│   (Port 5173)   │                      │    (Port 3000)   │
└─────────────────┘                      └────────┬─────────┘
                                                  │
                                         ┌────────▼─────────┐
                                         │   PostgreSQL     │
                                         │   (Port 5432)    │
                                         └──────────────────┘
                                         ┌──────────────────┐
                                         │  Flask ML API    │
                                         │   (Port 5000)    │
                                         └──────────────────┘
```

## 🚀 Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js + TypeScript
- **Database:** PostgreSQL 15
- **ORM:** Prisma
- **ML Service:** Flask (Python)
- **Caching:** Redis (optional)
- **Auth:** JWT
- **Validation:** Zod
- **Documentation:** Swagger/OpenAPI

## 📋 Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 15
- Python >= 3.9 (for ML service)
- Docker & Docker Compose (optional, for containerized deployment)

## 🛠️ Installation

### Option 1: Install All Dependencies at Once

```bash
# Install all Node.js dependencies
pnpm install

# Install Python dependencies for ML service
cd ml_service && pip install -r requirements.txt && cd ..
```

### Option 2: Manual Setup

```bash
# Clone repository
git clone <repository-url>
cd dkut-backend

# Install Node dependencies
pnpm install

# Setup ML service
cd ml_service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

## ⚙️ Configuration

1. **Create environment file:**
```bash
cp .env.example .env
```

2. **Update .env with your configurations:**
```env
DATABASE_URL="postgresql://dkut_user:dkut_password@localhost:5432/dkut_medical"
JWT_SECRET=your-super-secret-key
ML_API_URL=http://localhost:5000
```

3. **Setup database:**
```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Optional: Seed database
pnpm prisma:seed
```

## 🏃 Running the Project

### Development Mode

**Terminal 1 - Express Backend:**
```bash
pnpm dev
# Server runs on http://localhost:3000
```

**Terminal 2 - ML Service:**
```bash
cd ml_service
python app.py
# ML API runs on http://localhost:5000
```

**Terminal 3 - PostgreSQL:**
```bash
# If not using Docker:
psql -U postgres
CREATE DATABASE dkut_medical;
```

### Production Mode

```bash
# Build TypeScript
pnpm build

# Start production server
pnpm start
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

Services will be available at:
- Express API: http://localhost:3000
- ML Service: http://localhost:5000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Individual Docker Commands

```bash
# Build backend image
docker build -t dkut-backend .

# Run backend container
docker run -p 3000:3000 --env-file .env dkut-backend

# Build ML service
cd ml_service
docker build -t dkut-ml-service .
docker run -p 5000:5000 dkut-ml-service
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout user

### Health Assessments
- `POST /api/health-assessments` - Create assessment (ML prediction)
- `GET /api/health-assessments/:id` - Get assessment by ID
- `GET /api/health-assessments/patient/:patientId` - Get patient assessments

### Patients
- `POST /api/patients` - Create patient profile
- `GET /api/patients/:id` - Get patient by ID
- `PUT /api/patients/:id` - Update patient
- `GET /api/patients/:id/history` - Get medical history
- `GET /api/patients/:id/stats` - Get patient statistics

### Appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/:id` - Get appointment
- `GET /api/appointments/patient/:patientId` - Get patient appointments
- `PUT /api/appointments/:id` - Update appointment
- `POST /api/appointments/:id/check-in` - Check-in
- `POST /api/appointments/:id/cancel` - Cancel appointment
- `GET /api/appointments/slots/available` - Get available slots

### Staff
- `POST /api/staff` - Create staff (Admin only)
- `GET /api/staff` - Get all staff
- `GET /api/staff/:id` - Get staff by ID
- `PUT /api/staff/:id` - Update staff
- `PATCH /api/staff/:id/availability` - Toggle availability
- `GET /api/staff/:id/schedule` - Get schedule
- `GET /api/staff/:id/stats` - Get statistics

### Consultations
- `POST /api/consultations` - Create consultation
- `GET /api/consultations/:id` - Get consultation
- `GET /api/consultations/patient/:patientId` - Get patient consultations

### Health Check
- `GET /api/health` - API health status

## 📊 Database Schema

15 tables with optimized indexes:
- users, patients, staff
- health_assessments (ML integration)
- appointments, consultations
- vital_signs, prescriptions
- medical_records, notifications
- audit_logs, system_settings

View schema: `pnpm prisma:studio`

## 🔐 Authentication & Authorization

**JWT-based authentication:**
- Token expiry: 7 days (configurable)
- Roles: PATIENT, STAFF, ADMIN
- Middleware: `authenticate`, `requireRole`

**Protected routes example:**
```typescript
router.get('/patients', 
  authenticate, 
  requireRole(['STAFF', 'ADMIN']), 
  PatientController.getAllPatients
);
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test --coverage
```

## 📝 Available Scripts

```bash
# Development
pnpm dev                # Start dev server with hot reload
pnpm build              # Build for production
pnpm start              # Start production server

# Database
pnpm prisma:generate    # Generate Prisma client
pnpm prisma:migrate     # Run migrations
pnpm prisma:studio      # Open Prisma Studio GUI
pnpm prisma:seed        # Seed database

# ML Service
pnpm ml:train           # Train ML model
pnpm ml:serve           # Start ML service

# Code Quality
pnpm lint               # Run ESLint
pnpm format             # Format with Prettier
pnpm test               # Run tests
```

## 🌐 Server Deployment Guide

### Option 1: VPS Deployment (Ubuntu)

**1. Setup Server:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Python
sudo apt install python3 python3-pip python3-venv -y

# Install Nginx
sudo apt install nginx -y

# Install PM2 (process manager)
npm install -g pm2
```

**2. Setup Database:**
```bash
sudo -u postgres psql
CREATE DATABASE dkut_medical;
CREATE USER dkut_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE dkut_medical TO dkut_user;
\q
```

**3. Deploy Application:**
```bash
# Clone repository
cd /var/www
git clone <repository-url> dkut-backend
cd dkut-backend

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
nano .env  # Edit with production values

# Build application
pnpm build

# Run migrations
pnpm prisma:generate
pnpm prisma:migrate deploy

# Setup ML service
cd ml_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**4. Configure PM2:**
```bash
# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'dkut-api',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'dkut-ml',
      script: 'ml_service/app.py',
      interpreter: 'ml_service/venv/bin/python',
      env: {
        FLASK_ENV: 'production'
      }
    }
  ]
};
EOF

# Start services
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**5. Configure Nginx:**
```bash
sudo nano /etc/nginx/sites-available/dkut-backend
```

Add configuration:
```nginx
server {
    listen 80;
    server_name api.dkut.ac.ke;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/dkut-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**6. Setup SSL (Let's Encrypt):**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.dkut.ac.ke
```

**7. Setup Firewall:**
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Option 2: Docker Deployment on Server

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Deploy application
cd /var/www/dkut-backend
cp .env.example .env
nano .env  # Update with production values

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f
```

### Option 3: Cloud Deployment (AWS/Azure/GCP)

**AWS Elastic Beanstalk:**
```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Create environment
eb create dkut-backend-prod

# Deploy
eb deploy
```

**Heroku:**
```bash
# Create app
heroku create dkut-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Deploy
git push heroku main

# Run migrations
heroku run pnpm prisma:migrate deploy
```

## 🔧 Monitoring & Maintenance

### View Logs
```bash
# PM2 logs
pm2 logs

# Docker logs
docker-compose logs -f backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Backup
```bash
# Backup
pg_dump -U dkut_user dkut_medical > backup_$(date +%Y%m%d).sql

# Restore
psql -U dkut_user dkut_medical < backup_20241130.sql
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Install dependencies
pnpm install

# Build
pnpm build

# Restart services
pm2 restart all

# Or with Docker
docker-compose down
docker-compose up -d --build
```

## 📚 Documentation

- API Documentation: http://localhost:3000/api-docs (when API_DOCS_ENABLED=true)
- Database Schema: Run `pnpm prisma:studio`

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify connection
psql -U dkut_user -d dkut_medical -h localhost
```

**ML Service Not Responding:**
```bash
# Check if service is running
curl http://localhost:5000/health

# Restart ML service
pm2 restart dkut-ml
```

**Port Already in Use:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

## 📄 License

MIT License - DKUT Medical Team

## 👥 Support

For issues and questions:
- Create an issue on GitHub
- Email: support@dkut.ac.ke