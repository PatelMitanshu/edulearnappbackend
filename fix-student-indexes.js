const mongoose = require('mongoose');
require('dotenv').config();

async function fixStudentIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/educationapp');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const studentsCollection = db.collection('students');

    // Get current indexes
    const indexes = await studentsCollection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Drop ALL old problematic indexes that prevent duplicate roll numbers across divisions
    try {
      await studentsCollection.dropIndex({ rollNumber: 1, standard: 1, createdBy: 1 });
      console.log('✅ Dropped old rollNumber index with standard field (prevents cross-division duplicates)');
    } catch (error) {
      console.log('⚠️ Old rollNumber+standard index not found:', error.message);
    }

    try {
      await studentsCollection.dropIndex({ uid: 1, standard: 1, createdBy: 1 });
      console.log('✅ Dropped old UID index with standard field');
    } catch (error) {
      console.log('⚠️ Old UID+standard index not found:', error.message);
    }

    // Also drop any existing division-based indexes to recreate them
    try {
      await studentsCollection.dropIndex({ rollNumber: 1, division: 1, createdBy: 1 });
      console.log('✅ Dropped existing rollNumber+division index to recreate');
    } catch (error) {
      console.log('⚠️ Existing rollNumber+division index not found:', error.message);
    }

    try {
      await studentsCollection.dropIndex({ uid: 1, division: 1, createdBy: 1 });
      console.log('✅ Dropped existing UID+division index to recreate');
    } catch (error) {
      console.log('⚠️ Existing UID+division index not found:', error.message);
    }

    // Create new correct indexes that allow duplicate roll numbers in different divisions
    await studentsCollection.createIndex(
      { rollNumber: 1, division: 1, createdBy: 1 }, 
      { unique: true, sparse: true, name: 'rollNumber_division_createdBy_unique' }
    );
    console.log('✅ Created new rollNumber index: UNIQUE per division (allows duplicates across divisions)');

    await studentsCollection.createIndex(
      { uid: 1, division: 1, createdBy: 1 }, 
      { unique: true, sparse: true, name: 'uid_division_createdBy_unique' }
    );
    console.log('✅ Created new UID index: UNIQUE per division');

    // Verify new indexes
    const newIndexes = await studentsCollection.indexes();
    console.log('\n📋 Updated indexes:');
    newIndexes.forEach(idx => {
      if (idx.name.includes('rollNumber') || idx.name.includes('uid')) {
        console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
      }
    });

    console.log('\n🎉 Index migration completed successfully!');
    console.log('📝 Now students can have duplicate roll numbers in different divisions of the same standard');
    
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the fix
fixStudentIndexes();
