import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './env';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'DKUT Medical Center API',
    version: '1.0.0',
    description: `
## DKUT Medical Center - AI-Enhanced Healthcare Management System

This API provides endpoints for:
- **Patient Portal**: Registration, profile management, appointments, medical history
- **Staff Portal**: Patient management, scheduling, prescriptions, queue management
- **ML-Powered Duration Prediction**: Predict consultation times for better scheduling
- **Service Timeline Tracking**: Multi-phase interaction monitoring for ML training
- **Analytics Dashboard**: Real-time metrics, wait times, and staff performance

### Authentication
All protected endpoints require a Bearer token in the Authorization header.

### Test Credentials (after seeding)
- **Admin**: admin@dkut.ac.ke / admin123
- **Doctor**: dr.mwangi@dkut.ac.ke / staff123
- **Patient**: john.student@dkut.ac.ke / patient123
    `,
    contact: {
      name: 'DKUT Medical Team',
      email: 'support@dkut-medical.ac.ke',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `${config.app.url}${config.apiPrefix}`,
      description: config.isDevelopment ? 'Development server' : 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from login endpoint',
      },
    },
    schemas: {
      // ==========================================
      // Base Response Schemas
      // ==========================================
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error message' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 100 },
          totalPages: { type: 'integer', example: 10 },
        },
      },

      // ==========================================
      // Enums (matching Prisma schema)
      // ==========================================
      UserRole: {
        type: 'string',
        enum: ['PATIENT', 'STAFF', 'ADMIN'],
        description: 'User role in the system',
      },
      Gender: {
        type: 'string',
        enum: ['MALE', 'FEMALE', 'OTHER'],
      },
      Department: {
        type: 'string',
        enum: [
          'GENERAL_MEDICINE',
          'EMERGENCY',
          'PEDIATRICS',
          'MENTAL_HEALTH',
          'DENTAL',
          'PHARMACY',
          'LABORATORY',
        ],
      },
      StaffPosition: {
        type: 'string',
        enum: [
          'DOCTOR',
          'NURSE',
          'PHARMACIST',
          'LAB_TECHNICIAN',
          'ADMINISTRATOR',
          'RECEPTIONIST',
        ],
      },
      AppointmentType: {
        type: 'string',
        enum: ['WALK_IN', 'SCHEDULED', 'FOLLOW_UP', 'EMERGENCY', 'ROUTINE_CHECKUP'],
      },
      AppointmentStatus: {
        type: 'string',
        enum: ['SCHEDULED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
      },
      PriorityLevel: {
        type: 'string',
        enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      },
      PrescriptionStatus: {
        type: 'string',
        enum: ['ACTIVE', 'DISPENSED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
      },
      NotificationType: {
        type: 'string',
        enum: [
          'APPOINTMENT_REMINDER',
          'PRESCRIPTION_READY',
          'MEDICATION_REMINDER',
          'SYSTEM_ANNOUNCEMENT',
        ],
      },

      // ==========================================
      // Entity Schemas
      // ==========================================
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: { $ref: '#/components/schemas/UserRole' },
          isActive: { type: 'boolean' },
          lastLogin: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      Patient: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          studentId: { type: 'string', example: 'SCT221-0001/2021' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Kipchoge' },
          dateOfBirth: { type: 'string', format: 'date' },
          gender: { $ref: '#/components/schemas/Gender' },
          phone: { type: 'string', example: '+254712345678' },
          bloodGroup: { type: 'string', nullable: true, example: 'O_POSITIVE' },
          allergies: {
            type: 'array',
            items: { type: 'string' },
            example: ['Penicillin'],
          },
          chronicConditions: {
            type: 'array',
            items: { type: 'string' },
            example: ['Asthma'],
          },
          emergencyContactName: { type: 'string', nullable: true },
          emergencyContactPhone: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      Staff: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          staffId: { type: 'string', example: 'STF-001' },
          firstName: { type: 'string', example: 'James' },
          lastName: { type: 'string', example: 'Mwangi' },
          department: { $ref: '#/components/schemas/Department' },
          position: { $ref: '#/components/schemas/StaffPosition' },
          specialization: { type: 'string', nullable: true, example: 'Internal Medicine' },
          licenseNumber: { type: 'string', nullable: true, example: 'KMD-12345' },
          phone: { type: 'string', example: '+254712345678' },
          isAvailable: { type: 'boolean', default: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          staffId: { type: 'string', format: 'uuid', nullable: true },
          appointmentDate: { type: 'string', format: 'date' },
          appointmentTime: { type: 'string', example: '09:00' },
          duration: { type: 'integer', default: 30, example: 30 },
          department: { $ref: '#/components/schemas/Department' },
          type: { $ref: '#/components/schemas/AppointmentType' },
          status: { $ref: '#/components/schemas/AppointmentStatus' },
          priority: { $ref: '#/components/schemas/PriorityLevel' },
          queueNumber: { type: 'integer', nullable: true },
          reason: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          checkedInAt: { type: 'string', format: 'date-time', nullable: true },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          cancelledAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      Prescription: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          staffId: { type: 'string', format: 'uuid' },
          appointmentId: { type: 'string', format: 'uuid', nullable: true },
          medicationName: { type: 'string', example: 'Paracetamol' },
          dosage: { type: 'string', example: '500mg' },
          frequency: { type: 'string', example: 'Twice daily' },
          duration: { type: 'string', example: '7 days' },
          quantity: { type: 'integer', nullable: true, example: 14 },
          instructions: { type: 'string', nullable: true, example: 'Take with food' },
          status: { $ref: '#/components/schemas/PrescriptionStatus' },
          prescribedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          dispensedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      Interaction: {
        type: 'object',
        description: 'Service timeline record tracking consultation phases for ML duration prediction training',
        properties: {
          id: { type: 'string', format: 'uuid' },
          appointmentId: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          staffId: { type: 'string', format: 'uuid' },
          department: { $ref: '#/components/schemas/Department' },
          priority: { $ref: '#/components/schemas/PriorityLevel' },
          appointmentType: { $ref: '#/components/schemas/AppointmentType' },
          symptomCount: { type: 'integer', default: 0 },
          checkInTime: { type: 'string', format: 'date-time' },
          vitalsStartTime: { type: 'string', format: 'date-time', nullable: true },
          vitalsEndTime: { type: 'string', format: 'date-time', nullable: true },
          interactionStartTime: { type: 'string', format: 'date-time', nullable: true },
          interactionEndTime: { type: 'string', format: 'date-time', nullable: true },
          checkoutTime: { type: 'string', format: 'date-time', nullable: true },
          vitalsDuration: {
            type: 'integer',
            nullable: true,
            description: 'Duration in minutes',
          },
          interactionDuration: {
            type: 'integer',
            nullable: true,
            description: 'Duration in minutes',
          },
          totalDuration: {
            type: 'integer',
            nullable: true,
            description: 'Total duration in minutes',
          },
          predictedDuration: {
            type: 'integer',
            nullable: true,
            description: 'ML predicted duration in minutes',
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      VitalSigns: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          bloodPressureSystolic: { type: 'integer', nullable: true, example: 120 },
          bloodPressureDiastolic: { type: 'integer', nullable: true, example: 80 },
          heartRate: { type: 'integer', nullable: true, example: 72 },
          temperature: { type: 'number', nullable: true, example: 36.6 },
          weight: { type: 'number', nullable: true, example: 70 },
          height: { type: 'number', nullable: true, example: 175 },
          oxygenSaturation: { type: 'integer', nullable: true, example: 98 },
          respiratoryRate: { type: 'integer', nullable: true, example: 16 },
          recordedAt: { type: 'string', format: 'date-time' },
        },
      },

      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          type: { $ref: '#/components/schemas/NotificationType' },
          title: { type: 'string' },
          message: { type: 'string' },
          priority: { $ref: '#/components/schemas/PriorityLevel' },
          read: { type: 'boolean', default: false },
          readAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ==========================================
      // Request Schemas
      // ==========================================
      PatientRegistrationRequest: {
        type: 'object',
        required: [
          'email',
          'password',
          'studentId',
          'firstName',
          'lastName',
          'dateOfBirth',
          'gender',
          'phone',
        ],
        properties: {
          email: { type: 'string', format: 'email', example: 'student@dkut.ac.ke' },
          password: { type: 'string', minLength: 8, example: 'password123' },
          studentId: { type: 'string', example: 'SCT221-0001/2021' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Kipchoge' },
          dateOfBirth: { type: 'string', format: 'date', example: '2000-05-15' },
          gender: { $ref: '#/components/schemas/Gender' },
          phone: { type: 'string', example: '+254712345678' },
          bloodGroup: { type: 'string', example: 'O_POSITIVE' },
          emergencyContactName: { type: 'string', example: 'Jane Kipchoge' },
          emergencyContactPhone: { type: 'string', example: '+254700123456' },
          allergies: {
            type: 'array',
            items: { type: 'string' },
            example: ['Penicillin'],
          },
          chronicConditions: {
            type: 'array',
            items: { type: 'string' },
            example: [],
          },
        },
      },

      StaffRegistrationRequest: {
        type: 'object',
        required: [
          'email',
          'password',
          'staffId',
          'firstName',
          'lastName',
          'department',
          'position',
          'phone',
        ],
        properties: {
          email: { type: 'string', format: 'email', example: 'dr.mwangi@dkut.ac.ke' },
          password: { type: 'string', minLength: 8, example: 'staff123' },
          staffId: { type: 'string', example: 'STF-001' },
          firstName: { type: 'string', example: 'James' },
          lastName: { type: 'string', example: 'Mwangi' },
          department: { $ref: '#/components/schemas/Department' },
          position: { $ref: '#/components/schemas/StaffPosition' },
          phone: { type: 'string', example: '+254712345678' },
          specialization: { type: 'string', example: 'Internal Medicine' },
          licenseNumber: { type: 'string', example: 'KMD-12345' },
        },
      },

      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@dkut.ac.ke' },
          password: { type: 'string', example: 'admin123' },
        },
      },

      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login successful' },
          data: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string', format: 'email' },
                  role: { $ref: '#/components/schemas/UserRole' },
                },
              },
              profile: {
                oneOf: [
                  { $ref: '#/components/schemas/Patient' },
                  { $ref: '#/components/schemas/Staff' },
                ],
              },
              token: { type: 'string', description: 'JWT access token' },
              refreshToken: { type: 'string', description: 'JWT refresh token' },
            },
          },
        },
      },

      CreateAppointmentRequest: {
        type: 'object',
        required: [
          'patientId',
          'appointmentDate',
          'appointmentTime',
          'department',
          'type',
          'reason',
        ],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          staffId: { type: 'string', format: 'uuid' },
          appointmentDate: { type: 'string', format: 'date', example: '2025-01-20' },
          appointmentTime: { type: 'string', example: '09:00' },
          duration: { type: 'integer', default: 30, minimum: 15, maximum: 180 },
          department: { $ref: '#/components/schemas/Department' },
          type: { $ref: '#/components/schemas/AppointmentType' },
          priority: { $ref: '#/components/schemas/PriorityLevel' },
          reason: { type: 'string', minLength: 5, example: 'Regular checkup' },
          notes: { type: 'string' },
        },
      },

      UpdateAppointmentRequest: {
        type: 'object',
        properties: {
          appointmentDate: { type: 'string', format: 'date' },
          appointmentTime: { type: 'string', example: '10:00' },
          status: { $ref: '#/components/schemas/AppointmentStatus' },
          staffId: { type: 'string', format: 'uuid' },
          notes: { type: 'string' },
        },
      },

      CancelAppointmentRequest: {
        type: 'object',
        required: ['cancellationReason'],
        properties: {
          cancellationReason: {
            type: 'string',
            minLength: 5,
            example: 'Unable to attend due to schedule conflict',
          },
        },
      },

      CreatePrescriptionRequest: {
        type: 'object',
        required: [
          'patientId',
          'staffId',
          'medicationName',
          'dosage',
          'frequency',
          'duration',
        ],
        properties: {
          patientId: { type: 'string', format: 'uuid' },
          staffId: { type: 'string', format: 'uuid' },
          appointmentId: { type: 'string', format: 'uuid' },
          medicationName: { type: 'string', example: 'Amoxicillin' },
          dosage: { type: 'string', example: '500mg' },
          frequency: { type: 'string', example: 'Three times daily' },
          duration: { type: 'string', example: '7 days' },
          quantity: { type: 'integer', example: 21 },
          instructions: {
            type: 'string',
            example: 'Take with food. Complete the full course.',
          },
        },
      },

      StartInteractionRequest: {
        type: 'object',
        required: ['appointmentId'],
        properties: {
          appointmentId: { type: 'string', format: 'uuid' },
        },
      },

      CreateVitalSignsRequest: {
        type: 'object',
        properties: {
          bloodPressureSystolic: { type: 'integer', minimum: 50, maximum: 300 },
          bloodPressureDiastolic: { type: 'integer', minimum: 30, maximum: 200 },
          heartRate: { type: 'integer', minimum: 30, maximum: 250 },
          temperature: { type: 'number', minimum: 30, maximum: 45 },
          weight: { type: 'number', minimum: 1, maximum: 500 },
          height: { type: 'number', minimum: 30, maximum: 300 },
          oxygenSaturation: { type: 'integer', minimum: 50, maximum: 100 },
          respiratoryRate: { type: 'integer', minimum: 5, maximum: 60 },
        },
      },

      // ==========================================
      // ML Service Schemas (Duration Prediction)
      // ==========================================
      MLPredictionRequest: {
        type: 'object',
        description: 'Request body for predicting consultation duration',
        required: ['department', 'priority', 'appointmentType'],
        properties: {
          department: { 
            $ref: '#/components/schemas/Department',
            description: 'Department affects base consultation time',
          },
          priority: { 
            $ref: '#/components/schemas/PriorityLevel',
            description: 'Higher priority typically means longer consultations',
          },
          appointmentType: { 
            $ref: '#/components/schemas/AppointmentType',
            description: 'Type of appointment (walk-in, scheduled, emergency, etc.)',
          },
          symptomCount: { 
            type: 'integer', 
            default: 1,
            description: 'Number of symptoms reported - more symptoms = longer consultation',
          },
          timeOfDay: { 
            type: 'integer', 
            minimum: 0, 
            maximum: 23,
            description: 'Hour of day (0-23). Morning consultations tend to be faster.',
          },
          dayOfWeek: { 
            type: 'integer', 
            minimum: 0, 
            maximum: 6,
            description: 'Day of week (0=Sunday, 6=Saturday)',
          },
        },
      },

      MLPredictionResponse: {
        type: 'object',
        description: 'Predicted consultation duration from ML service',
        properties: {
          predictedDuration: {
            type: 'integer',
            description: 'Predicted consultation duration in minutes',
            example: 25,
          },
          confidence: { 
            type: 'number', 
            minimum: 0, 
            maximum: 1, 
            example: 0.75,
            description: 'Model confidence score (0-1). Lower for heuristic fallback.',
          },
          modelVersion: { 
            type: 'string', 
            example: 'v0.1-heuristic',
            description: 'Version of the prediction model used',
          },
        },
      },

      // ==========================================
      // Analytics Schemas
      // ==========================================
      DashboardMetrics: {
        type: 'object',
        description: 'Real-time dashboard metrics for medical center operations',
        properties: {
          totalPatientsToday: { type: 'integer', example: 45 },
          avgWaitTime: { type: 'number', example: 12.5, description: 'Average wait time in minutes' },
          avgInteractionTime: { type: 'number', example: 22.3, description: 'Average consultation duration in minutes' },
          totalAppointments: { type: 'integer', example: 50 },
          completedAppointments: { type: 'integer', example: 35 },
          noShowCount: { type: 'integer', example: 3 },
          noShowRate: { type: 'number', example: 6.0, description: 'Percentage of no-shows' },
          completionRate: { type: 'number', example: 70.0, description: 'Percentage of completed appointments' },
          mlAccuracy: { type: 'number', example: 82.5, description: 'ML duration prediction accuracy (predictions within 10 min of actual)' },
        },
      },

      PatientFlowData: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date', example: '2025-01-15' },
          patients: { type: 'integer', example: 42 },
          appointments: { type: 'integer', example: 45 },
        },
      },

      DepartmentLoadData: {
        type: 'object',
        properties: {
          department: { $ref: '#/components/schemas/Department' },
          appointments: { type: 'integer', example: 15 },
          interactions: { type: 'integer', example: 12 },
          utilization: { type: 'number', example: 80.0 },
        },
      },

      StaffPerformanceData: {
        type: 'object',
        properties: {
          staffId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Dr. James Mwangi' },
          department: { $ref: '#/components/schemas/Department' },
          position: { $ref: '#/components/schemas/StaffPosition' },
          totalPatients: { type: 'integer', example: 120 },
          avgDuration: { type: 'number', example: 22.5 },
          efficiency: { type: 'number', example: 2.7, description: 'Patients per hour' },
        },
      },

      PredictionAccuracyData: {
        type: 'object',
        description: 'ML consultation duration prediction accuracy metrics',
        properties: {
          overallAccuracy: { 
            type: 'number', 
            example: 82.5,
            description: 'Overall accuracy percentage (predictions within 10 min of actual)',
          },
          totalSamples: { 
            type: 'integer', 
            example: 500,
            description: 'Total interactions with both predicted and actual durations',
          },
          departmentStats: {
            type: 'array',
            description: 'Accuracy breakdown by department',
            items: {
              type: 'object',
              properties: {
                department: { $ref: '#/components/schemas/Department' },
                avgAccuracy: { type: 'number', example: 85.2 },
                sampleSize: { type: 'integer', example: 125 },
              },
            },
          },
          period: { type: 'string', example: '30 days' },
        },
      },

      // ==========================================
      // Available Time Slots Response
      // ==========================================
      AvailableSlotsResponse: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date' },
          department: { $ref: '#/components/schemas/Department' },
          availableSlots: {
            type: 'array',
            items: { type: 'string' },
            example: ['08:00', '08:30', '09:00', '10:30', '11:00'],
          },
          totalSlots: { type: 'integer', example: 18 },
          availableCount: { type: 'integer', example: 12 },
        },
      },

      // ==========================================
      // Queue Item
      // ==========================================
      QueueItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          patient: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              studentId: { type: 'string' },
            },
          },
          appointment: {
            type: 'object',
            properties: {
              reason: { type: 'string' },
              priority: { $ref: '#/components/schemas/PriorityLevel' },
            },
          },
          checkInTime: { type: 'string', format: 'date-time' },
          predictedDuration: { type: 'integer' },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: `
User authentication and authorization endpoints.

**Available Operations:**
- Patient registration
- Staff registration
- Login (returns JWT tokens)
- Profile management
- Password change
- Token refresh
      `,
    },
    {
      name: 'Patients',
      description: `
Patient profile and management endpoints.

**Features:**
- Create and update patient profiles
- View medical history
- Record vital signs
- Search patients (staff/admin only)
      `,
    },
    {
      name: 'Staff',
      description: `
Staff profile and management endpoints.

**Features:**
- Staff profile management
- Schedule viewing
- Availability status
- Performance statistics
      `,
    },
    {
      name: 'Appointments',
      description: `
Appointment scheduling, check-in, and management.

**Workflow:**
1. Book appointment → Status: SCHEDULED
2. Patient check-in → Status: CHECKED_IN
3. Start consultation → Status: IN_PROGRESS
4. Complete → Status: COMPLETED

**Features:**
- Available slot lookup
- Priority-based scheduling
- Queue number assignment
      `,
    },
    {
      name: 'Prescriptions',
      description: `
Prescription creation, dispensing, and tracking.

**Workflow:**
1. Create prescription → Status: ACTIVE
2. Dispense at pharmacy → Status: DISPENSED
3. Complete course → Status: COMPLETED

**Features:**
- Expiration tracking
- Medication reminders
- Prescription statistics
      `,
    },
    {
      name: 'Interactions',
      description: `
Service timeline tracking for ML-based consultation duration prediction.

**Phases Tracked:**
- Check-in time
- Vitals recording (start/end)
- Consultation (start/end)
- Checkout time

**Purpose:**
- Train ML models to predict consultation duration
- Calculate accurate wait time estimates for patients
- Identify bottlenecks in the consultation workflow
- Optimize appointment scheduling efficiency

**ML Training Data:**
Each completed interaction provides training data including:
- Department, priority, appointment type
- Symptom count, time of day, day of week
- Actual vs predicted duration for model improvement
      `,
    },
    {
      name: 'Analytics',
      description: `
Dashboard metrics, reports, and ML duration prediction accuracy.

**Available Metrics:**
- Daily patient flow and volumes
- Department utilization rates
- Staff performance and efficiency
- ML duration prediction accuracy
- Average wait times by department
- Consultation duration trends

**ML Model Performance:**
- Tracks predicted vs actual consultation durations
- Calculates overall model accuracy
- Department-specific accuracy breakdown
- Supports continuous model improvement
      `,
    },
  ],
};

const options: swaggerJSDoc.Options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);