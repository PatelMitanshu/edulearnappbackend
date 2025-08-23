const mongoose = require('mongoose');
const Student = require('./models/Student');

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/education_app';

async function migrateStudents() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all students that don't have a UID field yet
    const studentsWithoutUID = await Student.find({ uid: { $exists: false } });
    
    console.log(`Found ${studentsWithoutUID.length} students without UID field`);

    if (studentsWithoutUID.length === 0) {
      console.log('No students need migration. All students already have UID field.');
      return;
    }

    // Update students to add empty UID field
    for (let student of studentsWithoutUID) {
      // If rollNumber exists, you might want to copy it to UID or leave UID empty
      // Option 1: Leave UID empty (recommended)
      student.uid = undefined;
      
      // Option 2: Copy rollNumber to UID (if you want to migrate roll numbers to UID)
      // student.uid = student.rollNumber;
      
      await student.save();
      console.log(`Updated student: ${student.name} (ID: ${student._id})`);
    }

    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration
migrateStudents();
