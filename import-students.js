const { google } = require('googleapis');
const mongoose = require('mongoose');
const Student = require('./models/Student');
const Standard = require('./models/Standard');
const Teacher = require('./models/Teacher');
require('dotenv').config();

// Google Sheets configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID; // Add this to your .env file
const RANGE = 'Sheet1!A:E'; // Adjust range as needed

class GoogleSheetsImporter {
  constructor() {
    this.auth = null;
    this.sheets = null;
  }

  async authenticate() {
    try {
      // Using service account authentication
      const credentials = {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
      };

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('✅ Google Sheets authentication successful');
    } catch (error) {
      console.error('❌ Google Sheets authentication failed:', error.message);
      throw error;
    }
  }

  async getSheetData() {
    try {
      if (!SPREADSHEET_ID) {
        throw new Error('GOOGLE_SHEETS_ID is not set in environment variables');
      }

      // First, try to get the spreadsheet metadata to see available sheets
      console.log('🔍 Getting spreadsheet information...');
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });
      
      const sheets = spreadsheet.data.sheets;
      console.log('📋 Available sheets:', sheets.map(sheet => sheet.properties.title));
      
      // Try different possible sheet names and ranges
      const possibleRanges = [
        'Sheet1!A:T',  // Extended to column T to include STANDARD
        `${sheets[0].properties.title}!A:T`,
        'Sheet1!A1:T1000',
        `${sheets[0].properties.title}!A1:T1000`
      ];

      for (const range of possibleRanges) {
        try {
          console.log(`🔍 Trying range: ${range}`);
          const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
          });

