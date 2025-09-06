const mongoose = require('mongoose');
const Student = require('./models/Student');

mongoose.connect('mongodb://localhost:27017/education_app').then(async () => {
  console.log('Connected to education_app database');
  
  // Find a student to add profile picture to
  const students = await Student.find({}).limit(1);
  
  if (students.length === 0) {
    console.log('No students found in database');
    mongoose.disconnect();
    return;
  }
  
  const student = students[0];
  console.log('Found student:', student.name);
  
  // Add a test profile picture URL (using a public test image)
  student.profilePicture = {
    url: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=TEST',
    publicId: 'test-profile-picture-id'
  };
  
  await student.save();
  console.log('Added test profile picture to student:', student.name);
  console.log('URL:', student.profilePicture.url);
  
  // Verify it was saved
  const updatedStudent = await Student.findById(student._id);
  console.log('Verified - Profile picture saved:', !!updatedStudent.profilePicture?.url);
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err);
});
