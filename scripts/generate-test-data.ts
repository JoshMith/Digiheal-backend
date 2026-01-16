import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateTestData() {
  console.log('🔄 Generating test data for ML training...');
  
  try {
    // First, check if we have patients and staff
    const existingPatients = await prisma.patient.findMany({ take: 5 });
    const existingStaff = await prisma.staff.findMany({ take: 5 });
    
    if (existingPatients.length === 0 || existingStaff.length === 0) {
      console.error('❌ Need at least 1 patient and 1 staff in the database');
      console.log('Run the seed file first: npx ts-node prisma/seed.ts');
      return;
    }
    
    console.log(`📊 Found ${existingPatients.length} patients and ${existingStaff.length} staff`);
    
    const interactions = [];
    const departments = ['GENERAL_MEDICINE', 'EMERGENCY', 'PEDIATRICS', 'MENTAL_HEALTH'];
    const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    const appointmentTypes = ['WALK_IN', 'SCHEDULED', 'FOLLOW_UP', 'ROUTINE_CHECKUP', 'EMERGENCY'];
    
    // Generate 50 test interactions
    for (let i = 0; i < 50; i++) {
      const patient = existingPatients[Math.floor(Math.random() * existingPatients.length)];
      const staff = existingStaff[Math.floor(Math.random() * existingStaff.length)];
      const dept = departments[Math.floor(Math.random() * departments.length)] as any;
      const priority = priorities[Math.floor(Math.random() * priorities.length)] as any;
      const type = appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)] as any;
      const symptomCount = Math.floor(Math.random() * 5) + 1;
      
      // Create past date (last 30 days)
      const daysAgo = Math.floor(Math.random() * 30);
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() - daysAgo);
      checkInDate.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0);
      
      // Create appointment first
      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          staffId: staff.id,
          appointmentDate: checkInDate,
          appointmentTime: checkInDate.toTimeString().slice(0, 5),
          department: dept,
          type: type,
          status: 'COMPLETED',
          priority: priority,
          reason: `Test appointment with ${symptomCount} symptoms`,
          completedAt: new Date(checkInDate.getTime() + (30 + Math.random() * 30) * 60000),
        }
      });
      
      // Calculate durations
      const vitalsDuration = Math.floor(Math.random() * 10) + 5; // 5-15 minutes
      const interactionDuration = Math.floor(Math.random() * 30) + 10; // 10-40 minutes
      const totalDuration = vitalsDuration + interactionDuration;
      
      // Base prediction (simulate ML prediction)
      let predictedDuration = 30; // base
      if (dept === 'EMERGENCY') predictedDuration = 45;
      if (dept === 'MENTAL_HEALTH') predictedDuration = 60;
      if (priority === 'URGENT') predictedDuration *= 1.5;
      if (priority === 'LOW') predictedDuration *= 0.8;
      predictedDuration = Math.round(predictedDuration + (Math.random() * 20) - 10);
      
      // Create interaction with the appointment
      const interaction = await prisma.interaction.create({
        data: {
          appointmentId: appointment.id,
          patientId: patient.id,
          staffId: staff.id,
          department: dept,
          priority: priority,
          appointmentType: type,
          symptomCount: symptomCount,
          checkInTime: checkInDate,
          vitalsStartTime: new Date(checkInDate.getTime() + 2 * 60000),
          vitalsEndTime: new Date(checkInDate.getTime() + (2 + vitalsDuration) * 60000),
          interactionStartTime: new Date(checkInDate.getTime() + (2 + vitalsDuration) * 60000),
          interactionEndTime: new Date(checkInDate.getTime() + (2 + vitalsDuration + interactionDuration) * 60000),
          checkoutTime: new Date(checkInDate.getTime() + (2 + vitalsDuration + interactionDuration + 3) * 60000),
          vitalsDuration: vitalsDuration,
          interactionDuration: interactionDuration,
          totalDuration: totalDuration,
          predictedDuration: predictedDuration,
        }
      });
      
      interactions.push(interaction);
      
      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`  Created ${i + 1} interactions...`);
      }
    }
    
    console.log(`\n✅ Successfully generated ${interactions.length} test interactions!`);
    console.log(`📊 Summary:`);
    console.log(`  • Appointments created: 50`);
    console.log(`  • Interactions tracked: 50`);
    console.log(`  • Time range: Last 30 days`);
    console.log(`  • Departments: ${departments.join(', ')}`);
    console.log(`  • Priorities: ${priorities.join(', ')}`);
    
    // Show some stats
    const avgDuration = interactions.reduce((sum, i) => sum + (i.totalDuration || 0), 0) / interactions.length;
    console.log(`  • Average duration: ${avgDuration.toFixed(1)} minutes`);
    
  } catch (error: any) {
    console.error('❌ Error generating test data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  generateTestData();
}

export { generateTestData };