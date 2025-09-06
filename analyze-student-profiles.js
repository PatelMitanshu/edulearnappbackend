const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to database:', mongoose.connection.db.databaseName);
  
  const db = mongoose.connection.db;
  const students = await db.collection('students').find({}).toArray();
  
  console.log('=== STUDENT PROFILE PICTURE ANALYSIS ===\n');
  
  students.forEach((student, i) => {
    console.log(`${i+1}. ${student.name} (Roll: ${student.rollNumber})`);
    
    if (student.profilePicture && student.profilePicture.url) {
      console.log(`   ✅ HAS PROFILE PICTURE`);
      console.log(`   URL: ${student.profilePicture.url}`);
      console.log(`   PublicId: ${student.profilePicture.publicId}`);
      
      // Check if URL looks valid
      const isValidUrl = student.profilePicture.url.startsWith('https://');
      console.log(`   URL Valid: ${isValidUrl ? '✅' : '❌'}`);
    } else {
      console.log(`   ❌ NO PROFILE PICTURE (Will show blue circle)`);
    }
    console.log('   ---');
  });
  
  const studentsWithPictures = students.filter(s => s.profilePicture && s.profilePicture.url);
  const studentsWithoutPictures = students.filter(s => !s.profilePicture || !s.profilePicture.url);
  
  console.log(`\nSUMMARY:`);
  console.log(`Total students: ${students.length}`);
  console.log(`With profile pictures: ${studentsWithPictures.length}`);
  console.log(`Without profile pictures: ${studentsWithoutPictures.length}`);
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err);
});
