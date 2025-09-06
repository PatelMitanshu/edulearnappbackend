const mongoose = require('mongoose');
const Student = require('./models/Student');

mongoose.connect('mongodb://localhost:27017/education_app').then(async () => {
  console.log('Connected to MongoDB');
  
  const studentsWithPictures = await Student.find({ 
    'profilePicture.url': { $exists: true, $ne: null, $ne: '' } 
  }).limit(5);
  
  console.log('Students with profile pictures:', studentsWithPictures.length);
  console.log('');
  
  studentsWithPictures.forEach((student, index) => {
    console.log(`${index + 1}. ${student.name}`);
    console.log(`   URL: ${student.profilePicture.url}`);
    console.log(`   PublicId: ${student.profilePicture.publicId}`);
    console.log(`   URL Length: ${student.profilePicture.url?.length}`);
    console.log(`   URL Valid: ${student.profilePicture.url?.startsWith('https://')}`);
    console.log('');
  });
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
