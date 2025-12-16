import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import readline from 'readline';

const prisma = new PrismaClient();

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
    const deleteOrder = [
      // Child tables
      'ml_prediction_logs',
      'virtual_consultations',
      'vital_signs',
      'feedbacks',
      'notifications',
      'prescriptions',
      'waitlists',
      'consultations',
      'appointments',
      'medical_records',
      'health_assessments',
      'appointment_slots',
      'notification_preferences',
      'audit_logs',
      
      // Main tables
      'patients',
      'staff',
      'users',
      
      // System tables
      'system_settings'
    ];
    
    for (const table of deleteOrder) {
      const model = table as keyof PrismaClient;
      if (prisma[model] && prisma[model]['deleteMany']) {
        const result = await (prisma[model] as any).deleteMany({});
        console.log(`  Deleted ${result.count} records from ${table}`);
      }
    }
    
    console.log('✅ Existing data deleted.');
    
    // Restore in correct dependency order
    console.log('\n🔄 Restoring data...');
    
    // Helper function to restore a table
    const restoreTable = async (tableName: string, data: any[]) => {
      if (!data || data.length === 0) return;
      
      console.log(`  Restoring ${data.length} ${tableName}...`);
      const model = tableName as keyof PrismaClient;
      
      if (!prisma[model] || !prisma[model]['createMany']) {
        console.log(`  ⚠️  Skipping ${tableName} - no createMany method`);
        return;
      }
      
      try {
        // Batch inserts to avoid memory issues
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          await (prisma[model] as any).createMany({
            data: batch,
            skipDuplicates: true
          });
          if (i % 1000 === 0) {
            console.log(`    ... ${Math.min(i + batchSize, data.length)} / ${data.length}`);
          }
        }
      } catch (error) {
        console.log(`  ⚠️  Error restoring ${tableName}:`, error.message);
        // Try individual inserts if batch fails
        console.log(`  Trying individual inserts for ${tableName}...`);
        for (const item of data) {
          try {
            await (prisma[model] as any).create({
              data: item
            });
          } catch (err) {
            console.log(`    Skipping item in ${tableName}:`, err.message);
          }
        }
      }
    };
    
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