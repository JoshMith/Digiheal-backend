import { z } from "zod";
import { ApiError } from "../middleware/errorHandler";
import { 
  Gender, 
  Department, 
  StaffPosition, 
  AppointmentType, 
  AppointmentStatus,
  PriorityLevel,
  PrescriptionStatus,
  NotificationType
} from '@prisma/client';

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
    .min(8, "Password must be at least 8 characters"),
  studentId: z
    .string()
    .min(1, "Student ID is required"),
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
    .min(10, "Phone number must be at least 10 characters"),
  bloodGroup: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  allergies: z.array(z.string()).optional().default([]),
  chronicConditions: z.array(z.string()).optional().default([]),
});

export const staffRegistrationSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  staffId: z
    .string()
    .min(1, "Staff ID is required"),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  department: z.nativeEnum(Department),
  position: z.nativeEnum(StaffPosition),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 characters"),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
});

// ============================================
// Patient Schemas
// ============================================

export const updatePatientSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().min(10).optional(),
  bloodGroup: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
});

// ============================================
// Staff Schemas
// ============================================

export const updateStaffSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().min(10).optional(),
  specialization: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  isAvailable: z.boolean().optional(),
});

// ============================================
// Appointment Schemas
// ============================================

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  appointmentDate: z.string().refine(
    (date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    },
    { message: "Invalid appointment date" }
  ),
  appointmentTime: z.string(),
  duration: z.number().min(15).max(120).optional().default(30),
  department: z.nativeEnum(Department),
  type: z.nativeEnum(AppointmentType),
  priority: z.nativeEnum(PriorityLevel).optional().default("NORMAL"),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAppointmentSchema = z.object({
  staffId: z.string().uuid().optional().nullable(),
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  duration: z.number().min(15).max(120).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  priority: z.nativeEnum(PriorityLevel).optional(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  queueNumber: z.number().optional(),
});

// ============================================
// Prescription Schemas
// ============================================

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  staffId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  medicationName: z.string().min(1, "Medication name is required").max(200),
  dosage: z.string().min(1, "Dosage is required").max(100),
  frequency: z.string().min(1, "Frequency is required").max(100),
  duration: z.string().min(1, "Duration is required").max(100),
  quantity: z.number().optional(),
  instructions: z.string().optional(),
  status: z.nativeEnum(PrescriptionStatus).optional().default("ACTIVE"),
});

export const updatePrescriptionSchema = z.object({
  medicationName: z.string().max(200).optional(),
  dosage: z.string().max(100).optional(),
  frequency: z.string().max(100).optional(),
  duration: z.string().max(100).optional(),
  quantity: z.number().optional(),
  instructions: z.string().optional(),
  status: z.nativeEnum(PrescriptionStatus).optional(),
});

// ============================================
// Interaction Schemas (Time Tracking)
// ============================================

export const startInteractionSchema = z.object({
  appointmentId: z.string().uuid(),
});

export const updateInteractionSchema = z.object({
  vitalsStartTime: z.string().datetime().optional(),
  vitalsEndTime: z.string().datetime().optional(),
  interactionStartTime: z.string().datetime().optional(),
  interactionEndTime: z.string().datetime().optional(),
  checkoutTime: z.string().datetime().optional(),
  symptomCount: z.number().min(0).optional(),
});

// ============================================
// Notification Schemas
// ============================================

export const createNotificationSchema = z.object({
  patientId: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(1000),
  priority: z.nativeEnum(PriorityLevel).default("NORMAL"),
});

// ============================================
// Vital Signs Schemas
// ============================================

export const createVitalSignsSchema = z.object({
  patientId: z.string().uuid(),
  bloodPressureSystolic: z.number().min(50).max(300).optional(),
  bloodPressureDiastolic: z.number().min(30).max(200).optional(),
  heartRate: z.number().min(30).max(250).optional(),
  temperature: z.number().min(30).max(45).optional(),
  weight: z.number().min(1).max(500).optional(),
  height: z.number().min(30).max(300).optional(),
  oxygenSaturation: z.number().min(50).max(100).optional(),
  respiratoryRate: z.number().min(5).max(60).optional(),
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
export type PatientRegistrationInput = z.infer<typeof patientRegistrationSchema>;
export type StaffRegistrationInput = z.infer<typeof staffRegistrationSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
export type StartInteractionInput = z.infer<typeof startInteractionSchema>;
export type UpdateInteractionInput = z.infer<typeof updateInteractionSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type CreateVitalSignsInput = z.infer<typeof createVitalSignsSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;