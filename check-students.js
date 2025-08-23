const mongoose = require('mongoose');
const Student = require('./models/Student');

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/education_app';

async function checkStudents() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all students
    const students = await Student.find({}).limit(10);
    
    console.log(`Found ${students.length} students in database:`);
    console.log('='.repeat(50));

    students.forEach((student, index) => {
      console.log(`${index + 1}. Name: ${student.name}`);
      console.log(`   Roll Number: ${student.rollNumber || 'Not set'}`);
      console.log(`   UID: ${student.uid || 'Not set'}`);
      console.log(`   Created: ${student.createdAt}`);
      console.log('-'.repeat(30));
    });

    if (students.length === 0) {
      console.log('No students found in database');
    }
    
  } catch (error) {
    console.error('Error checking students:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run check
checkStudents();
