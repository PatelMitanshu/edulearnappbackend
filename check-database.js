const mongoose = require('mongoose');
const Standard = require('./models/Standard');
const Teacher = require('./models/Teacher');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/education-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database...');
    
    // Check how many teachers exist
    const teacherCount = await Teacher.countDocuments();
    console.log(`📊 Total teachers: ${teacherCount}`);
    
    // Check how many standards exist
    const standardCount = await Standard.countDocuments();
    console.log(`📊 Total standards: ${standardCount}`);
    
    // Get all standards with their creators
    const standards = await Standard.find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    console.log('\n📋 Standards in database:');
    standards.forEach((standard, index) => {
      console.log(`${index + 1}. ${standard.name} - Created by: ${standard.createdBy?.name || 'Unknown'} (${standard.createdBy?.email || 'No email'})`);
    });
    
    // Check if there are any active standards
    const activeStandards = await Standard.find({ isActive: true });
    console.log(`\n✅ Active standards: ${activeStandards.length}`);
    
    // Group standards by teacher
    const standardsByTeacher = {};
    standards.forEach(standard => {
      const teacherId = standard.createdBy?._id?.toString();
      if (!standardsByTeacher[teacherId]) {
        standardsByTeacher[teacherId] = [];
      }
      standardsByTeacher[teacherId].push(standard);
    });
    
    console.log('\n👥 Standards by teacher:');
    Object.entries(standardsByTeacher).forEach(([teacherId, standards]) => {
      const teacherName = standards[0]?.createdBy?.name || 'Unknown';
      console.log(`${teacherName}: ${standards.length} standards`);
    });
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDatabase();
