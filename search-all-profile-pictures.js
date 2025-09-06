const { MongoClient } = require('mongodb');

async function searchAllDatabases() {
  const client = await MongoClient.connect('mongodb://localhost:27017');
  
  try {
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    
    console.log('Searching all databases for students with profile pictures...\n');
    
    for (const dbInfo of dbs.databases) {
      const dbName = dbInfo.name;
      if (dbName === 'admin' || dbName === 'config' || dbName === 'local') continue;
      
      try {
        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();
        const hasStudents = collections.some(col => col.name === 'students');
        
        if (hasStudents) {
          const students = await db.collection('students').find({}).toArray();
          const studentsWithPictures = students.filter(s => 
            s.profilePicture && 
            s.profilePicture.url && 
            s.profilePicture.url.trim() !== ''
          );
          
          if (studentsWithPictures.length > 0) {
            console.log(`*** FOUND PROFILE PICTURES IN ${dbName} ***`);
            console.log(`Total students: ${students.length}`);
            console.log(`Students with pictures: ${studentsWithPictures.length}`);
            
            studentsWithPictures.forEach((student, i) => {
              console.log(`${i+1}. ${student.name}`);
              console.log(`   URL: ${student.profilePicture.url}`);
              console.log(`   PublicId: ${student.profilePicture.publicId}`);
            });
            console.log();
          }
        }
      } catch (err) {
        // Skip databases that can't be accessed
      }
    }
    
    console.log('Search complete.');
  } finally {
    await client.close();
  }
}

searchAllDatabases().catch(console.error);
