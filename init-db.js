const mongoose = require('mongoose');
const Standard = require('./models/Standard');
const Teacher = require('./models/Teacher');
require('dotenv').config();

const initializeDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/education_app');// Create a default admin teacher if none exists
    const existingTeacher = await Teacher.findOne({ role: 'admin' });
    let teacherId;

    if (!existingTeacher) {
      const adminTeacher = new Teacher({
        name: 'Admin Teacher',
        email: 'admin@edulearn.com',
        password: 'Admin@123',
        role: 'admin'
      });
      await adminTeacher.save();
      teacherId = adminTeacher._id;} else {
      teacherId = existingTeacher._id;}

    // Create default standards if they don't exist
    const standardsData = [
      {
        name: '6th Standard',
        description: 'Sixth grade curriculum covering fundamental concepts',
        subjects: ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi']
      },
      {
        name: '7th Standard',
        description: 'Seventh grade curriculum building upon previous knowledge',
        subjects: ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi']
      },
      {
        name: '8th Standard',
        description: 'Eighth grade curriculum preparing for higher education',
        subjects: ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi']
      }
    ];

    for (const standardData of standardsData) {
      const existingStandard = await Standard.findOne({ name: standardData.name });
      if (!existingStandard) {
        const standard = new Standard({
          ...standardData,
          createdBy: teacherId
        });
        await standard.save();} else {}
    }} catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await mongoose.connection.close();}
};

initializeDatabase();
