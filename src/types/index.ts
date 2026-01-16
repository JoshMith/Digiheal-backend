// ============================================
// User and Authentication Types
// ============================================

export interface User {
  id: string;
  email: string;
  password: string; // Changed from passwordHash to match frontend
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  patient?: Patient | null;
  staff?: Staff | null;
}

export enum UserRole {
  PATIENT = 'PATIENT',
  STAFF = 'STAFF', 
  ADMIN = 'ADMIN'
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  staffId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      email: string;
      role: UserRole;
    };
    profile?: Patient | Staff | null;
    token: string;
    refreshToken: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PatientRegistrationRequest {
  email: string;
  password: string;
  studentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  nationality?: string;
  address?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  insuranceProvider?: string;
  policyNumber?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
}

export interface StaffRegistrationRequest {
  email: string;
  password: string;
  staffId: string;
  firstName: string;
  lastName: string;
  department: Department;
  position: StaffPosition;
  phone: string;
  specialization?: string;
  licenseNumber?: string;
  qualifications?: string[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangeRoleRequest {
  newRole: UserRole;
}

// ============================================
// Patient Types
// ============================================

export interface Patient {
  id: string;
  userId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  phone: string;
  nationality?: string | null;
  address?: string | null;
  bloodGroup?: string | null;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactEmail?: string | null;
  insuranceProvider?: string | null;
  policyNumber?: string | null;
  profileImage?: string | null;
  createdAt: Date;
  user?: User;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

// ============================================
// Staff Types
// ============================================

export interface Staff {
  id: string;
  userId: string;
  staffId: string;
  firstName: string;
  lastName: string;
  department: Department;
  position: StaffPosition;
  specialization?: string | null;
  licenseNumber?: string | null;
  phone: string;
  qualifications: string[];
  isAvailable: boolean;
  profileImage?: string | null;
  createdAt: Date;
  user?: User;
}

export type Department = 
  | 'GENERAL_MEDICINE'
  | 'EMERGENCY'
  | 'PEDIATRICS'
  | 'MENTAL_HEALTH'
  | 'DENTAL'
  | 'PHARMACY'
  | 'LABORATORY';

export type StaffPosition = 
  | 'DOCTOR'
  | 'NURSE'
  | 'PHARMACIST'
  | 'LAB_TECHNICIAN'
  | 'ADMINISTRATOR'
  | 'RECEPTIONIST';

// ============================================
// Appointment Types
// ============================================

export interface Appointment {
  id: string;
  patientId: string;
  staffId?: string | null;
  appointmentDate: Date;
  appointmentTime: string;
  duration: number;
  department: Department;
  type: AppointmentType;
  status: AppointmentStatus;
  priority: PriorityLevel;
  queueNumber?: number | null;
  reason?: string | null;
  notes?: string | null;
  checkedInAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  patient?: Patient;
  staff?: Staff | null;
  prescriptions?: Prescription[];
  interaction?: Interaction | null;
}

export type AppointmentType = 
  | 'WALK_IN'
  | 'SCHEDULED'
  | 'FOLLOW_UP'
  | 'EMERGENCY'
  | 'ROUTINE_CHECKUP';

export type AppointmentStatus = 
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type PriorityLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface CreateAppointmentRequest {
  patientId?: string;
  staffId?: string;
  appointmentDate: string;
  appointmentTime: string;
  duration?: number;
  department: Department;
  type: AppointmentType;
  priority?: PriorityLevel;
  reason?: string;
  notes?: string;
}

// ============================================
// Prescription Types
// ============================================

export interface Prescription {
  id: string;
  patientId: string;
  staffId: string;
  appointmentId?: string | null;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity?: number | null;
  instructions?: string | null;
  status: PrescriptionStatus;
  prescribedAt: Date;
  expiresAt?: Date | null;
  dispensedAt?: Date | null;
  createdAt: Date;
  patient?: Patient;
  staff?: Staff;
  appointment?: Appointment | null;
}

export type PrescriptionStatus = 'ACTIVE' | 'DISPENSED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface CreatePrescriptionRequest {
  patientId: string;
  staffId: string;
  appointmentId?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity?: number;
  instructions?: string;
  expiresAt?: string;
}

// ============================================
// Interaction (Time Tracking) Types
// ============================================

export interface Interaction {
  id: string;
  appointmentId: string;
  patientId: string;
  staffId: string;
  department: Department;
  priority: PriorityLevel;
  appointmentType: AppointmentType;
  symptomCount: number;

  // Time tracking phases
  checkInTime: Date;
  vitalsStartTime?: Date | null;
  vitalsEndTime?: Date | null;
  interactionStartTime?: Date | null;
  interactionEndTime?: Date | null;
  checkoutTime?: Date | null;

  // Calculated durations (in minutes)
  vitalsDuration?: number | null;
  interactionDuration?: number | null;
  totalDuration?: number | null;

  // ML prediction
  predictedDuration?: number | null;

  createdAt: Date;
  
  appointment?: Appointment;
  patient?: Patient;
  staff?: Staff;
}

export interface StartInteractionRequest {
  appointmentId: string;
  patientId: string;
  staffId: string;
  department: Department;
  priority: PriorityLevel;
  appointmentType: AppointmentType;
  symptomCount?: number;
}

export interface UpdateInteractionRequest {
  vitalsStartTime?: string;
  vitalsEndTime?: string;
  interactionStartTime?: string;
  interactionEndTime?: string;
  checkoutTime?: string;
}

export type InteractionPhase = 
  | 'CHECKED_IN'
  | 'VITALS_IN_PROGRESS'
  | 'VITALS_COMPLETE'
  | 'INTERACTION_IN_PROGRESS'
  | 'COMPLETED';

// ============================================
// Vital Signs Types
// ============================================

export interface VitalSigns {
  id: string;
  patientId: string;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  temperature?: number | null;
  weight?: number | null;
  height?: number | null;
  oxygenSaturation?: number | null;
  respiratoryRate?: number | null;
  recordedAt: Date;
  patient?: Patient;
}

export interface CreateVitalSignsRequest {
  patientId: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: string;
  patientId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: PriorityLevel;
  read: boolean;
  readAt?: Date | null;
  createdAt: Date;
  patient?: Patient;
}

export type NotificationType = 
  | 'APPOINTMENT_REMINDER'
  | 'PRESCRIPTION_READY'
  | 'MEDICATION_REMINDER'
  | 'SYSTEM_ANNOUNCEMENT';

// ============================================
// Analytics Types
// ============================================

export interface AnalyticsSummary {
  totalPatients: number;
  todayPatients: number;
  weekPatients: number;
  monthPatients: number;
  averageWaitTime: number;
  averageInteractionDuration: number;
  appointmentCompletionRate: number;
  noShowRate: number;
}

export interface DepartmentStats {
  department: Department;
  patientCount: number;
  averageWaitTime: number;
  averageInteractionTime: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface AppointmentTypeStats {
  type: AppointmentType;
  count: number;
  percentage: number;
}

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  patientsServed: number;
  averageInteractionTime: number;
}

export interface MLPredictionStats {
  totalPredictions: number;
  accuracyRate: number;
  averageError: number;
}

// ============================================
// ML Service Types
// ============================================

export interface MLPredictionRequest {
  department: string;
  priority: string;
  appointmentType: string;
  symptomCount: number;
  timeOfDay?: number;
  dayOfWeek?: number;
}

export interface MLPredictionResponse {
  predictedDuration: number;
  confidence: number;
  modelVersion: string;
}

// ============================================
// Queue Types
// ============================================

export interface QueueItem {
  interaction: Interaction;
  appointment: Appointment;
  patient: Patient;
  estimatedWaitTime?: number;
  position: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
  meta?: PaginationMeta;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  department?: Department;
  priority?: PriorityLevel;
  search?: string;
  [key: string]: unknown;
}

// ============================================
// Display Helper Types (for UI mapping)
// ============================================

export const DEPARTMENT_DISPLAY: Record<Department, string> = {
  GENERAL_MEDICINE: 'General Medicine',
  EMERGENCY: 'Emergency',
  PEDIATRICS: 'Pediatrics',
  MENTAL_HEALTH: 'Mental Health',
  DENTAL: 'Dental',
  PHARMACY: 'Pharmacy',
  LABORATORY: 'Laboratory',
};

export const POSITION_DISPLAY: Record<StaffPosition, string> = {
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  PHARMACIST: 'Pharmacist',
  LAB_TECHNICIAN: 'Lab Technician',
  ADMINISTRATOR: 'Administrator',
  RECEPTIONIST: 'Receptionist',
};

export const GENDER_DISPLAY: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};

export const APPOINTMENT_STATUS_DISPLAY: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Scheduled',
  CHECKED_IN: 'Checked In',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

export const APPOINTMENT_TYPE_DISPLAY: Record<AppointmentType, string> = {
  WALK_IN: 'Walk-in',
  SCHEDULED: 'Scheduled',
  FOLLOW_UP: 'Follow-up',
  EMERGENCY: 'Emergency',
  ROUTINE_CHECKUP: 'Routine Checkup',
};

export const PRIORITY_DISPLAY: Record<PriorityLevel, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const PRESCRIPTION_STATUS_DISPLAY: Record<PrescriptionStatus, string> = {
  ACTIVE: 'Active',
  DISPENSED: 'Dispensed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

export const NOTIFICATION_TYPE_DISPLAY: Record<NotificationType, string> = {
  APPOINTMENT_REMINDER: 'Appointment Reminder',
  PRESCRIPTION_READY: 'Prescription Ready',
  MEDICATION_REMINDER: 'Medication Reminder',
  SYSTEM_ANNOUNCEMENT: 'System Announcement',
};

// ============================================
// Express Request Extension
// ============================================

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export {};