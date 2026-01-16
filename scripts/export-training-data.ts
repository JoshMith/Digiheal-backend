// import { PrismaClient } from '@prisma/client';
// import { writeFileSync } from 'fs';
// import { join, dirname } from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const prisma = new PrismaClient();

// async function exportTrainingData() {
//   console.log('📤 Exporting training data for ML...');
  
//   try {
//     // Fetch all completed interactions with their appointments
//     const interactions = await prisma.interaction.findMany({
//       include: {
//         appointment: true,
//         patient: true,
//         staff: true
//       },
//       where: {
//         totalDuration: { not: null },
//         predictedDuration: { not: null }
//       },
//       orderBy: { checkInTime: 'desc' }
//     });
    
//     console.log(`📊 Found ${interactions.length} interactions`);
    
//     // Format data for ML training
//     const trainingData = interactions.map(interaction => {
//       // Extract hour from check-in time
//       const hour = interaction.checkInTime.getHours();
      
//       return {
//         // Features
//         department: interaction.department,
//         priority: interaction.priority,
//         appointmentType: interaction.appointmentType,
//         symptomCount: interaction.symptomCount,
//         timeOfDay: hour,
//         dayOfWeek: interaction.checkInTime.getDay(), // 0=Sunday, 6=Saturday
        
//         // Actual outcome (label)
//         actualDuration: interaction.totalDuration,
        
//         // Previous prediction
//         predictedDuration: interaction.predictedDuration,
        
//         // Metadata
//         appointmentId: interaction.appointmentId,
//         checkInTime: interaction.checkInTime.toISOString()
//       };
//     });
    
//     // Save as JSON for ML service
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//     const filename = `training-data-${timestamp}.json`;
//     const filepath = join(__dirname, '..', 'data', filename);
    
//     writeFileSync(filepath, JSON.stringify(trainingData, null, 2));
//     console.log(`✅ Data exported to: ${filepath}`);
//     console.log(`📋 Sample record:`);
//     console.log(JSON.stringify(trainingData[0], null, 2));
    
//     // Also save as CSV
//     const csvContent = [
//       // Header
//       ['department', 'priority', 'appointmentType', 'symptomCount', 'timeOfDay', 'dayOfWeek', 'actualDuration', 'predictedDuration'].join(','),
//       // Data
//       ...trainingData.map(d => [
//         d.department,
//         d.priority,
//         d.appointmentType,
//         d.symptomCount,
//         d.timeOfDay,
//         d.dayOfWeek,
//         d.actualDuration,
//         d.predictedDuration
//       ].join(','))
//     ].join('\n');
    
//     const csvFilename = `training-data-${timestamp}.csv`;
//     const csvFilepath = join(__dirname, '..', 'data', csvFilename);
//     writeFileSync(csvFilepath, csvContent);
//     console.log(`📊 CSV exported to: ${csvFilepath}`);
    
//   } catch (error: any) {
//     console.error('❌ Error exporting data:', error.message);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// exportTrainingData();