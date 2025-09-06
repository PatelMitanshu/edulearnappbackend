const mongoose = require('mongoose');

// Check edulearn database
mongoose.connect('mongodb+srv://mitanshupatel:mitanshu123@cluster0.5oceonb.mongodb.net/edulearn').then(async () => {
  console.log('=== EDULEARN DATABASE ===');
  console.log('Database name:', mongoose.connection.db.databaseName);
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:');
  collections.forEach(col => {
    console.log('- ' + col.name);
  });
  console.log();
  
  const db = mongoose.connection.db;
  const students = await db.collection('students').find({}).limit(3).toArray();
  console.log('Students with profile pictures:');
  students.forEach((student, i) => {
    console.log(`${i+1}. ${student.name}`);
    if (student.profilePicture) {
      console.log('   ProfilePicture URL:', student.profilePicture.url);
      console.log('   ProfilePicture PublicId:', student.profilePicture.publicId);
    } else {
      console.log('   ProfilePicture: No profile picture');
    }
    console.log();
  });
  
  mongoose.disconnect();
}).catch(err => console.error(err));
