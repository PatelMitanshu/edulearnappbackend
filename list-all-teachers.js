const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/education-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function listAllTeachers() {
  try {
    console.log('🔍 Finding ALL teachers...');
    
    // Get absolutely ALL teachers with all fields
    const allTeachers = await Teacher.find({});
    
    console.log(`\n👥 Found ${allTeachers.length} teachers:`);
    allTeachers.forEach((teacher, index) => {
      console.log(`\n${index + 1}. Name: ${teacher.name}`);
      console.log(`   Email: ${teacher.email}`);
      console.log(`   ID: ${teacher._id}`);
      console.log(`   Active: ${teacher.isActive !== false ? 'Yes' : 'No'}`);
      console.log(`   Created: ${teacher.createdAt}`);
      console.log(`   Updated: ${teacher.updatedAt}`);
    });
    
    // Also check by different queries to make sure we're not missing any
    const byEmail = await Teacher.distinct('email');
    const byName = await Teacher.distinct('name');
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total records: ${allTeachers.length}`);
    console.log(`   Unique emails: ${byEmail.length}`);
    console.log(`   Unique names: ${byName.length}`);
    
    console.log(`\n📧 All emails: ${byEmail.join(', ')}`);
    console.log(`\n👤 All names: ${byName.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error listing teachers:', error);
  } finally {
    await mongoose.disconnect();
  }
}

listAllTeachers();
