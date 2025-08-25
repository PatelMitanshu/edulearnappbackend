const XLSX = require('xlsx');
const path = require('path');

// Create test files for roll number assignment
const studentsWithoutRollNumbers = [
    {
        'Student Name': 'Amit Kumar',
        'UID': '2024010',
        'Mobile Number': '9876543210',
        'Email': 'amit@example.com'
        // No Roll Number - should auto-assign
    },
    {
        'Student Name': 'Priya Singh', 
        'UID': '2024011',
        'Mobile Number': '9876543211',
        'Email': 'priya@example.com'
        // No Roll Number - should auto-assign
    },
    {
        'Student Name': 'Raj Patel',
        'UID': '2024012', 
        'Mobile Number': '9876543212',
        'Roll Number': '50', // Explicit roll number
        'Email': 'raj@example.com'
    },
    {
        'Student Name': 'Sita Sharma',
        'UID': '2024013',
        'Mobile Number': '9876543213',
        'Email': 'sita@example.com'
        // No Roll Number - should auto-assign
    },
    {
        'Student Name': 'Vikram Yadav',
        'UID': '2024014',
        'Mobile Number': '9876543214',
        'Email': 'vikram@example.com'
        // No Roll Number - should auto-assign
    }
];

// Create workbook
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(studentsWithoutRollNumbers);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

// Write file
const fileName = 'students-rollnumber-test.xlsx';
const filePath = path.join(__dirname, fileName);
XLSX.writeFile(workbook, filePath);

console.log(`✅ Created roll number test file: ${filePath}`);
console.log('📋 File contains:');
console.log('   - 5 students');
console.log('   - 4 students WITHOUT roll numbers (should auto-assign)');
console.log('   - 1 student WITH roll number (50)');
console.log('   - Tests automatic roll number assignment');
console.log('\n🧪 Expected behavior:');
console.log('   - Students without roll numbers will get sequential numbers (e.g., 16, 17, 18, 19 if 15 students exist)');
console.log('   - Student with roll number 50 will keep that number');
console.log('   - All students will be imported successfully');

// Also create a file with some roll number conflicts
const studentsWithConflicts = [
    {
        'Student Name': 'Test Student 1',
        'UID': '2024020',
        'Mobile Number': '9876543220',
        'Roll Number': '1' // This might conflict with existing
    },
    {
        'Student Name': 'Test Student 2', 
        'UID': '2024021',
        'Mobile Number': '9876543221',
        'Roll Number': '2' // This might conflict with existing
    },
    {
        'Student Name': 'Test Student 3',
        'UID': '2024022',
        'Mobile Number': '9876543222'
        // No roll number - auto assign
    }
];

const workbook2 = XLSX.utils.book_new();
const worksheet2 = XLSX.utils.json_to_sheet(studentsWithConflicts);
XLSX.utils.book_append_sheet(workbook2, worksheet2, 'Students');

const fileName2 = 'students-conflict-test.xlsx';
const filePath2 = path.join(__dirname, fileName2);
XLSX.writeFile(workbook2, filePath2);

console.log(`\n✅ Created conflict test file: ${filePath2}`);
console.log('📋 File tests roll number conflict resolution');
console.log('   - Students with conflicting roll numbers will be reassigned');
console.log('   - App will show warning about conflicts');
console.log('   - All students will still be imported with new roll numbers');
