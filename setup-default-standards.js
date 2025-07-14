const mongoose = require('mongoose');
const Standard = require('./models/Standard');
const Teacher = require('./models/Teacher');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/education-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createDefaultStandards() {
  try {
    console.log('🔧 Setting up default standards...');
    
    // Get the first teacher to assign as creator (or create a default admin)
    let defaultTeacher = await Teacher.findOne();
    if (!defaultTeacher) {
      console.log('No teachers found, creating default admin...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      defaultTeacher = new Teacher({
        name: 'System Admin',
        email: 'admin@school.com',
        password: hashedPassword,
      });
      await defaultTeacher.save();
    }

    // Define the three default standards
    const defaultStandards = [
      {
        name: '6th Standard',
        description: 'Class 6 - Elementary level education',
        subjects: ['Math', 'Science', 'English', 'Social Studies', 'Hindi']
      },
      {
        name: '7th Standard',
        description: 'Class 7 - Middle school level education',
        subjects: ['Math', 'Science', 'English', 'Social Studies', 'Hindi']
      },
      {
        name: '8th Standard',
        description: 'Class 8 - Pre-secondary level education',
        subjects: ['Math', 'Science', 'English', 'Social Studies', 'Hindi']
      }
    ];

    // Clear existing standards
    await Standard.deleteMany({});
    console.log('🗑️ Cleared existing standards');

    // Create the default standards
    for (const standardData of defaultStandards) {
      const standard = new Standard({
        ...standardData,
        createdBy: defaultTeacher._id
      });
      await standard.save();
      console.log(`✅ Created: ${standard.name}`);
    }

    console.log('\n🎉 Default standards created successfully!');
    console.log('All teachers will now see these three standards after login.');
    
  } catch (error) {
    console.error('❌ Error creating default standards:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createDefaultStandards();
