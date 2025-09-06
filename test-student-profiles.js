const mongoose = require('mongoose');
const Student = require('./models/Student');

mongoose.connect('mongodb://localhost:27017/education_app').then(async () => {
  console.log('Connected to MongoDB');
  
  const totalStudents = await Student.countDocuments();
  console.log('Total students in database:', totalStudents);
  
  const studentsWithProfiles = await Student.find({}).select('name profilePicture').limit(10);
  console.log('\nStudent profile data:');
  studentsWithProfiles.forEach((student, index) => {
    console.log(`${index + 1}. ${student.name} - ProfilePicture:`, student.profilePicture);
  });
  
  // Check if any students have profile picture URLs
  const studentsWithPictureUrls = await Student.find({ 
    'profilePicture.url': { $exists: true, $ne: null, $ne: '' } 
  });
  console.log('\nStudents with profile picture URLs:', studentsWithPictureUrls.length);
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
