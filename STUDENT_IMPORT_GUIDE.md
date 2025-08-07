# Student Data Import from Google Sheets

This guide explains how to import student data from Google Sheets into the EduLearn database.

## 📋 Required CSV Format

Your Google Sheets or CSV file should have the following columns (order doesn't matter):

| Column Name | Description | Required | Example |
|-------------|-------------|----------|---------|
| ROLLNUMBER | Student roll number | No | 1, 2, 3 |
| NAME | Student full name | Yes | John Doe |
| DATEOFBIRTH | Date of birth | No | 15/08/2010, 2010-08-15 |
| MOBILE_NUMBER | Parent/guardian mobile | No | 9876543210 |
| STANDARD | Class/grade name | Yes | 6th Standard, 7th Standard, 8th Standard |

**Note:** The STANDARD column must use one of these exact values: `6th Standard`, `7th Standard`, or `8th Standard`.

## 🚀 Import Methods

### Method 1: CSV File Import (Recommended)

This is the simplest method. First, export your Google Sheets as CSV, then import it.

#### Step 1: Export Google Sheets to CSV
1. Open your Google Sheets
2. Go to `File > Download > Comma Separated Values (.csv)`
3. Save the file (e.g., `students.csv`)

#### Step 2: Run the CSV Import Script
```bash
cd backend
node import-students-csv.js students.csv teacher@example.com
```

**Example:**
```bash
node import-students-csv.js sample-students.csv mapatelma31@gmail.com
```

### Method 2: Direct Google Sheets Import

Import directly from Google Sheets without downloading.

#### Step 1: Setup Google Sheets API

**Option A: API Key (Simple, but sheet must be public)**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Sheets API
4. Create an API key
5. Add to `.env` file:
```
GOOGLE_API_KEY=your_api_key_here
```

**Option B: Service Account (Recommended)**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a service account
3. Download the JSON key file
4. Add credentials to `.env` file:
```
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_PROJECT_ID=your_project_id
GOOGLE_PRIVATE_KEY_ID=key_id_from_json
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=client_id_from_json
```

#### Step 2: Get Your Google Sheets ID
From this URL: `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
The ID is: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

#### Step 3: Convert Sheets to CSV (Optional)
```bash
node sheets-to-csv.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

#### Step 4: Import Students
```bash
node import-students.js teacher@example.com
```

## 📊 Sample Data

See `sample-students.csv` for an example of the correct format:

```csv
ROLLNUMBER,NAME,DATEOFBIRTH,MOBILE_NUMBER,STANDARD
1,Aarav Sharma,15/08/2010,9876543210,6th Standard
2,Ananya Patel,22/07/2011,9876543211,7th Standard
3,Arjun Kumar,10/09/2010,9876543212,6th Standard
```

## 🔧 Troubleshooting

### Common Issues

**1. "Teacher not found"**
- Make sure the teacher email exists in the database
- Use the exact email address from the teacher's account

**2. "CSV file not found"**
- Check the file path is correct
- Make sure you're in the backend directory when running the script

**3. "Google Sheets authentication failed"**
- Verify your API key or service account credentials
- Make sure the Google Sheets API is enabled
- Check that the sheet is shared with your service account email

**4. "No data found in sheet"**
- Verify the sheet has data in the specified range
- Check the sheet name and range (default: "Sheet1!A:E")

### Data Validation

The script will:
- ✅ Skip rows with missing required fields (name, standard)
- ✅ Auto-create standards if they don't exist
- ✅ Skip duplicate students (same name or roll number in same standard)
- ✅ Handle various date formats
- ⚠️ Show warnings for invalid data

## 📈 Import Summary

After import, you'll see a summary like:
```
📊 Import Summary:
✅ Successfully imported: 8 students
👤 Duplicates skipped: 2 students
❌ Failed to import: 0 students
📝 Total processed: 10 records
```

## 🔐 Security Notes

- Use service account authentication for production
- Keep your API keys and credentials secure
- Don't commit credentials to version control
- Consider making sheets private and sharing only with service account

## 💡 Tips

1. **Test with sample data first** - Use the provided `sample-students.csv`
2. **Clean your data** - Remove empty rows and fix formatting issues
3. **Backup your database** - Always backup before large imports
4. **Import in batches** - For large datasets, consider splitting into smaller files
5. **Check logs** - The script provides detailed logs for troubleshooting

## 🚀 Quick Start

**✅ Working Method (Recommended):**
1. Download your Google Sheets as CSV
2. Run: `node import-students-csv.js your-file.csv mapatelma31@gmail.com`
3. Check the logs for import status
4. Verify data in your app

**📝 Test with Sample Data:**
```bash
node import-students-csv.js sample-students.csv mapatelma31@gmail.com
```

**⚠️ Google Sheets API Setup Required:**
For direct Google Sheets import, you need to:
1. Enable Google Sheets API in your Google Cloud Console
2. Replace the placeholder credentials in `.env` with real ones
3. Then use: `node import-students.js mapatelma31@gmail.com`

## 📊 Current Status

- ✅ **CSV Import**: Fully working and tested
- ✅ **Sample Data**: Available with 10 test students  
- ⚠️ **Google Sheets Direct Import**: Requires API setup
- ⚠️ **Sheets to CSV Converter**: Requires valid API key

## ✅ Validation Rules

- **STANDARD field**: Must be exactly one of: `6th Standard`, `7th Standard`, `8th Standard`
- **NAME field**: Required, cannot be empty
- **Teacher email**: Must exist in database (use: `mapatelma31@gmail.com`)

That's it! Your students should now be imported into the database.
