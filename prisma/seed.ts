/// <reference types="node" />
// prisma/seed.ts
// DKUT Medical Center - Database Seed Data
// Fixed version with proper TypeScript types

import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs"; // Use bcryptjs instead of bcrypt (better Windows compatibility)

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 Starting database seed...");

  // Clean existing data (in reverse order of dependencies)
  console.log("🧹 Cleaning existing data...");
  await prisma.mLPredictionLog.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.virtualConsultation.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.vitalSign.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.appointmentSlot.deleteMany();
  await prisma.healthAssessment.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSettings.deleteMany();
  await prisma.auditLog.deleteMany();

  const saltRounds = 10;

  // ==========================================
  // 1. CREATE USERS
  // ==========================================
  console.log("👤 Creating users...");

  const adminPassword = await bcrypt.hash("admin123", saltRounds);
  const staffPassword = await bcrypt.hash("staff123", saltRounds);
  const patientPassword = await bcrypt.hash("patient123", saltRounds);

  // Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@dkut.ac.ke",
      passwordHash: adminPassword,
      role: "ADMIN",
      isActive: true,
      emailVerified: true,
    },
  });

  // Staff Users (Doctors, Nurses)
  const staffUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: "dr.mwangi@dkut.ac.ke",
        passwordHash: staffPassword,
        role: "STAFF",
        isActive: true,
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "dr.ochieng@dkut.ac.ke",
        passwordHash: staffPassword,
        role: "STAFF",
        isActive: true,
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "nurse.akinyi@dkut.ac.ke",
        passwordHash: staffPassword,
        role: "STAFF",
        isActive: true,
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "dr.kamau@dkut.ac.ke",
        passwordHash: staffPassword,
        role: "STAFF",
        isActive: true,
        emailVerified: true,
      },
    }),
  ]);

  // Patient Users
  const patientUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: "john.student@dkut.ac.ke",
        passwordHash: patientPassword,
        role: "PATIENT",
        isActive: true,
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "mary.student@dkut.ac.ke",
        passwordHash: patientPassword,
        role: "PATIENT",
        isActive: true,
        emailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "peter.student@dkut.ac.ke",
        passwordHash: patientPassword,
        role: "PATIENT",
        isActive: true,
        emailVerified: true,
      },
    }),
  ]);

  // ==========================================
  // 2. CREATE STAFF PROFILES
  // ==========================================
  console.log("👨‍⚕️ Creating staff profiles...");

  const staffProfiles = await Promise.all([
    prisma.staff.create({
      data: {
        userId: staffUsers[0].id,
        staffId: "STF-001",
        firstName: "James",
        lastName: "Mwangi",
        phone: "+254712345678",
        email: "dr.mwangi@dkut.ac.ke",
        department: "GENERAL_MEDICINE",
        position: "SENIOR_DOCTOR",
        specialization: "Internal Medicine",
        licenseNumber: "KMD-12345",
        bio: "Senior physician with 15 years experience in internal medicine.",
        isAvailableForVirtual: true,
      },
    }),
    prisma.staff.create({
      data: {
        userId: staffUsers[1].id,
        staffId: "STF-002",
        firstName: "Grace",
        lastName: "Ochieng",
        phone: "+254723456789",
        email: "dr.ochieng@dkut.ac.ke",
        department: "MENTAL_HEALTH",
        position: "CONSULTANT",
        specialization: "Psychiatry",
        licenseNumber: "KMD-23456",
        bio: "Specialist in student mental health and counseling.",
        isAvailableForVirtual: true,
      },
    }),
    prisma.staff.create({
      data: {
        userId: staffUsers[2].id,
        staffId: "STF-003",
        firstName: "Lucy",
        lastName: "Akinyi",
        phone: "+254734567890",
        email: "nurse.akinyi@dkut.ac.ke",
        department: "GENERAL_MEDICINE",
        position: "NURSE",
        specialization: null,
        licenseNumber: "KNC-34567",
        bio: "Registered nurse specializing in primary care.",
        isAvailableForVirtual: false,
      },
    }),
    prisma.staff.create({
      data: {
        userId: staffUsers[3].id,
        staffId: "STF-004",
        firstName: "David",
        lastName: "Kamau",
        phone: "+254745678901",
        email: "dr.kamau@dkut.ac.ke",
        department: "EMERGENCY",
        position: "JUNIOR_DOCTOR",
        specialization: "Emergency Medicine",
        licenseNumber: "KMD-45678",
        bio: "Emergency medicine specialist.",
        isAvailableForVirtual: true,
      },
    }),
  ]);

  // ==========================================
  // 3. CREATE PATIENT PROFILES
  // ==========================================
  console.log("🏥 Creating patient profiles...");

  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        userId: patientUsers[0].id,
        studentId: "SCT221-0001/2021",
        firstName: "John",
        lastName: "Kipchoge",
        dateOfBirth: new Date("2000-05-15"),
        gender: "MALE",
        phone: "+254756789012",
        email: "john.kipchoge@students.dkut.ac.ke",
        nationality: "Kenyan",
        address: "Hostel Block A, Room 101",
        bloodGroup: "O_POSITIVE",
        studentStatus: "ACTIVE",
        preferredNotificationChannel: "EMAIL",
        emergencyContactName: "Jane Kipchoge",
        emergencyContactRelationship: "Mother",
        emergencyContactPhone: "+254700123456",
        allergies: ["Penicillin"],
        chronicConditions: [],
        currentMedications: [],
      },
    }),
    prisma.patient.create({
      data: {
        userId: patientUsers[1].id,
        studentId: "SCT221-0002/2021",
        firstName: "Mary",
        lastName: "Wanjiku",
        dateOfBirth: new Date("2001-08-20"),
        gender: "FEMALE",
        phone: "+254767890123",
        email: "mary.wanjiku@students.dkut.ac.ke",
        nationality: "Kenyan",
        address: "Hostel Block C, Room 205",
        bloodGroup: "A_POSITIVE",
        studentStatus: "ACTIVE",
        preferredNotificationChannel: "SMS",
        emergencyContactName: "Peter Wanjiku",
        emergencyContactRelationship: "Father",
        emergencyContactPhone: "+254700234567",
        allergies: [],
        chronicConditions: ["Asthma"],
        currentMedications: ["Ventolin Inhaler"],
      },
    }),
    prisma.patient.create({
      data: {
        userId: patientUsers[2].id,
        studentId: "SCT221-0003/2020",
        firstName: "Peter",
        lastName: "Otieno",
        dateOfBirth: new Date("1999-12-10"),
        gender: "MALE",
        phone: "+254778901234",
        email: "peter.otieno@students.dkut.ac.ke",
        nationality: "Kenyan",
        address: "Off-Campus, Nyeri Town",
        bloodGroup: "B_NEGATIVE",
        studentStatus: "ACTIVE",
        preferredNotificationChannel: "EMAIL",
        emergencyContactName: "Rose Otieno",
        emergencyContactRelationship: "Sister",
        emergencyContactPhone: "+254700345678",
        allergies: ["Sulfa drugs", "Latex"],
        chronicConditions: ["Diabetes Type 2"],
        currentMedications: ["Metformin 500mg"],
      },
    }),
  ]);

  // ==========================================
  // 4. CREATE APPOINTMENT SLOTS (Objective 3)
  // ==========================================
  console.log("📅 Creating appointment slots...");

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const timeSlots = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
  ];

  // Create slots for Dr. Mwangi
  for (const date of [tomorrow, dayAfter]) {
    for (const time of timeSlots) {
      await prisma.appointmentSlot.create({
        data: {
          staffId: staffProfiles[0].id,
          date: date,
          startTime: time,
          endTime: addMinutes(time, 30),
          duration: 30,
          status: "AVAILABLE",
          isVirtual: ["09:00", "09:30", "14:00", "14:30"].includes(time),
          minPriority: "LOW",
        },
      });
    }
  }

  // Create slots for Dr. Ochieng (Mental Health - mostly virtual)
  for (const date of [tomorrow, dayAfter]) {
    for (const time of ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]) {
      await prisma.appointmentSlot.create({
        data: {
          staffId: staffProfiles[1].id,
          date: date,
          startTime: time,
          endTime: addMinutes(time, 60),
          duration: 60,
          status: "AVAILABLE",
          isVirtual: true,
          minPriority: "LOW",
        },
      });
    }
  }

  // ==========================================
  // 5. CREATE HEALTH ASSESSMENTS (Objective 2)
  // ==========================================
  console.log("🔬 Creating health assessments...");

  const assessments = await Promise.all([
    // Urgent case
    prisma.healthAssessment.create({
      data: {
        patientId: patients[0].id,
        symptoms: [
          "severe headache",
          "high fever",
          "stiff neck",
          "sensitivity to light",
        ],
        additionalInfo: {
          age: 24,
          gender: "male",
          duration: "2 days",
          severity: "severe",
          notes: "Symptoms worsening rapidly",
        },
        predictedDisease: "Possible Meningitis",
        severityScore: 9,
        confidence: 0.85,
        triageCategory: "URGENT",
        urgency: "URGENT",
        recommendations: [
          "Seek immediate medical attention",
          "Emergency department evaluation recommended",
          "Do not delay treatment",
        ],
        assessmentDate: new Date(),
      },
    }),
    // Medium priority case
    prisma.healthAssessment.create({
      data: {
        patientId: patients[1].id,
        symptoms: ["persistent cough", "wheezing", "shortness of breath"],
        additionalInfo: {
          age: 23,
          gender: "female",
          duration: "1 week",
          severity: "moderate",
          notes: "Has asthma history",
        },
        predictedDisease: "Asthma Exacerbation",
        severityScore: 6,
        confidence: 0.92,
        triageCategory: "MEDIUM",
        urgency: "MODERATE",
        recommendations: [
          "Schedule appointment within 24-48 hours",
          "Continue using rescue inhaler as needed",
          "Monitor symptoms closely",
        ],
        assessmentDate: new Date(),
      },
    }),
    // Advice/Low priority case
    prisma.healthAssessment.create({
      data: {
        patientId: patients[2].id,
        symptoms: ["mild headache", "fatigue", "muscle aches"],
        additionalInfo: {
          age: 25,
          gender: "male",
          duration: "1 day",
          severity: "mild",
          notes: "Studying for exams, not sleeping well",
        },
        predictedDisease: "Tension Headache / Stress",
        severityScore: 3,
        confidence: 0.78,
        triageCategory: "ADVICE",
        urgency: "LOW",
        recommendations: [
          "Get adequate rest (7-8 hours sleep)",
          "Stay hydrated",
          "Take breaks during study sessions",
          "Over-the-counter pain relief if needed",
          "Follow up if symptoms persist beyond 3 days",
        ],
        assessmentDate: new Date(),
      },
    }),
  ]);

  // ==========================================
  // 6. CREATE APPOINTMENTS
  // ==========================================
  console.log("📋 Creating appointments...");

  const appointments = await Promise.all([
    // Urgent appointment from triage
    prisma.appointment.create({
      data: {
        patientId: patients[0].id,
        staffId: staffProfiles[3].id,
        healthAssessmentId: assessments[0].id,
        appointmentDate: today,
        appointmentTime: "10:00",
        duration: 30,
        department: "EMERGENCY",
        appointmentType: "EMERGENCY",
        consultationType: "IN_PERSON",
        status: "IN_PROGRESS",
        priority: "URGENT",
        triagePriority: "URGENT",
        chiefComplaint: "Severe headache with fever and neck stiffness",
        symptoms: [
          "severe headache",
          "high fever",
          "stiff neck",
          "sensitivity to light",
        ],
        notes: "Referred from AI triage as urgent case",
        queueNumber: 1,
        checkedInAt: new Date(),
        startedAt: new Date(),
        reminderSent: true,
        reminderSentAt: new Date(),
      },
    }),
    // Regular appointment
    prisma.appointment.create({
      data: {
        patientId: patients[1].id,
        staffId: staffProfiles[0].id,
        healthAssessmentId: assessments[1].id,
        appointmentDate: tomorrow,
        appointmentTime: "09:00",
        duration: 30,
        department: "GENERAL_MEDICINE",
        appointmentType: "CONSULTATION",
        consultationType: "IN_PERSON",
        status: "SCHEDULED",
        priority: "NORMAL",
        triagePriority: "MEDIUM",
        chiefComplaint: "Asthma symptoms worsening",
        symptoms: ["persistent cough", "wheezing", "shortness of breath"],
        reminderSent: false,
      },
    }),
    // Virtual appointment (Objective 1)
    prisma.appointment.create({
      data: {
        patientId: patients[2].id,
        staffId: staffProfiles[1].id,
        appointmentDate: tomorrow,
        appointmentTime: "14:00",
        duration: 60,
        department: "MENTAL_HEALTH",
        appointmentType: "VIRTUAL",
        consultationType: "VIRTUAL",
        status: "SCHEDULED",
        priority: "NORMAL",
        chiefComplaint: "Exam stress and anxiety",
        symptoms: ["stress", "anxiety", "sleep problems"],
        notes: "Initial mental health consultation",
        reminderSent: false,
      },
    }),
  ]);

  // ==========================================
  // 7. CREATE VIRTUAL CONSULTATION (Objective 1)
  // ==========================================
  console.log("💻 Creating virtual consultations...");

  const virtualStartTime = new Date(tomorrow);
  virtualStartTime.setHours(14, 0, 0, 0);
  const virtualEndTime = new Date(tomorrow);
  virtualEndTime.setHours(15, 0, 0, 0);

  await prisma.virtualConsultation.create({
    data: {
      appointmentId: appointments[2].id,
      patientId: patients[2].id,
      staffId: staffProfiles[1].id,
      platform: "jitsi",
      status: "SCHEDULED",
      scheduledStart: virtualStartTime,
      scheduledEnd: virtualEndTime,
    },
  });

  // ==========================================
  // 8. CREATE CONSULTATIONS
  // ==========================================
  console.log("📝 Creating consultation records...");

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 7);

  const pastAppointment = await prisma.appointment.create({
    data: {
      patientId: patients[0].id,
      staffId: staffProfiles[0].id,
      appointmentDate: pastDate,
      appointmentTime: "10:00",
      duration: 30,
      department: "GENERAL_MEDICINE",
      appointmentType: "CHECK_UP",
      consultationType: "IN_PERSON",
      status: "COMPLETED",
      priority: "NORMAL",
      chiefComplaint: "Regular health check-up",
      symptoms: [],
      completedAt: pastDate,
      reminderSent: true,
    },
  });

  const consultation = await prisma.consultation.create({
    data: {
      appointmentId: pastAppointment.id,
      patientId: patients[0].id,
      staffId: staffProfiles[0].id,
      chiefComplaint: "Regular health check-up",
      historyOfPresentIllness:
        "No current complaints. Here for routine check-up.",
      physicalExamination: {
        general: "Alert and oriented",
        cardiovascular: "Regular heart sounds, no murmurs",
        respiratory: "Clear breath sounds bilaterally",
        abdomen: "Soft, non-tender",
      },
      primaryDiagnosis: "Healthy",
      differentialDiagnosis: [],
      clinicalAssessment: "Patient in good health. Continue current lifestyle.",
      treatmentPlan: "No treatment required. Maintain healthy habits.",
      followUpInstructions:
        "Return for annual check-up or if new symptoms arise.",
      followUpDate: new Date(new Date().setMonth(new Date().getMonth() + 12)),
    },
  });

  // ==========================================
  // 9. CREATE VITAL SIGNS
  // ==========================================
  console.log("❤️ Creating vital signs...");

  await prisma.vitalSign.create({
    data: {
      patientId: patients[0].id,
      consultationId: consultation.id,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      heartRate: 72,
      temperature: 36.6,
      weight: 70,
      height: 175,
      oxygenSaturation: 98,
      respiratoryRate: 16,
      bmi: 22.9,
      recordedBy: staffProfiles[2].id,
    },
  });

  // ==========================================
  // 10. CREATE NOTIFICATIONS (Objective 4)
  // ==========================================
  console.log("🔔 Creating notifications...");

  const notificationScheduleTime = new Date();
  notificationScheduleTime.setHours(18, 0, 0, 0);

  const virtualNotificationTime = new Date(tomorrow);
  virtualNotificationTime.setHours(13, 30, 0, 0);

  await Promise.all([
    prisma.notification.create({
      data: {
        patientId: patients[1].id,
        type: "APPOINTMENT_REMINDER",
        title: "Upcoming Appointment Tomorrow",
        message:
          "Reminder: You have an appointment with Dr. Mwangi tomorrow at 9:00 AM.",
        priority: "NORMAL",
        channel: "EMAIL",
        scheduledFor: notificationScheduleTime,
        relatedEntityType: "appointment",
        relatedEntityId: appointments[1].id,
      },
    }),
    prisma.notification.create({
      data: {
        patientId: patients[0].id,
        type: "TRIAGE_RESULT",
        title: "Health Assessment Complete - Urgent",
        message:
          "Your health assessment indicates urgent attention is needed. Please proceed to the emergency department.",
        priority: "URGENT",
        channel: "SMS",
        sentAt: new Date(),
        deliveredAt: new Date(),
        relatedEntityType: "healthAssessment",
        relatedEntityId: assessments[0].id,
      },
    }),
    prisma.notification.create({
      data: {
        patientId: patients[2].id,
        type: "VIRTUAL_CONSULTATION_LINK",
        title: "Virtual Consultation Link",
        message:
          "Your virtual consultation with Dr. Ochieng is scheduled for tomorrow at 2:00 PM. Click the link to join.",
        priority: "NORMAL",
        channel: "EMAIL",
        scheduledFor: virtualNotificationTime,
      },
    }),
  ]);

  // ==========================================
  // 11. CREATE NOTIFICATION PREFERENCES (Objective 4)
  // ==========================================
  console.log("⚙️ Creating notification preferences...");

  for (const patient of patients) {
    await Promise.all([
      prisma.notificationPreference.create({
        data: {
          patientId: patient.id,
          notificationType: "APPOINTMENT_REMINDER",
          channel: patient.preferredNotificationChannel,
          enabled: true,
          quietHoursStart: "22:00",
          quietHoursEnd: "07:00",
        },
      }),
      prisma.notificationPreference.create({
        data: {
          patientId: patient.id,
          notificationType: "TRIAGE_RESULT",
          channel: "SMS",
          enabled: true,
        },
      }),
    ]);
  }

  // ==========================================
  // 12. CREATE FEEDBACK (Objective 5)
  // ==========================================
  console.log("⭐ Creating feedback entries...");

  await Promise.all([
    prisma.feedback.create({
      data: {
        patientId: patients[0].id,
        appointmentId: pastAppointment.id,
        staffId: staffProfiles[0].id,
        rating: 5,
        category: "SERVICE",
        comments:
          "Excellent service! Dr. Mwangi was very thorough and took time to explain everything.",
        isAnonymous: false,
        sentimentScore: 0.95,
        keywords: ["excellent", "thorough", "explained"],
        isPublic: true,
      },
    }),
    prisma.feedback.create({
      data: {
        patientId: patients[1].id,
        staffId: staffProfiles[2].id,
        rating: 4,
        category: "STAFF",
        comments: "Nurse Akinyi was very helpful and friendly.",
        isAnonymous: true,
        sentimentScore: 0.8,
        keywords: ["helpful", "friendly"],
        isPublic: false,
      },
    }),
    prisma.feedback.create({
      data: {
        patientId: patients[2].id,
        rating: 3,
        category: "WAIT_TIME",
        comments: "Service was good but had to wait longer than expected.",
        isAnonymous: true,
        sentimentScore: 0.3,
        keywords: ["wait", "longer"],
        isPublic: false,
        isFlagged: true,
      },
    }),
  ]);

  // ==========================================
  // 13. CREATE WAITLIST ENTRIES
  // ==========================================
  console.log("📋 Creating waitlist entries...");

  await prisma.waitlist.create({
    data: {
      patientId: patients[2].id,
      department: "DERMATOLOGY",
      reason: "Skin rash evaluation",
      priority: "NORMAL",
      triageCategory: "MEDIUM",
      status: "WAITING",
      position: 1,
      estimatedWait: 45,
    },
  });

  // ==========================================
  // 14. CREATE SYSTEM SETTINGS
  // ==========================================
  console.log("⚙️ Creating system settings...");

  await Promise.all([
    prisma.systemSettings.create({
      data: {
        key: "notification_email_enabled",
        value: true,
        description: "Enable email notifications via Nodemailer",
        category: "notification",
      },
    }),
    prisma.systemSettings.create({
      data: {
        key: "notification_sms_enabled",
        value: true,
        description: "Enable SMS notifications via Twilio",
        category: "notification",
      },
    }),
    prisma.systemSettings.create({
      data: {
        key: "appointment_reminder_hours",
        value: 24,
        description: "Hours before appointment to send reminder",
        category: "scheduling",
      },
    }),
    prisma.systemSettings.create({
      data: {
        key: "ml_model_version",
        value: "1.0.0",
        description: "Current ML triage model version",
        category: "ml",
      },
    }),
    prisma.systemSettings.create({
      data: {
        key: "virtual_consultation_platform",
        value: "jitsi",
        description: "Default video consultation platform",
        category: "virtual",
      },
    }),
    prisma.systemSettings.create({
      data: {
        key: "triage_urgent_auto_schedule",
        value: true,
        description: "Automatically schedule urgent triage cases",
        category: "scheduling",
      },
    }),
  ]);

  // ==========================================
  // 15. CREATE ML PREDICTION LOGS (Objective 2)
  // ==========================================
  console.log("🤖 Creating ML prediction logs...");

  for (const assessment of assessments) {
    await prisma.mLPredictionLog.create({
      data: {
        healthAssessmentId: assessment.id,
        symptoms: assessment.symptoms,
        inputFeatures: assessment.additionalInfo ?? Prisma.JsonNull,
        predictedDisease: assessment.predictedDisease,
        triageCategory: assessment.triageCategory,
        confidence: assessment.confidence ?? 0.8,
        modelVersion: "1.0.0",
        responseTimeMs: Math.floor(Math.random() * 500) + 100,
      },
    });
  }

  console.log("✅ Database seed completed successfully!");
  console.log(`
📊 Seed Summary:
- Users: ${4 + patientUsers.length} (1 admin, ${staffUsers.length} staff, ${patientUsers.length} patients)
- Staff profiles: ${staffProfiles.length}
- Patient profiles: ${patients.length}
- Health assessments: ${assessments.length}
- Appointments: ${appointments.length + 1}
- Virtual consultations: 1
- Consultations: 1
- Notifications: 3
- Feedback entries: 3
- System settings: 6

🔑 Test Credentials:
Admin:   admin@dkut.ac.ke / admin123
Doctor:  dr.mwangi@dkut.ac.ke / staff123
Nurse:   nurse.akinyi@dkut.ac.ke / staff123
Patient: john.student@dkut.ac.ke / patient123
  `);
}

// Helper function to add minutes to time string
function addMinutes(time: string, minutes: number): string {
  const parts = time.split(":");
  const hours = parseInt(parts[0] || "0", 10);
  const mins = parseInt(parts[1] || "0", 10);
  const totalMins = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMins / 60) % 24;
  const newMins = totalMins % 60;
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`;
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
