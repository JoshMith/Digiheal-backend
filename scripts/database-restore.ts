// scripts/database-restore.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const prisma = new PrismaClient();

interface RestoreOptions {
  backupFile: string;
  skipRelations?: string[];
  truncateFirst?: boolean;
  dryRun?: boolean;
}

class DatabaseRestore {
  private backupData: any;
  private recordCounts: Record<string, number> = {};
  private errors: string[] = [];
  
  async restore(options: RestoreOptions): Promise<void> {
    console.log('🚀 Starting database restore...');
    console.log('===============================\n');
    
    try {
      // Load backup file
      await this.loadBackupFile(options.backupFile);
      
      // Show backup info
      this.showBackupInfo();
      
      // Ask for confirmation
      if (!(await this.confirmRestore(options))) {
        console.log('❌ Restore cancelled by user.');
        return;
      }
      
      // Truncate tables if requested
      if (options.truncateFirst && !options.dryRun) {
        await this.truncateTables();
      }
      
      // Restore data
      await this.restoreData(options);
      
      // Show summary
      this.showRestoreSummary();
      
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
  
  private async loadBackupFile(filePath: string): Promise<void> {
    console.log(`📂 Loading backup file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    this.backupData = JSON.parse(fileContent);
    
    if (!this.backupData.data || !this.backupData.metadata) {
      throw new Error('Invalid backup file format');
    }
    
    console.log(`✅ Backup loaded (${this.backupData.metadata.timestamp})`);
  }
  
  private showBackupInfo(): void {
    const meta = this.backupData.metadata;
    
    console.log('\n📋 Backup Information:');
    console.log('=====================');
    console.log(`Date: ${new Date(meta.timestamp).toLocaleString()}`);
    console.log(`Database: ${meta.databaseName}`);
    console.log(`Schema Hash: ${meta.schemaHash}`);
    console.log('\n📊 Record Counts:');
    
    Object.entries(meta.recordCounts || {}).forEach(([table, count]) => {
      if (Number(count) > 0) {
        console.log(`  ${table.padEnd(25)}: ${count}`);
      }
    });
    
    console.log(`\n📈 Total records: ${Object.values(meta.recordCounts || {}).reduce((a: number, b: number) => a + b, 0)}`);
  }
  
  private async confirmRestore(options: RestoreOptions): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    console.log('\n⚠️  WARNING: This will modify your database!');
    
    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made.');
    }
    
    if (options.truncateFirst) {
      console.log('🗑️  Existing data will be TRUNCATED before restore!');
    }
    
    return new Promise((resolve) => {
      rl.question('\n❓ Are you sure you want to continue? (yes/no): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }
  
  private async truncateTables(): Promise<void> {
    console.log('\n🗑️  Truncating tables...');
    
    // Disable foreign key checks temporarily
    await prisma.$executeRaw`SET session_replication_role = 'replica';`;
    
    // Truncate tables in correct order (child to parent)
    const tables = [
      'prescription_refills',
      'prescriptions',
      'vital_signs',
      'feedbacks',
      'notifications',
      'medical_records',
      'appointment_slots',
      'schedules',
      'consultations',
      'appointments',
      'health_assessments',
      'waitlist_entries',
      'inventory',
      'invoices',
      'analytics_reports',
      'audit_logs',
      'system_settings',
      'patients',
      'staff',
      'users',
    ];
    
    for (const table of tables) {
      try {
        await prisma.$executeRaw`TRUNCATE TABLE ${table} CASCADE;`;
        console.log(`  ✅ Truncated: ${table}`);
      } catch (error) {
        console.log(`  ⚠️  Could not truncate ${table}: ${error.message}`);
      }
    }
    
    // Re-enable foreign key checks
    await prisma.$executeRaw`SET session_replication_role = 'origin';`;
    
    console.log('✅ All tables truncated.');
  }
  
  private async restoreData(options: RestoreOptions): Promise<void> {
    console.log('\n🔄 Restoring data...');
    
    // Restore in correct order (parent to child)
    const restoreOrder = [
      'users',
      'patients',
      'staff',
      'schedules',
      'appointmentSlots',
      'healthAssessments',
      'appointments',
      'consultations',
      'prescriptions',
      'prescriptionRefills',
      'vitalSigns',
      'medicalRecords',
      'notifications',
      'feedbacks',
      'inventory',
      'invoices',
      'systemSettings',
      'auditLogs',
      'analyticsReports',
    ];
    
    for (const table of restoreOrder) {
      if (this.backupData.data[table] && this.backupData.data[table].length > 0) {
        await this.restoreTable(table, options);
      }
    }
  }
  
  private async restoreTable(tableName: string, options: RestoreOptions): Promise<void> {
    const records = this.backupData.data[tableName];
    console.log(`\n  📥 Restoring ${tableName} (${records.length} records)...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process records in batches
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          // Clean the record (remove relations if needed)
          const cleanRecord = this.cleanRecord(record, options.skipRelations || []);
          
          if (!options.dryRun) {
            // @ts-ignore - Dynamic table access
            await prisma[tableName].create({
              data: cleanRecord,
            });
          }
          
          successCount++;
        } catch (error) {
          errorCount++;
          this.errors.push(`Error restoring ${tableName} record ${record.id}: ${error.message}`);
          
          // Show first few errors
          if (errorCount <= 3) {
            console.log(`    ⚠️  Error: ${error.message}`);
          }
        }
      }
      
      // Show progress
      const progress = Math.min(i + batchSize, records.length);
      const percent = ((progress / records.length) * 100).toFixed(1);
      process.stdout.write(`    Progress: ${progress}/${records.length} (${percent}%)\r`);
    }
    
    this.recordCounts[tableName] = successCount;
    
    console.log(`\n    ✅ ${successCount} restored, ❌ ${errorCount} errors`);
  }
  
