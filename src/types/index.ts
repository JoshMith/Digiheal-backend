// ============================================
// User and Authentication Types
// ============================================

export interface User {
  id: string;
  email: string;
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
  updatedAt: Date;
  user?: User;
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

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
  updatedAt: Date;
  user?: User;
}

export enum Department {
  GENERAL_MEDICINE = 'GENERAL_MEDICINE',
  EMERGENCY = 'EMERGENCY',
  PEDIATRICS = 'PEDIATRICS',
  MENTAL_HEALTH = 'MENTAL_HEALTH',
  DENTAL = 'DENTAL',
  OPHTHALMOLOGY = 'OPHTHALMOLOGY',
  PHARMACY = 'PHARMACY',
  LABORATORY = 'LABORATORY',
  RADIOLOGY = 'RADIOLOGY',
  NURSING = 'NURSING',
  ADMINISTRATION = 'ADMINISTRATION',
  CARDIOLOGY = 'CARDIOLOGY',
  DERMATOLOGY = 'DERMATOLOGY',
  ORTHOPEDICS = 'ORTHOPEDICS',
  GYNECOLOGY = 'GYNECOLOGY'
}

export enum StaffPosition {
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  RADIOLOGIST = 'RADIOLOGIST',
  ADMINISTRATOR = 'ADMINISTRATOR',
  RECEPTIONIST = 'RECEPTIONIST',
  SPECIALIST = 'SPECIALIST',
  CONSULTANT = 'CONSULTANT',
  INTERN = 'INTERN'
}

// ============================================
// Health Assessment Types
// ============================================

export interface HealthAssessment {
  id: string;
  patientId: string;
  symptoms: string[];
  predictedDisease: string;
  severityScore: number;
  urgency: UrgencyLevel;
  recommendations: string[];
  confidence?: number | null;
  additionalInfo?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  patient?: Patient;
}

export enum UrgencyLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  URGENT = 'URGENT'
}

export enum SymptomSeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE'
}

export interface MLPredictionRequest {
  symptoms: string[];
  age?: number;
  gender?: Gender;
  duration?: string;
  severity?: SymptomSeverity;
  additionalNotes?: string;
}

export interface MLPredictionResponse {
  disease: string;
  severity_score: number;
  urgency: UrgencyLevel;
  workouts: string[];
  confidence?: number;
}

// ============================================
// Appointment Types
// ============================================

export interface Appointment {
  id: string;
  patientId: string;
  staffId?: string | null;
  healthAssessmentId?: string | null;
  appointmentDate: Date;
  appointmentTime: string;
  duration: number;
  department: Department;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  priority: PriorityLevel;
  queueNumber?: number | null;
  estimatedWaitTime?: number | null;
  reason?: string | null;
  notes?: string | null;
  checkedInAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient?: Patient;
  staff?: Staff | null;
  healthAssessment?: HealthAssessment | null;
}

export enum AppointmentType {
  CONSULTATION = 'CONSULTATION',
  FOLLOW_UP = 'FOLLOW_UP',
  EMERGENCY = 'EMERGENCY',
  ROUTINE_CHECKUP = 'ROUTINE_CHECKUP',
  VACCINATION = 'VACCINATION',
  LAB_TEST = 'LAB_TEST',
  IMAGING = 'IMAGING'
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CHECKED_IN = 'CHECKED_IN',
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export enum PriorityLevel {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// ============================================
// Consultation Types
// ============================================

export interface Consultation {
  id: string;
  appointmentId: string;
  staffId: string;
  patientId: string;
  chiefComplaint: string;
  historyOfPresentIllness?: string | null;
  physicalExamination?: Record<string, unknown> | null;
  vitalSignsId?: string | null;
  primaryDiagnosis: string;
  differentialDiagnosis: string[];
  clinicalAssessment?: string | null;
  treatmentPlan?: string | null;
  followUpInstructions?: string | null;
  consultationNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  appointment?: Appointment;
  staff?: Staff;
  patient?: Patient;
  vitalSigns?: VitalSigns | null;
}

// ============================================
// Vital Signs Types
// ============================================

export interface VitalSigns {
  id: string;
  patientId: string;
  consultationId?: string | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  temperature?: number | null;
  weight?: number | null;
  height?: number | null;
  oxygenSaturation?: number | null;
  respiratoryRate?: number | null;
  bmi?: number | null;
  recordedAt: Date;
  createdAt: Date;
  patient?: Patient;
}

// ============================================
// Prescription Types
// ============================================

export interface Prescription {
  id: string;
  consultationId: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
  status: PrescriptionStatus;
  prescribedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  consultation?: Consultation;
  patient?: Patient;
}

export enum PrescriptionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DISCONTINUED = 'DISCONTINUED',
  EXPIRED = 'EXPIRED'
}

// ============================================
// Medical Records Types
// ============================================

export interface MedicalRecord {
  id: string;
  patientId: string;
  consultationId?: string | null;
  recordType: RecordType;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  patient?: Patient;
  consultation?: Consultation | null;
}

export enum RecordType {
  LAB_RESULT = 'LAB_RESULT',
  IMAGING = 'IMAGING',
  VACCINATION = 'VACCINATION',
  SURGERY = 'SURGERY',
  DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
  OTHER = 'OTHER'
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
  metadata?: Record<string, unknown> | null;
  expiresAt?: Date | null;
  createdAt: Date;
  patient?: Patient;
}

export enum NotificationType {
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  LAB_RESULTS_READY = 'LAB_RESULTS_READY',
  MEDICATION_REMINDER = 'MEDICATION_REMINDER',
  URGENT_HEALTH_ALERT = 'URGENT_HEALTH_ALERT',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  FOLLOW_UP_REQUIRED = 'FOLLOW_UP_REQUIRED'
}

// ============================================
// Queue Management Types
// ============================================

export interface QueueItem {
  id: string;
  appointmentId: string;
  patientId: string;
  department: Department;
  queueNumber: number;
  priority: PriorityLevel;
  status: AppointmentStatus;
  estimatedWaitTime?: number | null;
  checkedInAt: Date;
  appointment?: Appointment;
  patient?: Patient;
}

// ============================================
// Analytics Types
// ============================================

export interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  urgentCases: number;
  averageWaitTime: number;
  departmentUtilization: DepartmentUtilization[];
}

export interface DepartmentUtilization {
  department: Department;
  totalAppointments: number;
  activeAppointments: number;
  averageWaitTime: number;
  utilizationRate: number;
}

// ============================================
// Audit Log Types
// ============================================

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  user?: User;
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