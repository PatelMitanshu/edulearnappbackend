const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'education_app';

async function createTestStudents() {
    console.log('🔧 Creating test students with mixed roll numbers...');
    
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db(DATABASE_NAME);
        
        // Get a division to add students to
        const divisions = await db.collection('divisions').find({}).toArray();
        if (divisions.length === 0) {
            console.log('❌ No divisions found. Please create a division first.');
            return;
        }
        
        const division = divisions[0];
        console.log(`📋 Adding students to division: ${division.name}`);
        
        // Get standard
        const standards = await db.collection('standards').find({}).toArray();
        if (standards.length === 0) {
            console.log('❌ No standards found. Please create a standard first.');
            return;
        }
        
        const standard = standards[0];
        
        // Create test students with mixed roll numbers (not in order)
        const testStudents = [
            {
                name: 'Student Five',
                rollNumber: '5',
                uid: 'TEST005',
                standard: {
                    _id: standard._id,
                    name: standard.name,
                    subjects: standard.subjects || []
                },
                division: {
                    _id: division._id,
                    name: division.name,
                    fullName: division.fullName || division.name
                },
                parentContact: {
                    phone: '9876543215'
                },
                isActive: true,
                createdBy: {
                    _id: '64b5f1234567890123456789',
                    name: 'Test Admin',
                    email: 'admin@test.com'
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: 'Student Two',
                rollNumber: '2',
                uid: 'TEST002',
                standard: {
                    _id: standard._id,
                    name: standard.name,
                    subjects: standard.subjects || []
                },
                division: {
                    _id: division._id,
                    name: division.name,
                    fullName: division.fullName || division.name
                },
                parentContact: {
                    phone: '9876543212'
                },
                isActive: true,
                createdBy: {
                    _id: '64b5f1234567890123456789',
                    name: 'Test Admin',
                    email: 'admin@test.com'
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: 'Student Eight',
                rollNumber: '8',
                uid: 'TEST008',
                standard: {
                    _id: standard._id,
                    name: standard.name,
                    subjects: standard.subjects || []
                },
                division: {
                    _id: division._id,
                    name: division.name,
                    fullName: division.fullName || division.name
                },
                parentContact: {
                    phone: '9876543218'
                },
                isActive: true,
                createdBy: {
                    _id: '64b5f1234567890123456789',
                    name: 'Test Admin',
                    email: 'admin@test.com'
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: 'Student One',
                rollNumber: '1',
                uid: 'TEST001',
                standard: {
                    _id: standard._id,
                    name: standard.name,
                    subjects: standard.subjects || []
                },
                division: {
                    _id: division._id,
                    name: division.name,
                    fullName: division.fullName || division.name
                },
                parentContact: {
                    phone: '9876543211'
                },
                isActive: true,
                createdBy: {
                    _id: '64b5f1234567890123456789',
                    name: 'Test Admin',
                    email: 'admin@test.com'
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: 'Student Three',
                rollNumber: '3',
                uid: 'TEST003',
                standard: {
                    _id: standard._id,
                    name: standard.name,
                    subjects: standard.subjects || []
                },
                division: {
                    _id: division._id,
                    name: division.name,
                    fullName: division.fullName || division.name
                },
                parentContact: {
                    phone: '9876543213'
                },
                isActive: true,
                createdBy: {
                    _id: '64b5f1234567890123456789',
                    name: 'Test Admin',
                    email: 'admin@test.com'
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        
        // Insert students
        const result = await db.collection('students').insertMany(testStudents);
        console.log(`✅ Created ${result.insertedCount} test students`);
        
        console.log('\n📋 Students created (in insertion order):');
        testStudents.forEach((student, index) => {
            console.log(`   ${index + 1}. ${student.name} - Roll Number: ${student.rollNumber}`);
        });
        
        console.log('\n🎯 Expected app behavior:');
        console.log('   Students should appear in roll number order: 1, 2, 3, 5, 8');
        console.log('   Even though they were created in mixed order');
        
        await client.close();
        
    } catch (error) {
        console.error('❌ Error creating test students:', error);
    }
}

// Run the test
createTestStudents();
