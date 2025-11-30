// User and Authentication Types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
}

// Patient Types
export interface Patient {
  id: string;
  userId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  phoneNumber: string;
  bloodGroup?: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

// Staff Types
export interface Staff {
  id: string;
  userId: string;
  staffId: string;
  firstName: string;
  lastName: string;
  department: Department;
  position: StaffPosition;
  specialization?: string;
  licenseNumber?: string;
  phoneNumber: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  ADMINISTRATION = 'ADMINISTRATION'
}

export enum StaffPosition {
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  PHARMACIST = 'PHARMACIST',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  RADIOLOGIST = 'RADIOLOGIST',
  ADMINISTRATOR = 'ADMINISTRATOR',
  RECEPTIONIST = 'RECEPTIONIST'
}

// Health Assessment Types
export interface HealthAssessment {
  id: string;
  patientId: string;
  symptoms: string[];
  predictedDisease: string;
  severityScore: number;
  urgency: UrgencyLevel;
  recommendations: string[];
  confidence?: number;
  additionalInfo?: any;
  createdAt: Date;
  updatedAt: Date;
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

// Appointment Types
export interface Appointment {
  id: string;
  patientId: string;
  staffId?: string;
  healthAssessmentId?: string;
  appointmentDate: Date;
  appointmentTime: string;
  duration: number;
  department: Department;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  priority: PriorityLevel;
  queueNumber?: number;
  estimatedWaitTime?: number;
  reason?: string;
  notes?: string;
  checkedInAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
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

// Consultation Types
export interface Consultation {
  id: string;
  appointmentId: string;
  staffId: string;
  patientId: string;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  physicalExamination?: any;
  vitalSignsId?: string;
  primaryDiagnosis: string;
  differentialDiagnosis: string[];
  clinicalAssessment?: string;
  treatmentPlan?: string;
  followUpInstructions?: string;
  consultationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Vital Signs Types
export interface VitalSigns {
  id: string;
  patientId: string;
  consultationId?: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
  bmi?: number;
  recordedAt: Date;
  createdAt: Date;
}

// Prescription Types
export interface Prescription {
  id: string;
  consultationId: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  status: PrescriptionStatus;
  prescribedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum PrescriptionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DISCONTINUED = 'DISCONTINUED',
  EXPIRED = 'EXPIRED'
}

// Medical Records Types
export interface MedicalRecord {
  id: string;
  patientId: string;
  consultationId?: string;
  recordType: RecordType;
  title: string;
  description?: string;
  fileUrl?: string;
  metadata?: any;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum RecordType {
  LAB_RESULT = 'LAB_RESULT',
  IMAGING = 'IMAGING',
  VACCINATION = 'VACCINATION',
  SURGERY = 'SURGERY',
  DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
  OTHER = 'OTHER'
}

// Notification Types
export interface Notification {
  id: string;
  patientId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: PriorityLevel;
  read: boolean;
  readAt?: Date;
  metadata?: any;
  expiresAt?: Date;
  createdAt: Date;
}

export enum NotificationType {
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  LAB_RESULTS_READY = 'LAB_RESULTS_READY',
  MEDICATION_REMINDER = 'MEDICATION_REMINDER',
  URGENT_HEALTH_ALERT = 'URGENT_HEALTH_ALERT',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  FOLLOW_UP_REQUIRED = 'FOLLOW_UP_REQUIRED'
}

// Queue Management Types
export interface QueueItem {
  id: string;
  appointmentId: string;
  patientId: string;
  department: Department;
  queueNumber: number;
  priority: PriorityLevel;
  status: AppointmentStatus;
  estimatedWaitTime?: number;
  checkedInAt: Date;
}

// Analytics Types
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

// Audit Log Types
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
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
  [key: string]: any;
}

// Request Extended Types (for Express)
export interface AuthRequest extends Request {
  user?: JWTPayload;
}