          const rows = response.data.values;
          if (rows && rows.length > 0) {
            console.log(`� Found ${rows.length} rows in range ${range}`);
            return rows;
          }
        } catch (rangeError) {
          console.warn(`⚠️  Range ${range} failed: ${rangeError.message}`);
        }
      }

      console.log('📋 No data found in any range');
      return [];
    } catch (error) {
      console.error('❌ Error reading sheet data:', error.message);
      throw error;
    }
  }

  parseStudentData(rows) {
    if (rows.length === 0) return [];

    // Get header row and create column mapping
    const headerRow = rows[0].map(header => header?.toString().trim());
    console.log('📝 Headers found:', headerRow);

    // Map specific columns for your Google Sheets
    const columnMap = {
      rollNumber: 0,     // Column A: ROLLNUMBER
      name: 1,           // Column B: NAME  
      dateOfBirth: 6,    // Column G: DATEOFBIRTH
      mobileNumber: 17,  // Column R: MOBILE NUMBER
      standard: 19       // Column T: STANDARD
    };

    console.log('📋 Using fixed column mapping for your sheet:');
    console.log('  ROLLNUMBER: Column A (1)');
    console.log('  NAME: Column B (2)');
    console.log('  DATEOFBIRTH: Column G (7)');
    console.log('  MOBILE NUMBER: Column R (18)');
    console.log('  STANDARD: Column T (20)');

    const students = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (!row || row.length === 0 || !row[columnMap.name]) continue;

      try {
        const student = {
          rollNumber: row[columnMap.rollNumber]?.toString().trim() || '',
          name: row[columnMap.name]?.toString().trim() || '',
          dateOfBirth: this.parseDate(row[columnMap.dateOfBirth]),
          mobileNumber: row[columnMap.mobileNumber]?.toString().trim() || '',
          standard: this.mapStandardName(row[columnMap.standard]?.toString().trim() || '')
        };

        // Validate required fields
        if (!student.name) {
          console.warn(`⚠️  Row ${i + 1}: Missing name field`);
          continue;
        }

        // If standard is empty, set a default
        if (!student.standard) {
          student.standard = '6th Standard'; // Default standard
          console.warn(`⚠️  Row ${i + 1}: No standard specified for ${student.name}, using default: 6th Standard`);
        }

        students.push(student);
        console.log(`✅ Parsed student: ${student.name} (Roll: ${student.rollNumber}, Standard: ${student.standard})`);
      } catch (error) {
        console.warn(`⚠️  Row ${i + 1}: Error parsing row - ${error.message}`);
      }
    }

    console.log(`\n📊 Successfully parsed ${students.length} students from your Google Sheets`);
    return students;
  }

  findColumn(headers, possibleNames) {
    for (const name of possibleNames) {
      const index = headers.findIndex(header => header.includes(name.toLowerCase()));
      if (index >= 0) return index;
    }
    return -1;
  }

  cleanPhoneNumber(phoneNumber) {
    if (!phoneNumber) return undefined;
    
    // Remove all non-digits
    const cleaned = phoneNumber.toString().replace(/\D/g, '');
    
    // If it's exactly 10 digits, return it
    if (cleaned.length === 10) {
      return cleaned;
    }
    
    // If it's 11 digits and starts with 1, remove the 1 (US format)
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return cleaned.substring(1);
    }
    
    // If it's 12 digits and starts with 91 (India format), remove 91
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned.substring(2);
    }
    
    // If still not 10 digits, return undefined to skip phone validation
    if (cleaned.length !== 10) {
      return undefined;
    }
    
    return cleaned;
  }

  mapStandardName(originalStandard) {
    if (!originalStandard) return '6th Standard';
    
    const standard = originalStandard.toString().toLowerCase().trim();
    
    // Map different naming conventions to our enum values
    if (standard.includes('6') || standard.includes('six') || standard === '6th standard') return '6th Standard';
    if (standard.includes('7') || standard.includes('seven') || standard === '7th standard') return '7th Standard';
    if (standard.includes('8') || standard.includes('eight') || standard === '8th standard') return '8th Standard';
    
    // Handle class levels
    if (standard.includes('class 6') || standard.includes('grade 6')) return '6th Standard';
    if (standard.includes('class 7') || standard.includes('grade 7')) return '7th Standard';
    if (standard.includes('class 8') || standard.includes('grade 8')) return '8th Standard';
    
    // Handle Gujarati or other formats - map them to available standards
    if (standard.includes('૬') || standard === '6') return '6th Standard';
    if (standard.includes('૭') || standard === '7') return '7th Standard';
    if (standard.includes('૮') || standard === '8') return '8th Standard';
    
    // If empty or unrecognized, default to 6th Standard
    if (standard === '' || standard === 'undefined' || standard === 'null') {
      console.warn(`⚠️  Empty standard field, defaulting to "6th Standard"`);
      return '6th Standard';
    }
    
    console.warn(`⚠️  Unknown standard format: "${originalStandard}", defaulting to "6th Standard"`);
    return '6th Standard';
  }

  parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      const dateStr = dateString.toString().trim();
      
      // Handle DD/MM/YYYY format (common in your sheet)
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Month is 0-indexed in JS
          const year = parseInt(parts[2]);
          
          if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year > 1900) {
            const date = new Date(year, month, day);
            return date;
          }
        }
      }
      
      // Handle DD-MM-YYYY format
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          
          if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year > 1900) {
            const date = new Date(year, month, day);
            return date;
          }
        }
      }
      
      // Fallback to default Date parsing
      const date = new Date(dateStr);
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
    const duplicateStudents = [];

    console.log(`💾 Starting to save ${students.length} students...`);

    // Generate unique roll numbers for students without them
    const standardRollCounters = {};

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      
      try {
        // Get or create standard
        const standardId = await this.findOrCreateStandard(studentData.standard, teacherId);

        // Generate roll number if missing
        if (!studentData.rollNumber || studentData.rollNumber.trim() === '') {
          if (!standardRollCounters[studentData.standard]) {
            // Find the highest existing roll number for this standard
            const lastStudent = await Student.findOne(
              { standard: standardId, createdBy: teacherId },
              { rollNumber: 1 }
            ).sort({ rollNumber: -1 });
            
            const lastRollNum = lastStudent?.rollNumber ? parseInt(lastStudent.rollNumber) || 0 : 0;
            standardRollCounters[studentData.standard] = lastRollNum;
          }
          
          standardRollCounters[studentData.standard]++;
          studentData.rollNumber = standardRollCounters[studentData.standard].toString();
          console.log(`🔢 Generated roll number ${studentData.rollNumber} for ${studentData.name}`);
        }

        // Check for existing student (by name or roll number in same standard)
        const existingStudent = await Student.findOne({
          $or: [
            { name: studentData.name, standard: standardId, createdBy: teacherId },
            { rollNumber: studentData.rollNumber, standard: standardId, createdBy: teacherId }
          ]
        });

        if (existingStudent) {
          duplicateStudents.push(`${studentData.name} (${studentData.rollNumber})`);
          console.log(`👤 Student already exists: ${studentData.name} (${studentData.rollNumber})`);
          continue;
        }

        // Create new student
        const student = new Student({
          name: studentData.name,
          rollNumber: studentData.rollNumber,
          dateOfBirth: studentData.dateOfBirth,
          standard: standardId,
          parentContact: {
            phone: this.cleanPhoneNumber(studentData.mobileNumber)
          },
          createdBy: teacherId,
          isActive: true
        });

        await student.save();
        successCount++;
        console.log(`✅ Saved student: ${studentData.name} (Roll: ${studentData.rollNumber})`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Error saving student ${studentData.name}:`, error.message);
      }
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`✅ Successfully imported: ${successCount} students`);
    console.log(`👤 Duplicates skipped: ${duplicateStudents.length} students`);
    console.log(`❌ Failed to import: ${errorCount} students`);
    console.log(`📝 Total processed: ${students.length} records`);

    return { successCount, errorCount, duplicates: duplicateStudents.length };
  }

  async importStudents(teacherEmail) {
    try {
      console.log('🚀 Starting Google Sheets import process...\n');

      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('📦 Connected to MongoDB');

      // Find teacher
      const teacher = await Teacher.findOne({ email: teacherEmail, isActive: true });
      if (!teacher) {
        throw new Error(`Teacher not found with email: ${teacherEmail}`);
      }
      console.log(`👨‍🏫 Found teacher: ${teacher.name}`);

      // Authenticate with Google Sheets
      await this.authenticate();

      // Get data from Google Sheets
      const rows = await this.getSheetData();

      // Parse student data
      const students = this.parseStudentData(rows);

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
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📚 Google Sheets Student Importer

Usage: node import-students.js <teacher-email>

Example: node import-students.js teacher@example.com

Environment Variables Required:
- GOOGLE_SHEETS_ID: Your Google Sheets ID
- GOOGLE_PROJECT_ID: Google Cloud Project ID
- GOOGLE_PRIVATE_KEY_ID: Service Account Private Key ID
- GOOGLE_PRIVATE_KEY: Service Account Private Key
- GOOGLE_CLIENT_EMAIL: Service Account Email
- GOOGLE_CLIENT_ID: Service Account Client ID
- MONGODB_URI: MongoDB connection string
    `);
    process.exit(1);
  }

  const teacherEmail = args[0];
  const importer = new GoogleSheetsImporter();

  try {
    await importer.importStudents(teacherEmail);
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = GoogleSheetsImporter;

// Run if called directly
if (require.main === module) {
  main();
}
