/*
  Warnings:

  - A unique constraint covering the columns `[appointmentSlotId]` on the table `appointments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `patients` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `prescribedBy` to the `prescriptions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'GRADUATED', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "TriageCategory" AS ENUM ('URGENT', 'MEDIUM', 'ADVICE');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'BLOCKED', 'RESERVED');

-- CreateEnum
CREATE TYPE "ConsultationType" AS ENUM ('IN_PERSON', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "VirtualSessionStatus" AS ENUM ('SCHEDULED', 'WAITING_ROOM', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'TECHNICAL_FAILURE', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('SERVICE', 'STAFF', 'FACILITY', 'APPOINTMENT', 'VIRTUAL_CONSULTATION', 'TRIAGE_ACCURACY', 'WAIT_TIME', 'COMMUNICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'CALLED', 'CANCELLED', 'CONVERTED_TO_APPOINTMENT', 'NO_SHOW');

-- AlterEnum
ALTER TYPE "AppointmentType" ADD VALUE 'VIRTUAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'VIRTUAL_CONSULTATION_LINK';
ALTER TYPE "NotificationType" ADD VALUE 'TRIAGE_RESULT';
ALTER TYPE "NotificationType" ADD VALUE 'FEEDBACK_REQUEST';

-- AlterEnum
ALTER TYPE "PrescriptionStatus" ADD VALUE 'PENDING_REFILL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RecordType" ADD VALUE 'REFERRAL';
ALTER TYPE "RecordType" ADD VALUE 'CONSENT_FORM';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "appointmentSlotId" TEXT,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "consultationType" "ConsultationType" NOT NULL DEFAULT 'IN_PERSON',
ADD COLUMN     "followUpReminderSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "triagePriority" "TriageCategory";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "description" TEXT,
ADD COLUMN     "severity" TEXT NOT NULL DEFAULT 'INFO';

-- AlterTable
ALTER TABLE "consultations" ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "icdCode" TEXT;

-- AlterTable
ALTER TABLE "health_assessments" ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "triageCategory" "TriageCategory" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "triageOverride" "TriageCategory";

-- AlterTable
ALTER TABLE "medical_records" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "retentionYears" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "maxRetries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "relatedEntityId" TEXT,
ADD COLUMN     "relatedEntityType" TEXT,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "sentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "accessibilityRequirements" TEXT[],
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "preferredName" TEXT,
ADD COLUMN     "preferredNotificationChannel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "profilePicture" TEXT,
ADD COLUMN     "specialNeeds" TEXT,
ADD COLUMN     "studentStatus" "StudentStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "genericName" TEXT,
ADD COLUMN     "isControlled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prescribedBy" TEXT NOT NULL,
ADD COLUMN     "quantity" INTEGER,
ADD COLUMN     "refillsAllowed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refillsRemaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "route" TEXT NOT NULL DEFAULT 'oral',
ADD COLUMN     "verifiedBy" TEXT,
ADD COLUMN     "warnings" TEXT[];

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isAvailableForVirtual" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "profilePicture" TEXT,
ADD COLUMN     "virtualConsultationRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "category" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "verificationExpiry" TIMESTAMP(3),
ADD COLUMN     "verificationToken" TEXT;

-- AlterTable
ALTER TABLE "vital_signs" ADD COLUMN     "bloodGlucose" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "painLevel" INTEGER;

-- CreateTable
CREATE TABLE "appointment_slots" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "minPriority" "Priority" NOT NULL DEFAULT 'LOW',
    "reservedFor" "Department",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_consultations" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "sessionUrl" TEXT,
    "sessionId" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'jitsi',
    "status" "VirtualSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "duration" INTEGER,
    "patientJoinedAt" TIMESTAMP(3),
    "staffJoinedAt" TIMESTAMP(3),
    "connectionQuality" TEXT,
    "technicalIssues" TEXT,
    "sessionNotes" TEXT,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "notificationType" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "staffId" TEXT,
    "rating" INTEGER NOT NULL,
    "category" "FeedbackCategory" NOT NULL,
    "comments" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "sentimentScore" DOUBLE PRECISION,
    "keywords" TEXT[],
    "respondedAt" TIMESTAMP(3),
    "responseBy" TEXT,
    "responseText" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlists" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "triageCategory" "TriageCategory",
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "position" INTEGER,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "estimatedWait" INTEGER,
    "convertedToAppointmentId" TEXT,

    CONSTRAINT "waitlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_prediction_logs" (
    "id" TEXT NOT NULL,
    "healthAssessmentId" TEXT,
    "symptoms" TEXT[],
    "inputFeatures" JSONB,
    "predictedDisease" TEXT NOT NULL,
    "triageCategory" "TriageCategory" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "responseTimeMs" INTEGER,
    "actualDiagnosis" TEXT,
    "wasCorrect" BOOLEAN,
    "feedbackProvided" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_prediction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_slots_date_idx" ON "appointment_slots"("date");

-- CreateIndex
CREATE INDEX "appointment_slots_status_idx" ON "appointment_slots"("status");

-- CreateIndex
CREATE INDEX "appointment_slots_staffId_date_idx" ON "appointment_slots"("staffId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_slots_staffId_date_startTime_key" ON "appointment_slots"("staffId", "date", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_consultations_appointmentId_key" ON "virtual_consultations"("appointmentId");

-- CreateIndex
CREATE INDEX "virtual_consultations_patientId_idx" ON "virtual_consultations"("patientId");

-- CreateIndex
CREATE INDEX "virtual_consultations_staffId_idx" ON "virtual_consultations"("staffId");

-- CreateIndex
CREATE INDEX "virtual_consultations_scheduledStart_idx" ON "virtual_consultations"("scheduledStart");

-- CreateIndex
CREATE INDEX "virtual_consultations_status_idx" ON "virtual_consultations"("status");

-- CreateIndex
CREATE INDEX "notification_preferences_patientId_idx" ON "notification_preferences"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_patientId_notificationType_channel_key" ON "notification_preferences"("patientId", "notificationType", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "feedbacks_appointmentId_key" ON "feedbacks"("appointmentId");

-- CreateIndex
CREATE INDEX "feedbacks_staffId_idx" ON "feedbacks"("staffId");

-- CreateIndex
CREATE INDEX "feedbacks_rating_idx" ON "feedbacks"("rating");

-- CreateIndex
CREATE INDEX "feedbacks_category_idx" ON "feedbacks"("category");

-- CreateIndex
CREATE INDEX "feedbacks_createdAt_idx" ON "feedbacks"("createdAt");

-- CreateIndex
CREATE INDEX "feedbacks_isFlagged_idx" ON "feedbacks"("isFlagged");

-- CreateIndex
CREATE INDEX "waitlists_department_status_priority_idx" ON "waitlists"("department", "status", "priority");

-- CreateIndex
CREATE INDEX "waitlists_triageCategory_idx" ON "waitlists"("triageCategory");

-- CreateIndex
CREATE INDEX "waitlists_addedAt_idx" ON "waitlists"("addedAt");

-- CreateIndex
CREATE INDEX "ml_prediction_logs_createdAt_idx" ON "ml_prediction_logs"("createdAt");

-- CreateIndex
CREATE INDEX "ml_prediction_logs_triageCategory_idx" ON "ml_prediction_logs"("triageCategory");

-- CreateIndex
CREATE INDEX "ml_prediction_logs_predictedDisease_idx" ON "ml_prediction_logs"("predictedDisease");

-- CreateIndex
CREATE INDEX "ml_prediction_logs_wasCorrect_idx" ON "ml_prediction_logs"("wasCorrect");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_appointmentSlotId_key" ON "appointments"("appointmentSlotId");

-- CreateIndex
CREATE INDEX "appointments_triagePriority_idx" ON "appointments"("triagePriority");

-- CreateIndex
CREATE INDEX "appointments_consultationType_idx" ON "appointments"("consultationType");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");

-- CreateIndex
CREATE INDEX "consultations_primaryDiagnosis_idx" ON "consultations"("primaryDiagnosis");

-- CreateIndex
CREATE INDEX "health_assessments_triageCategory_idx" ON "health_assessments"("triageCategory");

-- CreateIndex
CREATE INDEX "medical_records_isArchived_idx" ON "medical_records"("isArchived");

-- CreateIndex
CREATE INDEX "notifications_channel_idx" ON "notifications"("channel");

-- CreateIndex
CREATE INDEX "notifications_scheduledFor_idx" ON "notifications"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "patients_email_key" ON "patients"("email");

-- CreateIndex
CREATE INDEX "patients_email_idx" ON "patients"("email");

-- CreateIndex
CREATE INDEX "patients_studentStatus_idx" ON "patients"("studentStatus");

-- CreateIndex
CREATE INDEX "prescriptions_medicationName_idx" ON "prescriptions"("medicationName");

-- CreateIndex
CREATE INDEX "staff_isAvailableForVirtual_idx" ON "staff"("isAvailableForVirtual");

-- CreateIndex
CREATE INDEX "system_settings_category_idx" ON "system_settings"("category");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- AddForeignKey
ALTER TABLE "health_assessments" ADD CONSTRAINT "health_assessments_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_appointmentSlotId_fkey" FOREIGN KEY ("appointmentSlotId") REFERENCES "appointment_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_consultations" ADD CONSTRAINT "virtual_consultations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_consultations" ADD CONSTRAINT "virtual_consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_consultations" ADD CONSTRAINT "virtual_consultations_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlists" ADD CONSTRAINT "waitlists_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
