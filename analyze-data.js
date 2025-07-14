const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');
const Standard = require('./models/Standard');
const jwt = require('jsonwebtoken');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/education-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function analyzeData() {
  try {
    console.log('🔍 Analyzing current data...');
    
    // Get all teachers
    const teachers = await Teacher.find({}).select('name email createdAt');
    console.log('\n👥 Teachers in database:');
    teachers.forEach((teacher, index) => {
      console.log(`${index + 1}. ${teacher.name} (${teacher.email}) - ID: ${teacher._id}`);
    });
    
    // Get all standards with their creators
    const standards = await Standard.find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    console.log('\n📋 Standards by teacher:');
    teachers.forEach(teacher => {
      const teacherStandards = standards.filter(s => s.createdBy?._id?.toString() === teacher._id.toString());
      console.log(`\n${teacher.name} (${teacher.email}):`);
      if (teacherStandards.length === 0) {
        console.log('  ❌ No standards created');
      } else {
        teacherStandards.forEach((standard, index) => {
          console.log(`  ${index + 1}. ${standard.name} - ${standard.description || 'No description'}`);
        });
      }
    });
    
    console.log('\n💡 Recommendation:');
    const teacherWithoutStandards = teachers.find(teacher => {
      const teacherStandards = standards.filter(s => s.createdBy?._id?.toString() === teacher._id.toString());
      return teacherStandards.length === 0;
    });
    
    if (teacherWithoutStandards) {
      console.log(`The teacher "${teacherWithoutStandards.name}" has no standards created.`);
      console.log('This might be the teacher currently logged in and seeing no standards on the home page.');
      console.log('They need to create standards first to see them on the home page.');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

analyzeData();
