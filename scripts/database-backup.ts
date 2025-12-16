// scripts/database-backup.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface BackupMetadata {
  timestamp: string;
  version: string;
  databaseName: string;
  recordCounts: Record<string, number>;
  schemaHash: string;
}

class DatabaseBackup {
  private backupDir: string;
  
  constructor() {
    // Create backups directory with date
    const dateStr = new Date().toISOString().split('T')[0];
    this.backupDir = path.join(process.cwd(), 'backups', dateStr);
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }
  
  async getSchemaHash(): Promise<string> {
    try {
      // Get schema.prisma hash
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      
      // Simple hash calculation
      let hash = 0;
      for (let i = 0; i < schemaContent.length; i++) {
        hash = ((hash << 5) - hash) + schemaContent.charCodeAt(i);
        hash = hash & hash;
      }
      
      return Math.abs(hash).toString(16);
    } catch (error) {
      console.warn('⚠️ Could not calculate schema hash:', error);
      return 'unknown';
    }
  }
  
  async backup(): Promise<void> {
    console.log('🚀 Starting database backup...');
    console.log('==============================');
    
    const startTime = Date.now();
    
    try {
      // Get metadata
      const schemaHash = await this.getSchemaHash();
      
      // Backup all tables with relationships preserved
      const backupData = {
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          databaseName: 'dkut_medical',
          schemaHash,
        },
        
        data: {
          // User management
          users: await this.backupTable('user', ['patient', 'staff']),
          
          // Patient data
          patients: await this.backupTable('patient', [
            'user',
            'appointments',
            'healthAssessments',
            'consultations',
            'prescriptions',
            'vitalSigns',
            'medicalRecords',
            'notifications',
            'feedbacks',
          ]),
          
          // Staff data
          staff: await this.backupTable('staff', [
            'user',
            'appointments',
            'consultations',
            'prescriptions',
            'healthAssessments',
            'schedules',
          ]),
          
          // Schedules & slots
          schedules: await this.backupTable('schedule', [
            'staff',
            'appointments',
            'appointmentSlots',
          ]),
          
          appointmentSlots: await this.backupTable('appointmentSlot', [
            'schedule',
            'appointment',
          ]),
          
          // Health assessments
          healthAssessments: await this.backupTable('healthAssessment', [
            'patient',
            'staff',
            'appointments',
          ]),
          
          // Appointments
          appointments: await this.backupTable('appointment', [
            'patient',
            'staff',
            'healthAssessment',
            'schedule',
            'appointmentSlot',
            'consultation',
            'feedback',
          ]),
          
          // Consultations
          consultations: await this.backupTable('consultation', [
            'appointment',
            'patient',
            'staff',
            'prescriptions',
            'vitalSigns',
          ]),
          
          // Prescriptions
          prescriptions: await this.backupTable('prescription', [
            'patient',
            'staff',
            'consultation',
            'refills',
          ]),
          
          prescriptionRefills: await this.backupTable('prescriptionRefill', [
            'prescription',
            'approvedBy',
          ]),
          
          // Vital signs
          vitalSigns: await this.backupTable('vitalSign', [
            'patient',
            'consultation',
          ]),
          
          // Medical records
          medicalRecords: await this.backupTable('medicalRecord', [
            'patient',
            'uploadedBy',
          ]),
          
          // Notifications
          notifications: await this.backupTable('notification', [
            'patient',
            'staff',
          ]),
          
          // Feedback
          feedbacks: await this.backupTable('feedback', [
            'patient',
            'appointment',
            'staff',
          ]),
          
          // Inventory
          inventory: await this.backupTable('inventory', []),
          
          // Invoices
          invoices: await this.backupTable('invoice', [
            'patient',
            'appointment',
          ]),
          
          // System data
          systemSettings: await this.backupTable('systemSettings', []),
          auditLogs: await this.backupTable('auditLog', []),
          analyticsReports: await this.backupTable('analyticsReport', []),
        },
      };
      
      // Calculate record counts
      const recordCounts: Record<string, number> = {};
      Object.entries(backupData.data).forEach(([key, value]) => {
        recordCounts[key] = Array.isArray(value) ? value.length : 0;
      });
      
      // Add record counts to metadata
      backupData.metadata.recordCounts = recordCounts;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup_${timestamp}.json`;
      const filePath = path.join(this.backupDir, fileName);
      
      // Save backup
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
      
      // Create a summary file
      await this.createBackupSummary(backupData, filePath);
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log(`\n✅ Backup completed successfully!`);
      console.log(`📁 Location: ${filePath}`);
      console.log(`⏱️  Duration: ${duration} seconds`);
      console.log(`📊 Total records: ${Object.values(recordCounts).reduce((a, b) => a + b, 0)}`);
      console.log(`\n📋 Summary:`);
      Object.entries(recordCounts).forEach(([table, count]) => {
        if (count > 0) {
          console.log(`  ${table.padEnd(25)}: ${count}`);
        }
      });
      
      // Keep only last 5 backups
      await this.cleanupOldBackups();
      
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
  
  private async backupTable(tableName: string, includeRelations: string[] = []): Promise<any[]> {
    console.log(`  📦 Backing up ${tableName}...`);
    
    try {
      // Dynamically build include object
      const include: any = {};
      includeRelations.forEach(relation => {
        include[relation] = true;
      });
      
      // @ts-ignore - Dynamic table access
      const records = await prisma[tableName].findMany({
        include: Object.keys(include).length > 0 ? include : undefined,
      });
      
      return records;
    } catch (error) {
      console.warn(`  ⚠️ Could not backup ${tableName}:`, error.message);
      return [];
    }
  }
  
  private async createBackupSummary(backupData: any, filePath: string): Promise<void> {
    const summaryPath = path.join(this.backupDir, 'summary.json');
    
    const summary = {
      backupFile: path.basename(filePath),
      metadata: backupData.metadata,
      fileSize: this.formatFileSize(fs.statSync(filePath).size),
      createdAt: new Date().toISOString(),
    };
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  }
  
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
  
  private async cleanupOldBackups(): Promise<void> {
    const backupsRoot = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupsRoot)) {
      return;
    }
    
    // Get all backup directories sorted by date (newest first)
    const backupDirs = fs.readdirSync(backupsRoot)
      .filter(dir => fs.statSync(path.join(backupsRoot, dir)).isDirectory())
      .sort()
      .reverse();
    
    // Keep only last 5 days of backups
    if (backupDirs.length > 5) {
      const dirsToDelete = backupDirs.slice(5);
      
      for (const dir of dirsToDelete) {
        const dirPath = path.join(backupsRoot, dir);
        console.log(`  🗑️  Cleaning up old backup: ${dir}`);
        
        // Remove directory recursively
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    }
  }
}

// Run backup
async function main() {
  console.log('🔐 DKUT Medical Center Database Backup');
  console.log('======================================\n');
  
  const backup = new DatabaseBackup();
  await backup.backup();
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});