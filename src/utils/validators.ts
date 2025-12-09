import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)');

export const phoneSchema = z
  .string()
  .regex(/^(\+254|0)[17]\d{8}$/, 'Invalid Kenyan phone number');

export const studentIdSchema = z
  .string()
  .regex(/^DKUT\/\d{4}\/\d{5}$/, 'Invalid student ID format (e.g., DKUT/2024/12345)');

export const dateSchema = z.string().refine((date) => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}, 'Invalid date format');

export const uuidSchema = z.string().uuid('Invalid UUID format');

// Health Assessment validation
export const healthAssessmentSchema = z.object({
  symptoms: z.array(z.string()).min(1, 'At least one symptom is required'),
  additionalInfo: z.object({
    age: z.number().int().min(0).max(150).optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    duration: z.string().optional(),
    severity: z.enum(['MILD', 'MODERATE', 'SEVERE']).optional(),
    notes: z.string().optional(),
  }).optional(),
});

// Appointment validation
export const createAppointmentSchema = z.object({
  appointmentDate: dateSchema,
  appointmentTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  department: z.enum([
    'GENERAL_MEDICINE',
    'CARDIOLOGY',
    'DERMATOLOGY',
    'ORTHOPEDICS',
    'GYNECOLOGY',
    'PEDIATRICS',
    'MENTAL_HEALTH',
    'EMERGENCY',
  ]),
  appointmentType: z.enum(['CONSULTATION', 'FOLLOW_UP', 'CHECK_UP', 'EMERGENCY', 'VACCINATION']),
  chiefComplaint: z.string().min(5, 'Chief complaint must be at least 5 characters'),
  symptoms: z.array(z.string()).optional(),
  notes: z.string().optional(),
  healthAssessmentId: uuidSchema.optional(),
});

// Patient registration validation
export const patientRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  studentId: studentIdSchema,
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  dateOfBirth: dateSchema,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  phone: phoneSchema,
  nationality: z.string().min(2).max(50).optional(),
  address: z.string().min(5).max(200).optional(),
  bloodGroup: z.enum([
    'A_POSITIVE',
    'A_NEGATIVE',
    'B_POSITIVE',
    'B_NEGATIVE',
    'AB_POSITIVE',
    'AB_NEGATIVE',
    'O_POSITIVE',
    'O_NEGATIVE',
  ]).optional(),
  emergencyContactName: z.string().min(2).max(50).optional(),
  emergencyContactRelationship: z.string().min(2).max(50).optional(),
  emergencyContactPhone: phoneSchema.optional(),
  emergencyContactEmail: emailSchema.optional(),
  insuranceProvider: z.string().min(2).max(50).optional(),
  policyNumber: z.string().min(2).max(50).optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
});

// Login validation
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Prescription validation
export const prescriptionSchema = z.object({
  medicationName: z.string().min(2, 'Medication name is required').max(100),
  dosage: z.string().min(1, 'Dosage is required').max(50),
  frequency: z.string().min(1, 'Frequency is required').max(50),
  duration: z.string().min(1, 'Duration is required').max(50),
  instructions: z.string().max(500).optional(),
});

// Vital signs validation
export const vitalSignsSchema = z.object({
  bloodPressureSystolic: z.number().int().min(60).max(250).optional(),
  bloodPressureDiastolic: z.number().int().min(40).max(150).optional(),
  heartRate: z.number().int().min(30).max(220).optional(),
  temperature: z.number().min(35).max(42).optional(),
  weight: z.number().min(0).max(300).optional(),
  height: z.number().min(0).max(250).optional(),
  oxygenSaturation: z.number().int().min(0).max(100).optional(),
  respiratoryRate: z.number().int().min(8).max(40).optional(),
});

// Consultation validation - FIXED: Use proper record syntax
export const consultationSchema = z.object({
  chiefComplaint: z.string().min(5, 'Chief complaint is required').max(500),
  historyOfPresentIllness: z.string().max(2000).optional(),
  physicalExamination: z.record(z.string(), z.any()).optional(), // Fixed: specify both key and value types
  primaryDiagnosis: z.string().max(500).optional(),
  differentialDiagnosis: z.array(z.string()).optional(),
  clinicalAssessment: z.string().max(2000).optional(),
  treatmentPlan: z.string().max(2000).optional(),
  followUpInstructions: z.string().max(1000).optional(),
});

// Alternative approach for dynamic objects - use object with passthrough
export const dynamicObjectSchema = z.object({}).passthrough();

// User registration validation
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['PATIENT', 'STAFF', 'ADMIN']).default('PATIENT'),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  phone: phoneSchema.optional(),
});

// Update profile validation
export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: phoneSchema.optional(),
  dateOfBirth: dateSchema.optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  address: z.string().max(200).optional(),
});

// Change password validation
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Medical record validation
export const medicalRecordSchema = z.object({
  diagnosis: z.string().min(2, 'Diagnosis is required').max(500),
  symptoms: z.array(z.string()).optional(),
  treatment: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  followUpDate: dateSchema.optional(),
});

// Helper function to validate data
export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

// Helper to get validation errors - MINIMAL FIX
export const getValidationErrors = (error: z.ZodError<any>) => {
  return error.errors.map((err: any) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
};
// Safe validation (doesn't throw)
export const safeValidate = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  return schema.safeParse(data);
};

// Extract types from schemas
export type PatientRegistration = z.infer<typeof patientRegistrationSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type AppointmentData = z.infer<typeof createAppointmentSchema>;
export type PrescriptionData = z.infer<typeof prescriptionSchema>;
export type VitalSignsData = z.infer<typeof vitalSignsSchema>;
export type ConsultationData = z.infer<typeof consultationSchema>;
export type HealthAssessmentData = z.infer<typeof healthAssessmentSchema>;
export type UserRegistrationData = z.infer<typeof userRegistrationSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type MedicalRecordData = z.infer<typeof medicalRecordSchema>;