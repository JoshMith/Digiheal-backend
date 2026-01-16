import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 Starting database seed for DKUT Medical Center...");

  // Clean existing data (in reverse order of dependencies)
  console.log("🧹 Cleaning existing data...");
  await prisma.interaction.deleteMany();
  await prisma.vitalSigns.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany();

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
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // Staff Users
  const staffUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: "dr.mwangi@dkut.ac.ke",
        password: staffPassword,
        role: "STAFF",
      },
    }),
    prisma.user.create({
      data: {
        email: "dr.ochieng@dkut.ac.ke",
        password: staffPassword,
        role: "STAFF",
      },
    }),
    prisma.user.create({
      data: {
        email: "nurse.akinyi@dkut.ac.ke",
        password: staffPassword,
        role: "STAFF",
      },
    }),
    prisma.user.create({
      data: {
        email: "dr.kamau@dkut.ac.ke",
        password: staffPassword,
        role: "STAFF",
      },
    }),
    // Receptionist
    prisma.user.create({
      data: {
        email: "reception@dkut.ac.ke",
        password: staffPassword,
        role: "STAFF",
      },
    }),
  ]);

  // Patient Users
  const patientUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: "john.student@dkut.ac.ke",
        password: patientPassword,
        role: "PATIENT",
      },
    }),
    prisma.user.create({
      data: {
        email: "mary.student@dkut.ac.ke",
        password: patientPassword,
        role: "PATIENT",
      },
    }),
    prisma.user.create({
      data: {
        email: "peter.student@dkut.ac.ke",
        password: patientPassword,
        role: "PATIENT",
      },
    }),
    prisma.user.create({
      data: {
        email: "sarah.student@dkut.ac.ke",
        password: patientPassword,
        role: "PATIENT",
      },
    }),
    prisma.user.create({
      data: {
        email: "david.student@dkut.ac.ke",
        password: patientPassword,
        role: "PATIENT",
      },
    }),
  ]);

  // ==========================================
  // 2. CREATE STAFF PROFILES
  // ==========================================
  console.log("👨‍⚕️ Creating staff profiles...");

  const staffProfiles = await Promise.all([
    // General Medicine Doctor
    prisma.staff.create({
      data: {
        userId: staffUsers[0].id,
        staffId: "STF-001",
        firstName: "James",
        lastName: "Mwangi",
        department: "GENERAL_MEDICINE",
        position: "DOCTOR",
        specialization: "Internal Medicine",
        licenseNumber: "KMD-12345",
        phone: "+254712345678",
      },
    }),
    // Mental Health Specialist
    prisma.staff.create({
      data: {
        userId: staffUsers[1].id,
        staffId: "STF-002",
        firstName: "Grace",
        lastName: "Ochieng",
        department: "MENTAL_HEALTH",
        position: "DOCTOR",
        specialization: "Psychiatry",
        licenseNumber: "KMD-23456",
        phone: "+254723456789",
      },
    }),
    // Nurse
    prisma.staff.create({
      data: {
        userId: staffUsers[2].id,
        staffId: "STF-003",
        firstName: "Lucy",
        lastName: "Akinyi",
        department: "GENERAL_MEDICINE",
        position: "NURSE",
        licenseNumber: "KNC-34567",
        phone: "+254734567890",
      },
    }),
    // Emergency Doctor
    prisma.staff.create({
      data: {
        userId: staffUsers[3].id,
        staffId: "STF-004",
        firstName: "David",
        lastName: "Kamau",
        department: "EMERGENCY",
        position: "DOCTOR",
        specialization: "Emergency Medicine",
        licenseNumber: "KMD-45678",
        phone: "+254745678901",
      },
    }),
    // Receptionist
    prisma.staff.create({
      data: {
        userId: staffUsers[4].id,
        staffId: "STF-005",
        firstName: "Susan",
        lastName: "Wambui",
        department: "GENERAL_MEDICINE",
        position: "RECEPTIONIST",
        phone: "+254756789012",
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
        bloodGroup: "O_POSITIVE",
        allergies: ["Penicillin"],
        chronicConditions: [],
        emergencyContactName: "Jane Kipchoge",
        emergencyContactPhone: "+254700123456",
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
        bloodGroup: "A_POSITIVE",
        allergies: [],
        chronicConditions: ["Asthma"],
        emergencyContactName: "Peter Wanjiku",
        emergencyContactPhone: "+254700234567",
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
        bloodGroup: "B_NEGATIVE",
        allergies: ["Sulfa drugs", "Latex"],
        chronicConditions: ["Diabetes Type 2"],
        emergencyContactName: "Rose Otieno",
        emergencyContactPhone: "+254700345678",
      },
    }),
    prisma.patient.create({
      data: {
        userId: patientUsers[3].id,
        studentId: "SCT221-0004/2022",
        firstName: "Sarah",
        lastName: "Muthoni",
        dateOfBirth: new Date("2002-03-25"),
        gender: "FEMALE",
        phone: "+254789012345",
        bloodGroup: "AB_POSITIVE",
        allergies: ["Peanuts"],
        chronicConditions: [],
        emergencyContactName: "Joseph Muthoni",
        emergencyContactPhone: "+254700456789",
      },
    }),
    prisma.patient.create({
      data: {
        userId: patientUsers[4].id,
        studentId: "SCT221-0005/2023",
        firstName: "David",
        lastName: "Kimani",
        dateOfBirth: new Date("2003-07-12"),
        gender: "MALE",
        phone: "+254790123456",
        bloodGroup: "O_NEGATIVE",
        allergies: [],
        chronicConditions: ["Hypertension"],
        emergencyContactName: "Esther Kimani",
        emergencyContactPhone: "+254700567890",
      },
    }),
  ]);

  // ==========================================
  // 4. CREATE APPOINTMENTS
  // ==========================================
  console.log("📋 Creating appointments...");

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const appointments = await Promise.all([
    // Completed appointment (for historical data)
    prisma.appointment.create({
      data: {
        patientId: patients[0].id,
        staffId: staffProfiles[0].id,
        appointmentDate: yesterday,
        appointmentTime: "10:00",
        department: "GENERAL_MEDICINE",
        type: "ROUTINE_CHECKUP",
        status: "COMPLETED",
        priority: "NORMAL",
        queueNumber: 1,
        reason: "Annual check-up",
        notes: "Patient in good health",
        checkedInAt: new Date(yesterday.setHours(9, 45, 0, 0)),
        startedAt: new Date(yesterday.setHours(10, 0, 0, 0)),
        completedAt: new Date(yesterday.setHours(10, 25, 0, 0)),
      },
    }),
    // In-progress appointment
    prisma.appointment.create({
      data: {
        patientId: patients[1].id,
        staffId: staffProfiles[0].id,
        appointmentDate: today,
        appointmentTime: "09:00",
        department: "GENERAL_MEDICINE",
        type: "SCHEDULED",
        status: "IN_PROGRESS",
        priority: "NORMAL",
        queueNumber: 2,
        reason: "Asthma follow-up",
        checkedInAt: new Date(today.setHours(8, 55, 0, 0)),
        startedAt: new Date(today.setHours(9, 5, 0, 0)),
      },
    }),
    // Checked-in appointment (waiting)
    prisma.appointment.create({
      data: {
        patientId: patients[2].id,
        staffId: staffProfiles[0].id,
        appointmentDate: today,
        appointmentTime: "10:30",
        department: "GENERAL_MEDICINE",
        type: "SCHEDULED",
        status: "CHECKED_IN",
        priority: "NORMAL",
        queueNumber: 3,
        reason: "Diabetes management",
        checkedInAt: new Date(today.setHours(10, 15, 0, 0)),
      },
    }),
    // Scheduled for tomorrow
    prisma.appointment.create({
      data: {
        patientId: patients[3].id,
        staffId: staffProfiles[1].id,
        appointmentDate: tomorrow,
        appointmentTime: "14:00",
        department: "MENTAL_HEALTH",
        type: "SCHEDULED",
        status: "SCHEDULED",
        priority: "NORMAL",
        reason: "Stress counseling",
      },
    }),
    // Emergency appointment
    prisma.appointment.create({
      data: {
        patientId: patients[4].id,
        staffId: staffProfiles[3].id,
        appointmentDate: today,
        appointmentTime: "11:00",
        department: "EMERGENCY",
        type: "EMERGENCY",
        status: "CHECKED_IN",
        priority: "URGENT",
        queueNumber: 1,
        reason: "Severe chest pain",
        checkedInAt: new Date(today.setHours(10, 50, 0, 0)),
      },
    }),
    // Walk-in appointment
    prisma.appointment.create({
      data: {
        patientId: patients[0].id,
        appointmentDate: today,
        appointmentTime: "13:00",
        department: "GENERAL_MEDICINE",
        type: "WALK_IN",
        status: "SCHEDULED",
        priority: "LOW",
        reason: "Mild headache",
      },
    }),
  ]);

  // ==========================================
  // 5. CREATE INTERACTIONS (Time Tracking)
  // ==========================================
  console.log("⏱️ Creating interaction time tracking...");

  // For completed appointment
  await prisma.interaction.create({
    data: {
      appointmentId: appointments[0].id,
      patientId: patients[0].id,
      staffId: staffProfiles[0].id,
      department: "GENERAL_MEDICINE",
      priority: "NORMAL",
      appointmentType: "ROUTINE_CHECKUP",
      symptomCount: 0,
      checkInTime: appointments[0].checkedInAt!,
      vitalsStartTime: new Date(appointments[0].checkedInAt!.getTime() + 5 * 60000),
      vitalsEndTime: new Date(appointments[0].checkedInAt!.getTime() + 10 * 60000),
      interactionStartTime: appointments[0].startedAt!,
      interactionEndTime: new Date(appointments[0].startedAt!.getTime() + 20 * 60000),
      checkoutTime: appointments[0].completedAt!,
      vitalsDuration: 5,
      interactionDuration: 20,
      totalDuration: 25,
      predictedDuration: 30,
    },
  });

  // For in-progress appointment
  const inProgressInteraction = await prisma.interaction.create({
    data: {
      appointmentId: appointments[1].id,
      patientId: patients[1].id,
      staffId: staffProfiles[0].id,
      department: "GENERAL_MEDICINE",
      priority: "NORMAL",
      appointmentType: "SCHEDULED",
      symptomCount: 3,
      checkInTime: appointments[1].checkedInAt!,
      vitalsStartTime: new Date(appointments[1].checkedInAt!.getTime() + 5 * 60000),
      vitalsEndTime: new Date(appointments[1].checkedInAt!.getTime() + 12 * 60000),
      interactionStartTime: appointments[1].startedAt!,
      vitalsDuration: 7,
      predictedDuration: 35,
    },
  });

  // For checked-in appointment
  await prisma.interaction.create({
    data: {
      appointmentId: appointments[2].id,
      patientId: patients[2].id,
      staffId: staffProfiles[0].id,
      department: "GENERAL_MEDICINE",
      priority: "NORMAL",
      appointmentType: "SCHEDULED",
      symptomCount: 2,
      checkInTime: appointments[2].checkedInAt!,
      predictedDuration: 25,
    },
  });

  // For emergency appointment
  await prisma.interaction.create({
    data: {
      appointmentId: appointments[4].id,
      patientId: patients[4].id,
      staffId: staffProfiles[3].id,
      department: "EMERGENCY",
      priority: "URGENT",
      appointmentType: "EMERGENCY",
      symptomCount: 5,
      checkInTime: appointments[4].checkedInAt!,
      predictedDuration: 45,
    },
  });

  // ==========================================
  // 6. CREATE VITAL SIGNS
  // ==========================================
  console.log("❤️ Creating vital signs...");

  await Promise.all([
    prisma.vitalSigns.create({
      data: {
        patientId: patients[0].id,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        heartRate: 72,
        temperature: 36.6,
        weight: 70,
        height: 175,
        oxygenSaturation: 98,
        respiratoryRate: 16,
      },
    }),
    prisma.vitalSigns.create({
      data: {
        patientId: patients[1].id,
        bloodPressureSystolic: 118,
        bloodPressureDiastolic: 78,
        heartRate: 85,
        temperature: 37.1,
        weight: 65,
        height: 165,
        oxygenSaturation: 97,
        respiratoryRate: 18,
      },
    }),
    prisma.vitalSigns.create({
      data: {
        patientId: patients[2].id,
        bloodPressureSystolic: 135,
        bloodPressureDiastolic: 85,
        heartRate: 78,
        temperature: 36.8,
        weight: 80,
        height: 180,
        oxygenSaturation: 99,
        respiratoryRate: 15,
      },
    }),
  ]);

  // ==========================================
  // 7. CREATE PRESCRIPTIONS
  // ==========================================
  console.log("💊 Creating prescriptions...");

  await Promise.all([
    prisma.prescription.create({
      data: {
        patientId: patients[1].id,
        staffId: staffProfiles[0].id,
        appointmentId: appointments[1].id,
        medicationName: "Ventolin Inhaler",
        dosage: "2 puffs",
        frequency: "Every 4-6 hours as needed",
        duration: "30 days",
        quantity: 1,
        instructions: "Use when experiencing wheezing or shortness of breath",
        status: "ACTIVE",
      },
    }),
    prisma.prescription.create({
      data: {
        patientId: patients[2].id,
        staffId: staffProfiles[0].id,
        medicationName: "Metformin",
        dosage: "500mg",
        frequency: "Twice daily",
        duration: "90 days",
        quantity: 180,
        instructions: "Take with meals",
        status: "ACTIVE",
      },
    }),
    prisma.prescription.create({
      data: {
        patientId: patients[4].id,
        staffId: staffProfiles[3].id,
        medicationName: "Aspirin",
        dosage: "81mg",
        frequency: "Once daily",
        duration: "30 days",
        quantity: 30,
        instructions: "Take in the morning with food",
        status: "ACTIVE",
      },
    }),
  ]);

  // ==========================================
  // 8. CREATE NOTIFICATIONS
  // ==========================================
  console.log("🔔 Creating notifications...");

  await Promise.all([
    prisma.notification.create({
      data: {
        patientId: patients[0].id,
        type: "APPOINTMENT_REMINDER",
        title: "Appointment Reminder",
        message: "You have an appointment tomorrow at 2:00 PM",
        priority: "NORMAL",
      },
    }),
    prisma.notification.create({
      data: {
        patientId: patients[1].id,
        type: "PRESCRIPTION_READY",
        title: "Prescription Ready",
        message: "Your prescription for Ventolin is ready for pickup",
        priority: "NORMAL",
      },
    }),
    prisma.notification.create({
      data: {
        patientId: patients[2].id,
        type: "MEDICATION_REMINDER",
        title: "Medication Reminder",
        message: "Remember to take your Metformin with breakfast",
        priority: "LOW",
      },
    }),
    prisma.notification.create({
      data: {
        patientId: patients[3].id,
        type: "SYSTEM_ANNOUNCEMENT",
        title: "New Virtual Consultation Feature",
        message: "Now you can book virtual consultations for mental health",
        priority: "LOW",
      },
    }),
  ]);

  // ==========================================
  // 9. CREATE MORE HISTORICAL INTERACTIONS FOR ML TRAINING
  // ==========================================
  console.log("📊 Creating historical interactions for ML training...");

  const historicalInteractions = [];
  
  // Generate 30 historical interactions with various durations
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    const departments: any[] = ["GENERAL_MEDICINE", "EMERGENCY", "PEDIATRICS", "MENTAL_HEALTH"];
    const priorities: any[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
    const types: any[] = ["WALK_IN", "SCHEDULED", "FOLLOW_UP", "ROUTINE_CHECKUP"];
    
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const symptomCount = Math.floor(Math.random() * 5) + 1;
    
    // Base duration calculation (for ML comparison)
    let baseDuration = 20;
    if (dept === "EMERGENCY") baseDuration = 30;
    if (dept === "MENTAL_HEALTH") baseDuration = 45;
    if (priority === "URGENT") baseDuration *= 1.5;
    if (priority === "LOW") baseDuration *= 0.8;
    
    const actualDuration = Math.floor(baseDuration + (Math.random() * 15) - 7);
    const predictedDuration = Math.floor(baseDuration + (Math.random() * 10) - 5);
    
    const patient = patients[Math.floor(Math.random() * patients.length)];
    const staff = staffProfiles[Math.floor(Math.random() * staffProfiles.length)];
    
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        staffId: staff.id,
        appointmentDate: date,
        appointmentTime: "10:00",
        department: dept,
        type: type,
        status: "COMPLETED",
        priority: priority,
        reason: `Symptoms: ${symptomCount} reported`,
        completedAt: new Date(date.getTime() + actualDuration * 60000),
      },
    });
    
    const interaction = await prisma.interaction.create({
      data: {
        appointmentId: appointment.id,
        patientId: patient.id,
        staffId: staff.id,
        department: dept,
        priority: priority,
        appointmentType: type,
        symptomCount: symptomCount,
        checkInTime: date,
        checkoutTime: new Date(date.getTime() + actualDuration * 60000),
        totalDuration: actualDuration,
        predictedDuration: predictedDuration,
      },
    });
    
    historicalInteractions.push(interaction);
  }

  console.log("✅ Database seed completed successfully!");
  console.log(`
📊 SEED SUMMARY:
================
👥 Users:
  • Admin: 1 (admin@dkut.ac.ke / admin123)
  • Staff: ${staffUsers.length} (dr.mwangi@dkut.ac.ke / staff123)
  • Patients: ${patients.length} (john.student@dkut.ac.ke / patient123)

👨‍⚕️ Staff Profiles:
  • Doctors: 3
  • Nurse: 1
  • Receptionist: 1

🏥 Patient Profiles: ${patients.length}
📅 Appointments: ${appointments.length} current + ${historicalInteractions.length} historical
⏱️ Interactions: ${historicalInteractions.length + 4} total (with time tracking)
💊 Prescriptions: 3 active
❤️ Vital Signs: 3 records
🔔 Notifications: 4

🔑 TEST CREDENTIALS:
====================
Admin Dashboard: admin@dkut.ac.ke / admin123
Staff Portal: dr.mwangi@dkut.ac.ke / staff123
Patient Portal: john.student@dkut.ac.ke / patient123

🎯 ML TRAINING DATA:
====================
• ${historicalInteractions.length} historical interactions created
• Departments: GENERAL_MEDICINE, EMERGENCY, PEDIATRICS, MENTAL_HEALTH
• Priorities: LOW, NORMAL, HIGH, URGENT
• Appointment types: WALK_IN, SCHEDULED, FOLLOW_UP, ROUTINE_CHECKUP
• Symptom counts: 1-5

📈 READY FOR ML SERVICE:
=======================
Run ML service to train on this data:
1. Start ML service: cd ml_service && python app.py
2. Export data: GET /api/interactions/export
3. Train model: POST /ml/train

🚀 NEXT STEPS:
==============
1. Start backend: npm run dev
2. Start ML service: cd ml_service && python app.py
3. Test endpoints with seed data
4. Use Prisma Studio: npx prisma studio
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });