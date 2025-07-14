const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');
const Standard = require('./models/Standard');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/education-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkAllData() {
  try {
    console.log('🔍 Complete database analysis...');
    
    // Get ALL teachers
    const allTeachers = await Teacher.find({}).select('name email createdAt').sort({ createdAt: 1 });
    console.log(`\n👥 All ${allTeachers.length} teachers in database:`);
    allTeachers.forEach((teacher, index) => {
      const createdDate = new Date(teacher.createdAt).toLocaleDateString();
      console.log(`${index + 1}. ${teacher.name} (${teacher.email}) - Created: ${createdDate}`);
      console.log(`   ID: ${teacher._id}`);
    });
    
    // Get ALL standards
    const allStandards = await Standard.find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: 1 });
    
    console.log(`\n📋 All ${allStandards.length} standards in database:`);
    allStandards.forEach((standard, index) => {
      const createdDate = new Date(standard.createdAt).toLocaleDateString();
      console.log(`${index + 1}. "${standard.name}" by ${standard.createdBy?.name || 'Unknown'} - Created: ${createdDate}`);
    });
    
    // Check which teachers have no standards
    console.log('\n❓ Teachers without standards:');
    const teachersWithoutStandards = allTeachers.filter(teacher => {
      const hasStandards = allStandards.some(s => s.createdBy?._id?.toString() === teacher._id.toString());
      return !hasStandards;
    });
    
    if (teachersWithoutStandards.length === 0) {
      console.log('   ✅ All teachers have at least one standard.');
    } else {
      teachersWithoutStandards.forEach((teacher, index) => {
        console.log(`   ${index + 1}. ${teacher.name} (${teacher.email})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllData();
