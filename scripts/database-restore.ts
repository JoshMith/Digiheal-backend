import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import readline from 'readline';

const prisma = new PrismaClient();

// Define a type-safe way to access models
type PrismaModels = {
  system_settings: typeof prisma.system_settings;
  user: typeof prisma.user;
  patient: typeof prisma.patient;
  staff: typeof prisma.staff;
  notification_preferences: typeof prisma.notification_preferences;
  appointment_slots: typeof prisma.appointment_slots;
  health_assessment: typeof prisma.healthAssessment;
  medical_record: typeof prisma.medicalRecord;
  appointment: typeof prisma.appointment;
  consultation: typeof prisma.consultation;
  vital_signs: typeof prisma.vitalSign;
  prescription: typeof prisma.prescription;
  feedback: typeof prisma.feedback;
  notification: typeof prisma.notification;
  ml_prediction_logs: typeof prisma.mlPredictionLogs;
  virtual_consultations: typeof prisma.virtualConsultations;
  waitlist: typeof prisma.waitlist;
  audit_logs: typeof prisma.auditLogs;
};

async function restore(filePath: string) {
  console.log('🚀 Starting complete restore...\n');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ Backup file not found:', filePath);
    return;
  }
  
  try {
    // Load backup
    const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`📂 Loaded backup from: ${new Date(backup.timestamp).toLocaleString()}`);
    console.log(`📊 Database Version: ${backup.databaseVersion || 'N/A'}`);
    
    // Display summary
    console.log('\n📊 Records to restore:');
    const tables = [
      'system_settings', 'users', 'patients', 'staff', 
      'notification_preferences', 'appointment_slots',
      'health_assessments', 'medical_records',
      'appointments', 'consultations',
      'vital_signs', 'prescriptions', 'feedbacks', 'notifications',
      'ml_prediction_logs', 'virtual_consultations', 'waitlists', 'audit_logs'
    ];
    
    tables.forEach(table => {
      const count = backup[table]?.length || 0;
      if (count > 0) {
        console.log(`  ${table.padEnd(25)}: ${count}`);
      }
    });
    
    // Ask for confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>(resolve => {
      rl.question('\n❓ Are you ABSOLUTELY sure you want to restore? This will DELETE ALL existing data! (yes/no): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('❌ Restore cancelled.');
      return;
    }
    
    console.log('\n🗑️  Deleting existing data (in reverse order)...');
    
    // Delete in reverse dependency order (children first, parents last)
    // Note: Using explicit calls to avoid TypeScript errors
    console.log('  Deleting ml_prediction_logs...');
    await prisma.mLPredictionLog.deleteMany({});
    
    console.log('  Deleting virtual_consultations...');
    await prisma.virtualConsultation.deleteMany({});
    
    console.log('  Deleting vital_signs...');
    await prisma.vitalSign.deleteMany({});
    
    console.log('  Deleting feedbacks...');
    await prisma.feedback.deleteMany({});
    
    console.log('  Deleting notifications...');
    await prisma.notification.deleteMany({});
    
    console.log('  Deleting prescriptions...');
    await prisma.prescription.deleteMany({});
    
    console.log('  Deleting waitlists...');
    await prisma.waitlist.deleteMany({});
    
    console.log('  Deleting consultations...');
    await prisma.consultation.deleteMany({});
    
    console.log('  Deleting appointments...');
    await prisma.appointment.deleteMany({});
    
    console.log('  Deleting medical_records...');
    await prisma.medicalRecord.deleteMany({});
    
    console.log('  Deleting health_assessments...');
    await prisma.healthAssessment.deleteMany({});
    
    console.log('  Deleting appointment_slots...');
    await prisma.appointmentSlot.deleteMany({});
    
    console.log('  Deleting notification_preferences...');
    await prisma.notificationPreference.deleteMany({});
    
    console.log('  Deleting audit_logs...');
    await prisma.auditLog.deleteMany({});
    
    console.log('  Deleting patients...');
    await prisma.patient.deleteMany({});
    
    console.log('  Deleting staff...');
    await prisma.staff.deleteMany({});
    
    console.log('  Deleting users...');
    await prisma.user.deleteMany({});
    
    console.log('  Deleting system_settings...');
    await prisma.systemSettings.deleteMany({});
    
    console.log('✅ Existing data deleted.');
    
    // Restore in correct dependency order
    console.log('\n🔄 Restoring data...');
    
    // Helper function to restore a table
    const restoreTable = async (tableName: string, data: any[]) => {
      if (!data || data.length === 0) return;
      
      console.log(`  Restoring ${data.length} ${tableName}...`);
      
      try {
        // Map table names to Prisma models
        const modelMap: Record<string, any> = {
          'system_settings': prisma.systemSettings,
          'users': prisma.user,
          'patients': prisma.patient,
          'staff': prisma.staff,
          'notification_preferences': prisma.notificationPreference,
          'appointment_slots': prisma.appointmentSlot,
          'health_assessments': prisma.healthAssessment,
          'medical_records': prisma.medicalRecord,
          'appointments': prisma.appointment,
          'consultations': prisma.consultation,
          'vital_signs': prisma.vitalSign,
          'prescriptions': prisma.prescription,
          'feedbacks': prisma.feedback,
          'notifications': prisma.notification,
          'ml_prediction_logs': prisma.mLPredictionLog,
          'virtual_consultations': prisma.virtualConsultation,
          'waitlists': prisma.waitlist,
          'audit_logs': prisma.auditLog
        };
        
        const model = modelMap[tableName];
        if (!model || !model.createMany) {
          console.log(`  ⚠️  Skipping ${tableName} - model not found`);
          return;
        }
        
        // Batch inserts to avoid memory issues
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          await model.createMany({
            data: batch,
            skipDuplicates: true
          });
          if (i % 1000 === 0) {
            console.log(`    ... ${Math.min(i + batchSize, data.length)} / ${data.length}`);
          }
        }
      } catch (error: any) {
        console.log(`  ⚠️  Error restoring ${tableName}:`, error.message);
        // Try individual inserts if batch fails
        console.log(`  Trying individual inserts for ${tableName}...`);
        for (const item of data) {
          try {
            const model = getModel(tableName);
            if (model && model.create) {
              await model.create({
                data: item
              });
            }
          } catch (err: any) {
            console.log(`    Skipping item in ${tableName}:`, err.message);
          }
        }
      }
    };
    
    // Helper function to get model by name
    function getModel(tableName: string) {
      const modelMap: Record<string, any> = {
        'system_settings': prisma.systemSettings,
        'users': prisma.user,
        'patients': prisma.patient,
        'staff': prisma.staff,
        'notification_preferences': prisma.notificationPreference,
        'appointment_slots': prisma.appointmentSlot,
        'health_assessments': prisma.healthAssessment,
        'medical_records': prisma.medicalRecord,
        'appointments': prisma.appointment,
        'consultations': prisma.consultation,
        'vital_signs': prisma.vitalSign,
        'prescriptions': prisma.prescription,
        'feedbacks': prisma.feedback,
        'notifications': prisma.notification,
        'ml_prediction_logs': prisma.mLPredictionLog,
        'virtual_consultations': prisma.virtualConsultation,
        'waitlists': prisma.waitlist,
        'audit_logs': prisma.auditLog
      };
      return modelMap[tableName];
    }
    
    // Restore in correct order
    const restoreOrder = [
      { table: 'system_settings', data: backup.system_settings },
      { table: 'users', data: backup.users },
      { table: 'patients', data: backup.patients },
      { table: 'staff', data: backup.staff },
      { table: 'notification_preferences', data: backup.notification_preferences },
      { table: 'appointment_slots', data: backup.appointment_slots },
      { table: 'health_assessments', data: backup.health_assessments },
      { table: 'medical_records', data: backup.medical_records },
      { table: 'appointments', data: backup.appointments },
      { table: 'consultations', data: backup.consultations },
      { table: 'vital_signs', data: backup.vital_signs },
      { table: 'prescriptions', data: backup.prescriptions },
      { table: 'feedbacks', data: backup.feedbacks },
      { table: 'notifications', data: backup.notifications },
      { table: 'ml_prediction_logs', data: backup.ml_prediction_logs },
      { table: 'virtual_consultations', data: backup.virtual_consultations },
      { table: 'waitlists', data: backup.waitlists },
      { table: 'audit_logs', data: backup.audit_logs }
    ];
    
    for (const { table, data } of restoreOrder) {
      await restoreTable(table, data);
    }
    
    console.log('\n✅ Restore completed successfully!');
    console.log('🎉 Database has been restored from backup.');
    
  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get file path from command line
const filePath = process.argv[2];
if (!filePath) {
  console.log('Usage: npx tsx scripts/complete-restore.ts <backup-file.json>');
  console.log('Example: npx tsx scripts/complete-restore.ts backups/complete-backup-2024-01-15T10-30-00Z.json');
  process.exit(1);
}

restore(filePath);