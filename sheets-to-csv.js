const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Simple Google Sheets to CSV Converter
 * This script converts Google Sheets data to CSV format that can be used with the CSV importer
 */
class GoogleSheetsToCSV {
  constructor() {
    this.auth = null;
    this.sheets = null;
  }

  async authenticate() {
    try {
      // You can use either service account or API key
      if (process.env.GOOGLE_API_KEY) {
        // Simple API key method (sheets must be public)
        this.sheets = google.sheets({ 
          version: 'v4', 
          auth: process.env.GOOGLE_API_KEY 
        });
        console.log('✅ Using Google API Key authentication');
      } else {
        // Service account method
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
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
        console.log('✅ Using Service Account authentication');
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      throw error;
    }
  }

  async convertToCSV(spreadsheetId, range = 'Sheet1!A:E', outputFile = 'students.csv') {
    try {
      console.log('🔄 Converting Google Sheets to CSV...');

      await this.authenticate();

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        throw new Error('No data found in the sheet');
      }

      // Convert to CSV format
      const csvContent = rows.map(row => 
        row.map(cell => {
          // Escape commas and quotes in CSV
          const cellValue = (cell || '').toString();
          if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
            return `"${cellValue.replace(/"/g, '""')}"`;
          }
          return cellValue;
        }).join(',')
      ).join('\n');

      // Write to file
      const outputPath = path.join(__dirname, outputFile);
      fs.writeFileSync(outputPath, csvContent, 'utf8');

      console.log(`✅ Successfully converted to CSV: ${outputPath}`);
      console.log(`📊 Converted ${rows.length} rows (including header)`);
      
      return outputPath;

    } catch (error) {
      console.error('❌ Conversion failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📊 Google Sheets to CSV Converter

Usage: node sheets-to-csv.js <spreadsheet-id> [range] [output-file]

Examples:
  node sheets-to-csv.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
  node sheets-to-csv.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms "Sheet1!A:E"
  node sheets-to-csv.js 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms "Sheet1!A:E" "my-students.csv"

How to get your spreadsheet ID:
1. Open your Google Sheet
2. Copy the ID from the URL: https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
3. Make sure the sheet is either:
   - Public (anyone with link can view), OR
   - Shared with your service account email

Environment Variables (choose one method):

Method 1 - API Key (simpler, but sheet must be public):
- GOOGLE_API_KEY: Your Google API key

Method 2 - Service Account (more secure):
- GOOGLE_PROJECT_ID: Google Cloud Project ID  
- GOOGLE_PRIVATE_KEY_ID: Service Account Private Key ID
- GOOGLE_PRIVATE_KEY: Service Account Private Key
- GOOGLE_CLIENT_EMAIL: Service Account Email
- GOOGLE_CLIENT_ID: Service Account Client ID
    `);
    process.exit(1);
  }

  const spreadsheetId = args[0];
  const range = args[1] || 'Sheet1!A:E';
  const outputFile = args[2] || 'students.csv';

  const converter = new GoogleSheetsToCSV();

  try {
    const csvPath = await converter.convertToCSV(spreadsheetId, range, outputFile);
    console.log(`\n🎉 Conversion completed!`);
    console.log(`📁 CSV file created: ${csvPath}`);
    console.log(`\n💡 Next step: Run the CSV importer:`);
    console.log(`   node import-students-csv.js ${outputFile} teacher@example.com`);
    process.exit(0);
  } catch (error) {
    console.error('💥 Conversion failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = GoogleSheetsToCSV;

// Run if called directly
if (require.main === module) {
  main();
}
