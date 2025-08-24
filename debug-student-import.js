const mongoose = require('mongoose');
const Student = require('./models/Student');

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/education_app';

async function debugStudentImport() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check all students in database
    const allStudents = await Student.find({})
      .populate('standard', 'name')
      .populate('division', 'name')
      .sort({ createdAt: -1 });
    
    console.log(`\nTotal students in database: ${allStudents.length}`);
    console.log('='.repeat(60));

    if (allStudents.length > 0) {
      allStudents.forEach((student, index) => {
        console.log(`${index + 1}. Name: ${student.name}`);
        console.log(`   UID: ${student.uid || 'Not set'}`);
        console.log(`   Roll Number: ${student.rollNumber || 'Not set'}`);
        console.log(`   Standard: ${student.standard?.name || 'Unknown'}`);
        console.log(`   Division: ${student.division?.name || 'Unknown'}`);
        console.log(`   Active: ${student.isActive}`);
        console.log(`   Created: ${student.createdAt}`);
        console.log('-'.repeat(40));
      });
      
      // Check for duplicates
      console.log('\nChecking for duplicate UIDs...');
      const uidCounts = {};
      const rollNumberCounts = {};
      
      allStudents.forEach(student => {
        if (student.uid) {
          uidCounts[student.uid] = (uidCounts[student.uid] || 0) + 1;
        }
        if (student.rollNumber) {
          rollNumberCounts[student.rollNumber] = (rollNumberCounts[student.rollNumber] || 0) + 1;
        }
      });
      
      // Show duplicate UIDs
      const duplicateUIDs = Object.entries(uidCounts).filter(([uid, count]) => count > 1);
      if (duplicateUIDs.length > 0) {
        console.log('\nDuplicate UIDs found:');
        duplicateUIDs.forEach(([uid, count]) => {
          console.log(`  UID "${uid}": ${count} occurrences`);
          const studentsWithUID = allStudents.filter(s => s.uid === uid);
          studentsWithUID.forEach(s => {
            console.log(`    - ${s.name} (${s.standard?.name || 'Unknown'} - ${s.division?.name || 'Unknown'})`);
          });
        });
      } else {
        console.log('No duplicate UIDs found');
      }
      
      // Show duplicate roll numbers
      const duplicateRollNumbers = Object.entries(rollNumberCounts).filter(([rollNumber, count]) => count > 1);
      if (duplicateRollNumbers.length > 0) {
        console.log('\nDuplicate Roll Numbers found:');
        duplicateRollNumbers.forEach(([rollNumber, count]) => {
          console.log(`  Roll Number "${rollNumber}": ${count} occurrences`);
          const studentsWithRoll = allStudents.filter(s => s.rollNumber === rollNumber);
          studentsWithRoll.forEach(s => {
            console.log(`    - ${s.name} (${s.standard?.name || 'Unknown'} - ${s.division?.name || 'Unknown'})`);
          });
        });
      } else {
        console.log('No duplicate roll numbers found');
      }
      
    } else {
      console.log('Database is empty - no students found');
    }

    // Check recent failed attempts (students marked as inactive)
    const inactiveStudents = await Student.find({ isActive: false })
      .populate('standard', 'name')
      .populate('division', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
      
    if (inactiveStudents.length > 0) {
      console.log(`\nRecent inactive students (${inactiveStudents.length}):`);
      inactiveStudents.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} - UID: ${student.uid || 'None'} - Created: ${student.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error debugging student import:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run debug
debugStudentImport();
