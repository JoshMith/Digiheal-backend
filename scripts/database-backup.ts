import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function backup() {
  console.log('📦 Creating complete backup...\n');
  
  try {
    // Backup all tables in correct dependency order
    const backup = {
      timestamp: new Date().toISOString(),
      databaseVersion: '1.0',
      
      // Backup order: parent tables first, child tables last
      system_settings: await prisma.systemSettings.findMany(),
      users: await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          passwordHash: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          emailVerified: true,
          resetToken: true,
          resetTokenExpiry: true,
          verificationToken: true,
          verificationExpiry: true,
        }
      }),
      
      patients: await prisma.patient.findMany(),
      staff: await prisma.staff.findMany(),
      
      notification_preferences: await prisma.notificationPreference.findMany(),
      appointment_slots: await prisma.appointmentSlot.findMany(),
      
      health_assessments: await prisma.healthAssessment.findMany(),
      medical_records: await prisma.medicalRecord.findMany(),
      
      appointments: await prisma.appointment.findMany(),
      consultations: await prisma.consultation.findMany(),
      
      vital_signs: await prisma.vitalSign.findMany(),
      prescriptions: await prisma.prescription.findMany(),
      feedbacks: await prisma.feedback.findMany(),
      notifications: await prisma.notification.findMany(),
      
      // Machine learning related
      ml_prediction_logs: await prisma.mLPredictionLog.findMany(),
      
      // Virtual consultations
      virtual_consultations: await prisma.virtualConsultation.findMany(),
      
      // Waitlists
      waitlists: await prisma.waitlist.findMany(),
      
      // Audit logs (typically kept separate, but included for completeness)
      audit_logs: await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10000 // Limit to prevent huge backups
      })
    };
    
    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Save backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `complete-backup-${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
    
    console.log('✅ Backup created successfully!');
    console.log(`📁 Location: ${filePath}`);
    console.log(`📅 Timestamp: ${new Date(backup.timestamp).toLocaleString()}`);
    
    console.log('\n📊 Summary:');
    console.log(`  System Settings: ${backup.system_settings.length}`);
    console.log(`  Users: ${backup.users.length}`);
    console.log(`  Patients: ${backup.patients.length}`);
    console.log(`  Staff: ${backup.staff.length}`);
    console.log(`  Notification Preferences: ${backup.notification_preferences.length}`);
    console.log(`  Appointment Slots: ${backup.appointment_slots.length}`);
    console.log(`  Health Assessments: ${backup.health_assessments.length}`);
    console.log(`  Medical Records: ${backup.medical_records.length}`);
    console.log(`  Appointments: ${backup.appointments.length}`);
    console.log(`  Consultations: ${backup.consultations.length}`);
    console.log(`  Vital Signs: ${backup.vital_signs.length}`);
    console.log(`  Prescriptions: ${backup.prescriptions.length}`);
    console.log(`  Feedbacks: ${backup.feedbacks.length}`);
    console.log(`  Notifications: ${backup.notifications.length}`);
    console.log(`  ML Prediction Logs: ${backup.ml_prediction_logs.length}`);
    console.log(`  Virtual Consultations: ${backup.virtual_consultations.length}`);
    console.log(`  Waitlists: ${backup.waitlists.length}`);
    console.log(`  Audit Logs: ${backup.audit_logs.length}`);
    
    // Create a manifest file
    const manifest = {
      backupFile: fileName,
      created: backup.timestamp,
      records: {
        total: Object.values(backup).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
        byTable: Object.entries(backup).reduce((acc, [key, value]) => {
          if (Array.isArray(value)) {
            acc[key] = value.length;
          }
          return acc;
        }, {} as Record<string, number>)
      }
    };
    
    const manifestPath = path.join(backupDir, `manifest-${timestamp}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📄 Manifest: ${manifestPath}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run backup
backup();