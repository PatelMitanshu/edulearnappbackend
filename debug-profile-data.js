const mongoose = require('mongoose');
const Student = require('./models/Student');

mongoose.connect('mongodb://localhost:27017/education_app').then(async () => {
  console.log('Connected to MongoDB');
  
  // Get all students and inspect their profilePicture field
  const allStudents = await Student.find({}).limit(10);
  console.log(`Found ${allStudents.length} total students`);
  console.log('');
  
  allStudents.forEach((student, index) => {
    console.log(`${index + 1}. Student: ${student.name}`);
    console.log(`   ProfilePicture object:`, student.profilePicture);
    console.log(`   Has profilePicture: ${!!student.profilePicture}`);
    console.log(`   ProfilePicture keys:`, Object.keys(student.profilePicture || {}));
    
    if (student.profilePicture) {
      console.log(`   URL exists: ${!!student.profilePicture.url}`);
      console.log(`   URL value: "${student.profilePicture.url}"`);
      console.log(`   PublicId exists: ${!!student.profilePicture.publicId}`);
      console.log(`   PublicId value: "${student.profilePicture.publicId}"`);
    }
    console.log('   ---');
  });
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
