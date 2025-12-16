import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './env';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'DKUT Medical Center API',
    version: '1.0.0',
    description: 'API documentation for DKUT Medical Center Digital Health Management System',
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
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'object' } },
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
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
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
  ],
};

const options: swaggerJSDoc.Options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);