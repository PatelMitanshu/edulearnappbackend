const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Student = require('./models/Student');
const Standard = require('./models/Standard');
const Teacher = require('./models/Teacher');
require('dotenv').config();

class CSVStudentImporter {
  constructor() {
    this.results = [];
  }

  async importFromCSV(csvFilePath, teacherEmail) {
    try {
      console.log('🚀 Starting CSV import process...\n');

      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('📦 Connected to MongoDB');

      // Find teacher
      const teacher = await Teacher.findOne({ email: teacherEmail, isActive: true });
      if (!teacher) {
        throw new Error(`Teacher not found with email: ${teacherEmail}`);
      }
      console.log(`👨‍🏫 Found teacher: ${teacher.name}`);

      // Check if CSV file exists
      if (!fs.existsSync(csvFilePath)) {
        throw new Error(`CSV file not found: ${csvFilePath}`);
      }

      // Parse CSV file
      const students = await this.parseCSV(csvFilePath);
      console.log(`📊 Parsed ${students.length} student records from CSV`);

      if (students.length === 0) {
        console.log('📋 No valid student data to import');
        return;
      }

      // Save students to database
      const result = await this.saveStudents(students, teacher._id);

      console.log('\n🎉 Import process completed!');
      return result;

    } catch (error) {
      console.error('💥 Import process failed:', error.message);
      throw error;
    } finally {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  parseCSV(csvFilePath) {
    return new Promise((resolve, reject) => {
      const students = [];
      
      fs.createReadStream(csvFilePath)
        .pipe(csv({
          mapHeaders: ({ header }) => header.trim().toUpperCase().replace(/\s+/g, '_')
        }))
        .on('data', (row) => {
          try {
            // Map CSV columns to student data
            const student = {
              rollNumber: row.ROLLNUMBER?.toString().trim() || row.ROLL_NUMBER?.toString().trim() || '',
              name: row.NAME?.toString().trim() || '',
              dateOfBirth: this.parseDate(row.DATEOFBIRTH || row.DATE_OF_BIRTH),
              mobileNumber: row.MOBILE_NUMBER?.toString().trim() || row.MOBILENUMBER?.toString().trim() || '',
              standard: row.STANDARD?.toString().trim() || ''
            };

            // Validate required fields
            if (!student.name || !student.standard) {
              console.warn(`⚠️  Skipping row with missing required fields:`, student);
              return;
            }

            students.push(student);
          } catch (error) {
            console.warn(`⚠️  Error parsing row:`, error.message, row);
          }
        })
        .on('end', () => {
          console.log(`✅ Successfully parsed CSV file`);
          resolve(students);
        })
        .on('error', (error) => {
          console.error('❌ Error reading CSV file:', error.message);
          reject(error);
        });
    });
  }

  parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      // Handle various date formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.warn(`⚠️  Invalid date format: ${dateString}`);
      return null;
    }
  }

  async findOrCreateStandard(standardName, teacherId) {
    try {
      let standard = await Standard.findOne({ 
        name: { $regex: new RegExp(`^${standardName}$`, 'i') },
        createdBy: teacherId 
      });

      if (!standard) {
        standard = new Standard({
          name: standardName,
          description: `Auto-created for ${standardName}`,
          createdBy: teacherId
        });
        await standard.save();
        console.log(`📚 Created new standard: ${standardName}`);
      }

      return standard._id;
    } catch (error) {
      console.error(`❌ Error finding/creating standard ${standardName}:`, error.message);
      throw error;
    }
  }

  async saveStudents(students, teacherId) {
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    console.log(`💾 Starting to save ${students.length} students...`);

    for (const studentData of students) {
      try {
        // Find or create standard
        const standardId = await this.findOrCreateStandard(studentData.standard, teacherId);

        // Check if student already exists
        const existingStudent = await Student.findOne({
          $or: [
            { rollNumber: studentData.rollNumber, standard: standardId, createdBy: teacherId },
            { name: studentData.name, standard: standardId, createdBy: teacherId }
          ]
        });

        if (existingStudent) {
          duplicateCount++;
          console.log(`👤 Student already exists: ${studentData.name} (${studentData.rollNumber})`);
          continue;
        }

        // Create new student
        const student = new Student({
          name: studentData.name,
          rollNumber: studentData.rollNumber || undefined,
          dateOfBirth: studentData.dateOfBirth,
          standard: standardId,
          parentContact: {
            phone: studentData.mobileNumber
          },
          createdBy: teacherId,
          isActive: true
        });

        await student.save();
        successCount++;
        console.log(`✅ Saved student: ${studentData.name}`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Error saving student ${studentData.name}:`, error.message);
      }
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`✅ Successfully imported: ${successCount} students`);
    console.log(`👤 Duplicates skipped: ${duplicateCount} students`);
    console.log(`❌ Failed to import: ${errorCount} students`);
    console.log(`📝 Total processed: ${students.length} records`);

    return { successCount, errorCount, duplicateCount };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
📚 CSV Student Importer

Usage: node import-students-csv.js <csv-file-path> <teacher-email>

Example: node import-students-csv.js students.csv teacher@example.com

CSV Format:
The CSV file should have the following columns (order doesn't matter):
- ROLLNUMBER (or ROLL_NUMBER)
- NAME
- DATEOFBIRTH (or DATE_OF_BIRTH)
- MOBILE_NUMBER (or MOBILENUMBER)
- STANDARD

Sample CSV:
ROLLNUMBER,NAME,DATEOFBIRTH,MOBILE_NUMBER,STANDARD
1,John Doe,15/08/2010,9876543210,Class 5
2,Jane Smith,22/07/2011,9876543211,Class 4

Environment Variables Required:
- MONGODB_URI: MongoDB connection string
    `);
    process.exit(1);
  }

  const csvFilePath = args[0];
  const teacherEmail = args[1];
  const importer = new CSVStudentImporter();

  try {
    await importer.importFromCSV(csvFilePath, teacherEmail);
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = CSVStudentImporter;

// Run if called directly
if (require.main === module) {
  main();
}
