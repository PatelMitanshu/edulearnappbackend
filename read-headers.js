const { google } = require('googleapis');
require('dotenv').config();

async function readAllHeaders() {
  try {
    console.log('🔧 Reading all headers from Google Sheets...\n');

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
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GOOGLE_CLIENT_EMAIL)}`
    };

    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Read first row (headers) with extended range
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Sheet1!A1:Z1',
    });

    const headers = response.data.values[0];
    console.log('📋 All Column Headers:');
    headers.forEach((header, index) => {
      const letter = String.fromCharCode(65 + index); // A, B, C, etc.
      console.log(`${letter} (${index + 1}): ${header}`);
    });

    console.log(`\nTotal columns: ${headers.length}`);

    // Also read first few data rows
    console.log('\n📝 First few data rows:');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Sheet1!A2:Z6',
    });

    const dataRows = dataResponse.data.values;
    if (dataRows && dataRows.length > 0) {
      dataRows.forEach((row, index) => {
        console.log(`Row ${index + 2}:`, row.slice(0, 10)); // Show first 10 columns
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

readAllHeaders();
