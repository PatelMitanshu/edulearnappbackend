const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'education_app';

async function connectToDatabase() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db(DATABASE_NAME);
}

async function testExcelImport() {
    console.log('🔍 Excel Import Testing Tool');
    console.log('===============================\n');

    try {
        // Connect to database
        const db = await connectToDatabase();
        
        // 1. Check current database state
        console.log('1. Current Database State:');
        const students = await db.collection('students').find({}).toArray();
        const divisions = await db.collection('divisions').find({}).toArray();
        
        console.log(`   📊 Total students in database: ${students.length}`);
        console.log(`   📊 Total divisions in database: ${divisions.length}`);
        
        if (students.length > 0) {
            console.log('   ⚠️  Database contains existing students:');
            students.forEach((student, index) => {
                console.log(`      ${index + 1}. ${student.firstName} ${student.lastName} (UID: ${student.uid}, Roll: ${student.rollNumber})`);
            });
        } else {
            console.log('   ✅ Database is empty - ready for fresh import');
        }

        console.log('\n2. Excel File Analysis:');
        
        // Look for Excel files in common locations
        const possiblePaths = [
            path.join(__dirname, '..', 'sample-students.xlsx'),
            path.join(__dirname, '..', 'students.xlsx'),
            path.join(__dirname, '..', 'test-students.xlsx'),
            path.join(__dirname, '..', 'uploads', 'students.xlsx'),
            path.join(__dirname, 'students.xlsx'),
        ];

        let excelFilePath = null;
        for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
                excelFilePath = filePath;
                break;
            }
        }

        if (!excelFilePath) {
            console.log('   ⚠️  No Excel file found in common locations');
            console.log('   💡 Create a test Excel file with students data to analyze');
            
            // Create a sample Excel file for testing
            const sampleData = [
                { 'Student Name': 'John Doe', 'UID': '12345', 'Roll Number': '1' },
                { 'Student Name': 'Jane Smith', 'UID': '12346', 'Roll Number': '2' },
                { 'Student Name': 'Bob Johnson', 'UID': '12347', 'Roll Number': '3' },
                // Add a duplicate UID to test detection
                { 'Student Name': 'Alice Brown', 'UID': '12345', 'Roll Number': '4' }, // Duplicate UID
                { 'Student Name': 'Charlie Wilson', 'UID': '12348', 'Roll Number': '5' }
            ];

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(sampleData);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
            
            const testFilePath = path.join(__dirname, 'test-students.xlsx');
            XLSX.writeFile(workbook, testFilePath);
            console.log(`   ✅ Created test Excel file: ${testFilePath}`);
            excelFilePath = testFilePath;
        }

        if (excelFilePath) {
            console.log(`   📄 Analyzing Excel file: ${excelFilePath}`);
            
            // Read Excel file
            const workbook = XLSX.readFile(excelFilePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            console.log(`   📊 Total rows in Excel: ${data.length}`);

            // Analyze for duplicates
            const uids = [];
            const rollNumbers = [];
            const duplicateUIDs = [];
            const duplicateRolls = [];

            data.forEach((row, index) => {
                const uid = row['UID'] || row['uid'] || row['Student UID'] || '';
                const rollNumber = row['Roll Number'] || row['roll'] || row['Roll'] || '';

                // Check for duplicate UIDs
                if (uids.includes(uid) && uid !== '') {
                    duplicateUIDs.push({ uid, row: index + 2 }); // +2 because Excel is 1-indexed and we have header
                }
                if (uid !== '') uids.push(uid);

                // Check for duplicate roll numbers
                if (rollNumbers.includes(rollNumber) && rollNumber !== '') {
                    duplicateRolls.push({ rollNumber, row: index + 2 });
                }
                if (rollNumber !== '') rollNumbers.push(rollNumber);
            });

            if (duplicateUIDs.length > 0) {
                console.log('   ❌ Duplicate UIDs found in Excel:');
                duplicateUIDs.forEach(dup => {
                    console.log(`      - UID "${dup.uid}" found at row ${dup.row}`);
                });
            } else {
                console.log('   ✅ No duplicate UIDs found in Excel');
            }

            if (duplicateRolls.length > 0) {
                console.log('   ❌ Duplicate Roll Numbers found in Excel:');
                duplicateRolls.forEach(dup => {
                    console.log(`      - Roll Number "${dup.rollNumber}" found at row ${dup.row}`);
                });
            } else {
                console.log('   ✅ No duplicate Roll Numbers found in Excel');
            }

            // Check column headers
            console.log('\n   📋 Excel Column Headers:');
            const headers = Object.keys(data[0] || {});
            headers.forEach(header => {
                console.log(`      - "${header}"`);
            });
        }

        console.log('\n3. Testing Recommendations:');
        console.log('   💡 Steps to test Excel import:');
        console.log('   1. Use the EducationApp on your device');
        console.log('   2. Navigate to Division management');
        console.log('   3. Select "Import from Excel"');
        console.log('   4. Choose your Excel file');
        console.log('   5. Check if duplicate detection works correctly');
        
        if (excelFilePath && excelFilePath.includes('test-students.xlsx')) {
            console.log(`   6. Test with the generated file: ${excelFilePath}`);
            console.log('      (This file has a duplicate UID to test detection)');
        }

        console.log('\n4. New Features in Version 1.4:');
        console.log('   ✅ Enhanced duplicate detection in frontend');
        console.log('   ✅ Better error messages with student details');
        console.log('   ✅ Batch validation before API calls');
        console.log('   ✅ Excel-level duplicate checking');

        console.log('\n🎯 Summary:');
        console.log(`   - Database status: ${students.length === 0 ? 'Empty (ready for import)' : 'Contains ' + students.length + ' students'}`);
        console.log('   - APK installed: EducationApp v1.4 with duplicate detection fixes');
        console.log('   - Excel analysis completed');
        console.log('   - Ready for testing!');

    } catch (error) {
        console.error('❌ Error during testing:', error);
    }
}

// Run the test
testExcelImport();
