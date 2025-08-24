const XLSX = require('xlsx');
const path = require('path');

// Create a realistic test file with Gujarati headers (common in Indian schools)
const studentsData = [
    {
        'વિદ્યાર્થીનું નામ': 'રાજ પટેલ',
        'Student Name': 'Raj Patel', 
        'UID': '2024001',
        'રોલ નંબર': '1',
        'Roll Number': '1',
        'ધોરણ': '10th',
        'Class': '10th'
    },
    {
        'વિદ્યાર્થીનું નામ': 'પ્રિયા શાહ',
        'Student Name': 'Priya Shah',
        'UID': '2024002', 
        'રોલ નંબર': '2',
        'Roll Number': '2',
        'ધોરણ': '10th',
        'Class': '10th'
    },
    {
        'વિદ્યાર્થીનું નામ': 'અમિત ડેવ',
        'Student Name': 'Amit Dave',
        'UID': '2024003',
        'રોલ નંબર': '3', 
        'Roll Number': '3',
        'ધોરણ': '10th',
        'Class': '10th'
    },
    {
        'વિદ્યાર્થીનું નામ': 'નિહાર મેહતા',
        'Student Name': 'Nihar Mehta',
        'UID': '2024001', // Duplicate UID - same as first student
        'રોલ નંબર': '4',
        'Roll Number': '4', 
        'ધોરણ': '10th',
        'Class': '10th'
    },
    {
        'વિદ્યાર્થીનું નામ': 'કવિતા જોશી',
        'Student Name': 'Kavita Joshi',
        'UID': '2024005',
        'રોલ નંબર': '5',
        'Roll Number': '5',
        'ધોરણ': '10th', 
        'Class': '10th'
    }
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(studentsData);

// Add the worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

// Write the file
const fileName = 'students-duplicate-test.xlsx';
const filePath = path.join(__dirname, fileName);
XLSX.writeFile(workbook, filePath);

console.log(`✅ Created test Excel file: ${filePath}`);
console.log('📋 File contains:');
console.log('   - 5 students');
console.log('   - Gujarati and English headers'); 
console.log('   - Duplicate UID: "2024001" (Raj Patel & Nihar Mehta)');
console.log('   - This should trigger the duplicate detection you implemented');
console.log('\n🧪 Test this file with your app to verify duplicate detection works!');
