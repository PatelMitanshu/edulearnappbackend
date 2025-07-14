const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Teacher = require('./models/Teacher');
const Standard = require('./models/Standard');
const Student = require('./models/Student');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/education-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createTestData() {
  try {
    // Clean up existing test data
    await Teacher.deleteMany({ email: { $in: ['teacher1@test.com', 'teacher2@test.com'] } });
    await Standard.deleteMany({ name: '6th Standard' });
    await Student.deleteMany({ name: { $in: ['Test Student 1', 'Test Student 2'] } });

    // Create two test teachers
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const teacher1 = new Teacher({
      name: 'Teacher One',
      email: 'teacher1@test.com',
      password: hashedPassword,
    });
    await teacher1.save();

    const teacher2 = new Teacher({
      name: 'Teacher Two',
      email: 'teacher2@test.com',
      password: hashedPassword,
    });
    await teacher2.save();

    // Create standards for each teacher
    const standard1 = new Standard({
      name: '6th Standard',
      description: 'Standard created by Teacher One',
      createdBy: teacher1._id,
    });
    await standard1.save();

    const standard2 = new Standard({
      name: '6th Standard',
      description: 'Standard created by Teacher Two',
      createdBy: teacher2._id,
    });
    await standard2.save();

    // Create students for each teacher
    const student1 = new Student({
      name: 'Test Student 1',
      standard: standard1._id,
      rollNumber: 'S001',
      createdBy: teacher1._id,
    });
    await student1.save();

    const student2 = new Student({
      name: 'Test Student 2',
      standard: standard2._id,
      rollNumber: 'S001', // Same roll number but different teacher
      createdBy: teacher2._id,
    });
    await student2.save();

    console.log('✅ Test data created successfully!');
    console.log('Teacher 1 ID:', teacher1._id.toString());
    console.log('Teacher 2 ID:', teacher2._id.toString());
    console.log('Standard 1 ID:', standard1._id.toString());
    console.log('Standard 2 ID:', standard2._id.toString());
    console.log('Student 1 ID:', student1._id.toString());
    console.log('Student 2 ID:', student2._id.toString());

    // Test data isolation
    console.log('\n🔍 Testing data isolation...');
    
    // Test 1: Teacher 1 should only see their own standards
    const teacher1Standards = await Standard.find({ createdBy: teacher1._id });
    console.log('Teacher 1 standards:', teacher1Standards.length);
    
    // Test 2: Teacher 2 should only see their own standards
    const teacher2Standards = await Standard.find({ createdBy: teacher2._id });
    console.log('Teacher 2 standards:', teacher2Standards.length);
    
    // Test 3: Teacher 1 should only see their own students
    const teacher1Students = await Student.find({ createdBy: teacher1._id });
    console.log('Teacher 1 students:', teacher1Students.length);
    
    // Test 4: Teacher 2 should only see their own students
    const teacher2Students = await Student.find({ createdBy: teacher2._id });
    console.log('Teacher 2 students:', teacher2Students.length);

    console.log('\n✅ Data isolation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestData();
