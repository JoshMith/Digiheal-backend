import { z } from "zod";
import { ApiError } from "../middleware/errorHandler";
import { Gender, BloodGroup, Department, StaffPosition, AppointmentType, Priority, AppointmentStatus } from '@prisma/client';


/**
 * Validation helper function
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    const errorMessage = `Validation failed: ${JSON.stringify(errors)}`;
    throw new ApiError(400, errorMessage, true);
  }
  return result.data;
}

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const patientRegistrationSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  studentId: z
    .string()
    .min(1, "Student ID is required")
    .regex(/^[A-Z0-9/-]+$/i, "Invalid student ID format"),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  dateOfBirth: z.string().refine(
    (date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime()) && parsed < new Date();
    },
    { message: "Invalid date of birth" }
  ),
  gender: z.nativeEnum(Gender),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .regex(/^[+]?[\d\s-]+$/, "Invalid phone number format"),
  nationality: z.string().max(50).optional(),
  address: z.string().max(255).optional(),
  bloodGroup: z.nativeEnum(BloodGroup).optional().nullable(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactRelationship: z.string().max(50).optional(),
  emergencyContactPhone: z
    .string()
    .regex(/^[+]?[\d\s-]+$/, "Invalid phone number format")
    .optional(),
  emergencyContactEmail: z.string().email().optional(),
  insuranceProvider: z.string().max(100).optional(),
  policyNumber: z.string().max(50).optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
});

export const staffRegistrationSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  staffId: z
    .string()
    .min(1, "Staff ID is required")
    .regex(/^[A-Z0-9/-]+$/i, "Invalid staff ID format"),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  department: z.nativeEnum(Department),
  position: z.nativeEnum(StaffPosition),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .regex(/^[+]?[\d\s-]+$/, "Invalid phone number format"),
  specialization: z.string().max(100).optional(),
  licenseNumber: z.string().max(50).optional(),
  qualifications: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// Patient Schemas
// ============================================

export const updatePatientSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z
    .string()
    .min(10)
    .regex(/^[+]?[\d\s-]+$/)
    .optional(),
  nationality: z.string().max(50).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional()
    .nullable(),
  emergencyContactName: z.string().max(100).optional().nullable(),
  emergencyContactRelationship: z.string().max(50).optional().nullable(),
  emergencyContactPhone: z
    .string()
    .regex(/^[+]?[\d\s-]+$/)
    .optional()
    .nullable(),
  emergencyContactEmail: z.string().email().optional().nullable(),
  insuranceProvider: z.string().max(100).optional().nullable(),
  policyNumber: z.string().max(50).optional().nullable(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
});

// ============================================
// Staff Schemas
// ============================================

export const updateStaffSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z
    .string()
    .min(10)
    .regex(/^[+]?[\d\s-]+$/)
    .optional(),
  specialization: z.string().max(100).optional().nullable(),
  licenseNumber: z.string().max(50).optional().nullable(),
  qualifications: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// Appointment Schemas
// ============================================

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid().optional(), // Optional if patient is creating for themselves
  staffId: z.string().uuid().optional(),
  healthAssessmentId: z.string().uuid().optional(),
  appointmentDate: z.string().refine(
    (date) => {
      const parsed = new Date(date);
      return (
        !isNaN(parsed.getTime()) &&
        parsed >= new Date(new Date().setHours(0, 0, 0, 0))
      );
    },
    { message: "Appointment date must be today or in the future" }
  ),
  appointmentTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  duration: z.number().min(15).max(120).optional().default(30),
  department: z.nativeEnum(Department),
  appointmentType: z.nativeEnum(AppointmentType),
  priority: z.nativeEnum(Priority).optional().default("NORMAL"),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateAppointmentSchema = z.object({
  staffId: z.string().uuid().optional().nullable(),
  appointmentDate: z
    .string()
    .refine(
      (date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
      },
      { message: "Invalid date format" }
    )
    .optional(),
  appointmentTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  duration: z.number().min(15).max(120).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  reason: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  cancellationReason: z.string().max(500).optional(),
});

// ============================================
// Health Assessment Schemas
// ============================================

export const healthAssessmentSchema = z.object({
  symptoms: z.array(z.string()).min(1, "At least one symptom is required"),
  age: z.number().min(0).max(150).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  duration: z.string().optional(),
  severity: z.enum(["MILD", "MODERATE", "SEVERE"]).optional(),
  additionalNotes: z.string().max(1000).optional(),
});

// ============================================
// Consultation Schemas
// ============================================

export const createConsultationSchema = z.object({
  appointmentId: z.string().uuid(),
  chiefComplaint: z.string().min(1, "Chief complaint is required").max(500),
  historyOfPresentIllness: z.string().max(2000).optional(),
  physicalExamination: z.record(z.unknown()).optional(),
  primaryDiagnosis: z.string().min(1, "Primary diagnosis is required").max(500),
  differentialDiagnosis: z.array(z.string()).optional().default([]),
  clinicalAssessment: z.string().max(2000).optional(),
  treatmentPlan: z.string().max(2000).optional(),
  followUpInstructions: z.string().max(1000).optional(),
  consultationNotes: z.string().max(2000).optional(),
});

export const updateConsultationSchema = z.object({
  chiefComplaint: z.string().min(1).max(500).optional(),
  historyOfPresentIllness: z.string().max(2000).optional().nullable(),
  physicalExamination: z.record(z.unknown()).optional().nullable(),
  primaryDiagnosis: z.string().min(1).max(500).optional(),
  differentialDiagnosis: z.array(z.string()).optional(),
  clinicalAssessment: z.string().max(2000).optional().nullable(),
  treatmentPlan: z.string().max(2000).optional().nullable(),
  followUpInstructions: z.string().max(1000).optional().nullable(),
  consultationNotes: z.string().max(2000).optional().nullable(),
});

// ============================================
// Vital Signs Schemas
// ============================================

export const createVitalSignsSchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  bloodPressureSystolic: z.number().min(50).max(300).optional(),
  bloodPressureDiastolic: z.number().min(30).max(200).optional(),
  heartRate: z.number().min(30).max(250).optional(),
  temperature: z.number().min(30).max(45).optional(),
  weight: z.number().min(1).max(500).optional(),
  height: z.number().min(30).max(300).optional(),
  oxygenSaturation: z.number().min(50).max(100).optional(),
  respiratoryRate: z.number().min(5).max(60).optional(),
  recordedAt: z.string().datetime().optional(),
});

// ============================================
// Prescription Schemas
// ============================================

export const createPrescriptionSchema = z.object({
  consultationId: z.string().uuid(),
  patientId: z.string().uuid(),
  medicationName: z.string().min(1, "Medication name is required").max(200),
  dosage: z.string().min(1, "Dosage is required").max(100),
  frequency: z.string().min(1, "Frequency is required").max(100),
  duration: z.string().min(1, "Duration is required").max(100),
  instructions: z.string().max(500).optional(),
});

// ============================================
// Pagination and Filter Schemas
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const dateRangeFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type PatientRegistrationInput = z.infer<
  typeof patientRegistrationSchema
>;
export type StaffRegistrationInput = z.infer<typeof staffRegistrationSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type HealthAssessmentInput = z.infer<typeof healthAssessmentSchema>;
export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;
export type CreateVitalSignsInput = z.infer<typeof createVitalSignsSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
