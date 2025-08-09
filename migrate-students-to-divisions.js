// Migration script to handle existing students without divisions
// This should be run once after implementing the division system

const mongoose = require('mongoose');
const Student = require('./models/Student');
const Standard = require('./models/Standard');
const Division = require('./models/Division');
const Teacher = require('./models/Teacher');

require('dotenv').config();

async function migrateStudentsToDivision() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all students without division
    const studentsWithoutDivision = await Student.find({ 
      division: { $exists: false },
      isActive: true 
    }).populate('standard createdBy');

    console.log(`Found ${studentsWithoutDivision.length} students without division`);

    for (const student of studentsWithoutDivision) {
      // Skip students with invalid/missing standard
      if (!student.standard || !student.standard.name) {
        console.log(`⚠️  Skipping student: ${student.name} - missing or invalid standard`);
        continue;
      }

      console.log(`Processing student: ${student.name} in ${student.standard.name}`);

      // Check if there's already a default division for this standard
      let defaultDivision = await Division.findOne({
        standard: student.standard._id,
        name: 'A', // Default to 'A' division
        isActive: true
      });

      // If no default division exists, create one
      if (!defaultDivision) {
        console.log(`Creating default division A for standard ${student.standard.name}`);
        defaultDivision = new Division({
          name: 'A',
          fullName: `${student.standard.name}-A`, // Set fullName manually
          standard: student.standard._id,
          description: `Default division for ${student.standard.name}`,
          createdBy: student.createdBy._id
        });
        await defaultDivision.save();
      }

      // Assign student to the default division
      student.division = defaultDivision._id;
      await student.save();
      
      console.log(`✅ Assigned ${student.name} to ${defaultDivision.fullName}`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration
if (require.main === module) {
  migrateStudentsToDivision();
}

module.exports = migrateStudentsToDivision;
