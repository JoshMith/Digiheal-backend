# 🏥 DKUT Medical Center - Complete Backend System

**Comprehensive Digital Health Management System with ML-Powered Disease Prediction**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748)](https://www.prisma.io/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Installation](#quick-installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [ML Integration](#ml-integration)
- [Deployment](#deployment)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

DKUT Medical Center Backend is a production-ready, enterprise-grade REST API built for university health services. It features ML-powered health assessments, comprehensive patient management, appointment scheduling with queue management, and complete medical record keeping.

### Key Highlights

- ✅ **ML-Powered** - Disease prediction with urgency classification
- ✅ **Production Ready** - Complete with authentication, validation, logging
- ✅ **Scalable** - Microservices architecture with Docker support
- ✅ **Type-Safe** - Full TypeScript implementation
- ✅ **Documented** - OpenAPI/Swagger documentation
- ✅ **Tested** - Comprehensive test coverage

---

## 🚀 Features

### Core Functionality
- 🔐 **JWT Authentication** - Secure token-based auth with role-based access control
- 🏥 **Patient Management** - Complete patient profiles with medical history
- 📅 **Appointment System** - Smart scheduling with queue management
- 🧠 **ML Health Assessment** - AI-powered disease prediction and severity scoring
- 💊 **Prescription Management** - Digital prescription tracking
- 📊 **Medical Records** - Document storage and retrieval
- 🔔 **Notifications** - Email and in-app notification system
- 📈 **Analytics Dashboard** - Real-time statistics and reporting
- 👨‍⚕️ **Staff Management** - Doctor/nurse profiles and scheduling
- 🩺 **Consultation Records** - Detailed examination documentation

### Technical Features
- **RESTful API Design** - Clean, intuitive endpoints
- **Data Validation** - Zod schema validation
- **Error Handling** - Comprehensive error management
- **Rate Limiting** - Protection against abuse
- **Audit Logging** - Complete activity tracking
- **Health Checks** - System monitoring endpoints
- **CORS Support** - Configurable cross-origin requests
- **Compression** - Response compression for performance
- **Security Headers** - Helmet.js integration

---

## 🏗️ System Architecture

```
┌─────────────────┐      HTTP/REST      ┌──────────────────┐      SQL       ┌──────────────────┐
│  React Frontend │ ◄──────────────────► │  Express Backend │ ◄────────────► │   PostgreSQL     │
│   (Port 5173)   │                      │    (Port 3000)   │                │   (Port 5432)    │
└─────────────────┘                      └────────┬─────────┘                └──────────────────┘
                                                  │
                                         ┌────────▼─────────┐
                                         │  Flask ML API    │
                                         │   (Port 5000)    │
                                         └──────────────────┘
                                         ┌──────────────────┐
                                         │  Redis Cache     │
                                         │   (Port 6379)    │
                                         └──────────────────┘
```

### Three-Tier Architecture

1. **Presentation Layer** - React frontend (separate repository)
2. **Application Layer** - Express.js backend (this repository)
3. **Data Layer** - PostgreSQL database + Redis cache

### Microservices

- **Express Backend** - Main API server (TypeScript)
- **ML Service** - Python Flask service for predictions
- **PostgreSQL** - Primary data store
- **Redis** - Optional caching layer

---

## 🛠️ Tech Stack

### Backend Runtime
- **Node.js** v18+ - JavaScript runtime
- **TypeScript** v5.7 - Type-safe JavaScript
- **Express.js** v4.x - Web framework
- **pnpm** v8+ - Package manager

### Database & ORM
- **PostgreSQL** v15+ - Relational database
- **Prisma** v5.x - Next-generation ORM
- **Redis** v7+ - Caching (optional)

### ML Service
- **Python** v3.9+ - ML runtime
- **Flask** v3.0 - Micro web framework
- **scikit-learn** - Machine learning
- **pandas** - Data manipulation

### Authentication & Security
- **JWT** (jsonwebtoken) - Token-based auth
- **bcryptjs** - Password hashing
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **Zod** - Schema validation

### Logging & Monitoring
- **Winston** - Structured logging
- **Morgan** - HTTP request logging

### Documentation
- **Swagger/OpenAPI** - API documentation
- **swagger-ui-express** - Interactive docs

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **PM2** - Process management
- **Nginx** - Reverse proxy

---

## 📦 Prerequisites

Before installation, ensure you have:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **pnpm** >= 8.0.0 (Install: `npm install -g pnpm`)
- **PostgreSQL** >= 15 ([Download](https://www.postgresql.org/download/))
- **Python** >= 3.9 ([Download](https://www.python.org/downloads/))
- **Git** ([Download](https://git-scm.com/downloads))

**Optional:**
- **Docker** & **Docker Compose** for containerized deployment
- **Redis** for caching

---

## ⚡ Quick Installation

### One-Command Install (Recommended)

```bash
# Clone the repository
git clone https://github.com/JoshMith/Digiheal-backend.git
cd Digiheal-backend

# Install ALL dependencies at once (Node.js + Python)
pnpm install && cd ml_service && pip install -r requirements.txt && cd ..
```

### Alternative: Use Installation Script

```bash
# Make script executable
chmod +x install.sh

# Run automated installation
./install.sh
```

The script will:
- ✅ Check all prerequisites
- ✅ Install Node.js dependencies
- ✅ Install Python dependencies (virtual environment)
- ✅ Setup environment file
- ✅ Generate Prisma client
- ✅ Optionally setup database
- ✅ Create necessary directories

---

## ⚙️ Configuration

### 1. Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings
nano .env  # or use your preferred editor
```

### 2. Required Configuration

```env
# Database
DATABASE_URL="postgresql://dkut_user:dkut_password@localhost:5432/dkut_medical"

# Server
PORT=3000
NODE_ENV=development

# ML Service
ML_API_URL=http://localhost:5000

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-app-password
EMAIL_FROM="DKUT Medical <noreply@dkut-medical.ac.ke>"
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb dkut_medical

# Or using psql
psql -U postgres
CREATE DATABASE dkut_medical;
\q

# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Optional: Seed with test data
pnpm prisma:seed
```

---

## 🏃 Running the Application

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

**Terminal 3 - Prisma Studio (Optional):**
```bash
pnpm prisma:studio
# Database GUI on http://localhost:5555
```

### Production Mode

```bash
# Build TypeScript
pnpm build

# Start production server
pnpm start
```

### Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Monitor
pm2 monit

# Stop services
pm2 stop all
```

### Using Docker Compose

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

---

## 📚 API Documentation

### Interactive Documentation

Visit **http://localhost:3000/api-docs** when the server is running.

### Base URL

```
Development: http://localhost:3000/api/v1
Production:  https://api.dkut.ac.ke/api/v1
```

### Authentication

All protected routes require JWT token:

```bash
# Include in request headers
Authorization: Bearer <your-jwt-token>
```

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new patient
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/logout` - Logout

#### Health Assessments (ML Integration)
- `POST /api/v1/health-assessments` - Create assessment with ML prediction
- `GET /api/v1/health-assessments/:id` - Get assessment by ID
- `GET /api/v1/health-assessments/my` - Get my assessments
- `GET /api/v1/health-assessments/urgent` - Get urgent cases (Staff only)
- `GET /api/v1/health-assessments/stats` - Get statistics (Staff only)

#### Patients
- `POST /api/v1/patients` - Create patient profile
- `GET /api/v1/patients/:id` - Get patient by ID
- `GET /api/v1/patients/student/:studentId` - Get by student ID
- `PUT /api/v1/patients/:id` - Update patient
- `GET /api/v1/patients/:id/history` - Get medical history
- `GET /api/v1/patients/:id/stats` - Get statistics
- `GET /api/v1/patients` - Get all patients (Staff/Admin)

#### Appointments
- `POST /api/v1/appointments` - Create appointment
- `GET /api/v1/appointments/:id` - Get appointment
- `GET /api/v1/appointments/patient/:patientId` - Get patient appointments
- `PUT /api/v1/appointments/:id` - Update appointment
- `POST /api/v1/appointments/:id/check-in` - Check-in for appointment
- `POST /api/v1/appointments/:id/cancel` - Cancel appointment
- `GET /api/v1/appointments/department/:dept/today` - Today's queue
- `GET /api/v1/appointments/slots/available` - Available time slots

#### Staff
- `POST /api/v1/staff` - Create staff (Admin only)
- `GET /api/v1/staff` - Get all staff
- `GET /api/v1/staff/:id` - Get staff by ID
- `PUT /api/v1/staff/:id` - Update staff
- `PATCH /api/v1/staff/:id/availability` - Toggle availability
- `GET /api/v1/staff/:id/schedule` - Get schedule
- `GET /api/v1/staff/:id/stats` - Get statistics

#### Consultations
- `POST /api/v1/consultations` - Create consultation record
- `GET /api/v1/consultations/:id` - Get consultation
- `GET /api/v1/consultations/patient/:patientId` - Get patient consultations

#### Health Check
- `GET /api/v1/health` - API health status

### Example Request

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@dkut.ac.ke",
    "password": "patient123"
  }'

# Create Health Assessment
curl -X POST http://localhost:3000/api/v1/health-assessments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "symptoms": ["fever", "cough", "headache"],
    "additionalInfo": {
      "age": 22,
      "gender": "MALE",
      "duration": "3 days",
      "severity": "MODERATE"
    }
  }'
```

---

## 🗄️ Database Schema

### Overview
15 tables with comprehensive relationships and optimized indexes.

### Core Tables

#### 1. Users & Authentication
- `users` - Email, password, role (PATIENT/STAFF/ADMIN)

#### 2. Patient Management
- `patients` - Demographics, emergency contacts, insurance, medical info
- `health_assessments` - ML predictions, symptoms, urgency
- `vital_signs` - BP, heart rate, temperature, etc.

#### 3. Appointments & Consultations
- `appointments` - Scheduling, queue management, status
- `consultations` - Examination records, diagnosis, treatment
- `prescriptions` - Medication tracking

#### 4. Staff & Records
- `staff` - Medical staff profiles
- `medical_records` - Document storage
- `notifications` - Patient alerts

#### 5. System
- `system_settings` - Configuration
- `audit_logs` - Activity tracking

### Key Relationships

```
User (1) ───── (1) Patient
               │
               ├──── (∞) HealthAssessments
               ├──── (∞) Appointments
               ├──── (∞) Consultations
               ├──── (∞) Prescriptions
               └──── (∞) Notifications

Staff (1) ──── (∞) Appointments
          └──── (∞) Consultations

HealthAssessment (1) ── (∞) Appointments
```

### View Schema

```bash
# Open Prisma Studio
pnpm prisma:studio
# Opens http://localhost:5555
```

---

## 🧠 ML Integration

### Health Assessment Flow

```
User Symptoms → Backend Validation → ML Service
                                        ↓
                            Disease + Severity + Urgency
                                        ↓
                            PostgreSQL Storage
                                        ↓
                         Notifications (if urgent)
                                        ↓
                           Response to Frontend
```

### ML Service Features

- **Disease Prediction** - Identifies likely conditions from symptoms
- **Severity Scoring** - 0-100 scale
- **Urgency Classification** - LOW/MODERATE/URGENT
- **Recommendations** - Lifestyle and workout suggestions
- **Confidence Score** - Model certainty indicator

### ML API Endpoints

```bash
# Health check
GET http://localhost:5000/health

# Get model info
GET http://localhost:5000/info

# Predict disease
POST http://localhost:5000/predict
{
  "symptoms": ["fever", "cough"],
  "age": 25,
  "gender": "male",
  "duration": "3 days",
  "severity": "moderate"
}
```

### Response Format

```json
{
  "disease": "Common Cold",
  "severity_score": 35,
  "urgency": "LOW",
  "recommendations": [
    "Get plenty of rest (7-9 hours of sleep)",
    "Stay hydrated with warm fluids",
    "Light walking when feeling better"
  ],
  "confidence": 0.85
}
```

---

## 🚀 Deployment

### Option 1: VPS Deployment (Ubuntu)

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete instructions.

**Quick Steps:**
```bash
# On server
git clone <repo-url>
cd dkut-backend

# Install dependencies
pnpm install
cd ml_service && pip install -r requirements.txt && cd ..

# Configure environment
cp .env.example .env
nano .env

# Build and start
pnpm build
pm2 start ecosystem.config.js
```

### Option 2: Docker Deployment

```bash
# Production build
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f backend
```

### Option 3: Cloud Platforms

**Heroku:**
```bash
heroku create dkut-backend
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

**AWS/Azure/GCP:**
- Deploy as containerized application
- Use managed PostgreSQL service
- Configure environment variables
- Setup SSL/TLS

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test --coverage
```

### Test Credentials (After Seeding)

| Role    | Email                     | Password   |
|---------|---------------------------|------------|
| Admin   | admin@dkut.ac.ke          | admin123   |
| Doctor  | dr.mwangi@dkut.ac.ke      | staff123   |
| Nurse   | nurse.akinyi@dkut.ac.ke   | staff123   |
| Patient | student@dkut.ac.ke        | patient123 |

---

## 📁 Project Structure

```
dkut-backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts  # Prisma setup
│   │   ├── env.ts       # Environment validation
│   │   ├── redis.ts     # Redis connection
│   │   └── swagger.ts   # API documentation
│   │
│   ├── controllers/     # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── healthAssessment.controller.ts
│   │   ├── patient.controller.ts
│   │   ├── appointment.controller.ts
│   │   ├── staff.controller.ts
│   │   └── consultation.controller.ts
│   │
│   ├── middleware/      # Express middleware
│   │   ├── auth.ts      # JWT authentication
│   │   ├── validate.ts  # Request validation
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   │
│   ├── routes/          # API routes
│   │   ├── auth.routes.ts
│   │   ├── healthAssessment.routes.ts
│   │   ├── patient.routes.ts
│   │   ├── appointment.routes.ts
│   │   ├── staff.routes.ts
│   │   ├── consultation.routes.ts
│   │   └── index.ts
│   │
│   ├── services/        # Business logic
│   │   ├── ml.service.ts         # ML integration ⭐
│   │   ├── notification.service.ts
│   │   ├── patient.service.ts
│   │   └── appointment.service.ts
│   │
│   ├── utils/           # Utilities
│   │   ├── logger.ts    # Winston logger
│   │   ├── validators.ts # Zod schemas
│   │   └── helpers.ts   # Helper functions
│   │
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   │
│   └── server.ts        # Application entry
│
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Test data
│
├── ml_service/
│   ├── app.py           # Flask ML API
│   ├── model.pkl        # Trained model
│   ├── requirements.txt
│   └── Dockerfile
│
├── tests/               # Test files
├── logs/                # Application logs
├── uploads/             # File uploads
│
├── Configuration
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── ecosystem.config.js  # PM2
│   └── nginx.conf
│
└── Documentation
    ├── README.md
    ├── QUICK_START.md
    ├── DEPLOYMENT_GUIDE.md
    └── PROJECT_SUMMARY.md
```

---

## 📜 Available Scripts

```bash
# Development
pnpm dev                 # Start dev server with hot reload
pnpm build               # Build for production
pnpm start               # Start production server

# Database
pnpm prisma:generate     # Generate Prisma client
pnpm prisma:migrate      # Run database migrations
pnpm prisma:studio       # Open Prisma Studio GUI
pnpm prisma:seed         # Seed database with test data

# ML Service
pnpm ml:train            # Train ML model (if applicable)
pnpm ml:serve            # Start ML service

# Code Quality
pnpm lint                # Run ESLint
pnpm format              # Format with Prettier
pnpm test                # Run tests
pnpm test:watch          # Watch mode
pnpm test:coverage       # Coverage report
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation
- Run `pnpm lint` and `pnpm format` before committing

---

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -i :3000
kill -9 <PID>
```

**Database connection error:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify DATABASE_URL in .env
```

**ML service not responding:**
```bash
curl http://localhost:5000/health
cd ml_service && python app.py
```

**Prisma migration fails:**
```bash
pnpm prisma migrate reset
pnpm prisma migrate dev
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

**DKUT Medical Development Team**

- Project Lead: [Your Name]
- Backend Developer: [Your Name]
- ML Engineer: [Your Name]

---

## 🙏 Acknowledgments

- Dedan Kimathi University of Technology
- All contributors and testers
- Open source community

---

## 📞 Support

For support and queries:

- 📧 Email: support@dkut-medical.ac.ke
- 🐛 Issues: [GitHub Issues](https://github.com/JoshMith/Digiheal-backend/issues)
- 📖 Documentation: [Full Docs](./docs/)

---

## 🔗 Related Projects

- **Frontend Repository:** [Link to frontend repo]
- **Mobile App:** [Link to mobile repo]
- **Admin Dashboard:** [Link to admin repo]

---

**Made with ❤️ by DKUT Medical Team**