  private cleanRecord(record: any, skipRelations: string[]): any {
    const clean: any = { ...record };
    
    // Remove auto-generated fields
    delete clean.createdAt;
    delete clean.updatedAt;
    
    // Remove relation fields
    Object.keys(clean).forEach(key => {
      if (typeof clean[key] === 'object' && clean[key] !== null) {
        delete clean[key];
      }
    });
    
    // Handle specific skipped relations
    skipRelations.forEach(relation => {
      delete clean[relation];
      delete clean[`${relation}Id`];
    });
    
    return clean;
  }
  
  private showRestoreSummary(): void {
    console.log('\n🎉 Restore completed!');
    console.log('===================\n');
    
    console.log('📊 Restored records:');
    Object.entries(this.recordCounts).forEach(([table, count]) => {
      if (count > 0) {
        console.log(`  ${table.padEnd(25)}: ${count}`);
      }
    });
    
    const totalRestored = Object.values(this.recordCounts).reduce((a, b) => a + b, 0);
    console.log(`\n📈 Total restored: ${totalRestored}`);
    
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors encountered: ${this.errors.length}`);
      if (this.errors.length <= 5) {
        this.errors.forEach(error => console.log(`  - ${error}`));
      } else {
        console.log('  (Showing first 5 errors)');
        this.errors.slice(0, 5).forEach(error => console.log(`  - ${error}`));
      }
      
      // Save errors to file
      const errorLogPath = path.join(process.cwd(), 'restore-errors.log');
      fs.writeFileSync(errorLogPath, this.errors.join('\n'));
      console.log(`\n📝 Full error log saved to: ${errorLogPath}`);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/database-restore.ts <backup-file> [options]');
    console.log('\nOptions:');
    console.log('  --dry-run           Show what would be restored without making changes');
    console.log('  --truncate          Truncate tables before restore');
    console.log('  --skip-relations    Skip restoring relation data');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/database-restore.ts backups/2024-12-15/backup_*.json');
    console.log('  npx tsx scripts/database-restore.ts backup.json --dry-run --truncate');
    return;
  }
  
  const backupFile = args[0];
  const options: RestoreOptions = {
    backupFile,
    truncateFirst: args.includes('--truncate'),
    dryRun: args.includes('--dry-run'),
    skipRelations: args.includes('--skip-relations') ? ['patient', 'staff'] : [],
  };
  
  const restore = new DatabaseRestore();
  await restore.restore(options);
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});