const mongoose = require('mongoose');

async function checkDatabase(dbName) {
  try {
    await mongoose.connect(`mongodb://localhost:27017/${dbName}`);
    console.log(`=== ${dbName.toUpperCase()} DATABASE ===`);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const hasStudents = collections.some(col => col.name === 'students');
    
    if (hasStudents) {
      const db = mongoose.connection.db;
      const students = await db.collection('students').find({}).limit(3).toArray();
      console.log(`Students count: ${students.length}`);
      
      const studentsWithPictures = students.filter(s => s.profilePicture && s.profilePicture.url);
      console.log(`Students with profile pictures: ${studentsWithPictures.length}`);
      
      if (studentsWithPictures.length > 0) {
        console.log('Sample student with profile picture:');
        const sample = studentsWithPictures[0];
        console.log(`- Name: ${sample.name}`);
        console.log(`- URL: ${sample.profilePicture.url}`);
        console.log(`- PublicId: ${sample.profilePicture.publicId}`);
      }
    } else {
      console.log('No students collection found');
    }
    
    await mongoose.disconnect();
    console.log();
  } catch (err) {
    console.log(`Error with ${dbName}:`, err.message);
    console.log();
  }
}

async function main() {
  const databases = ['education_app', 'education-app', 'edulearn', 'edulearn_app'];
  
  for (const db of databases) {
    await checkDatabase(db);
  }
}

main().catch(console.error);
