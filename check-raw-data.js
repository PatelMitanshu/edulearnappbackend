const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/education_app').then(async () => {
  console.log('Database name:', mongoose.connection.db.databaseName);
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:');
  collections.forEach(col => {
    console.log('- ' + col.name);
  });
  console.log();
  
  const db = mongoose.connection.db;
  const students = await db.collection('students').find({}).limit(3).toArray();
  console.log('Raw students from collection:');
  students.forEach((student, i) => {
    console.log(`${i+1}. ${student.name}`);
    console.log('   ProfilePicture:', JSON.stringify(student.profilePicture, null, 2));
    console.log();
  });
  
  mongoose.disconnect();
}).catch(err => console.error(err));
