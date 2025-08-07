const { google } = require('googleapis');
require('dotenv').config();

async function testGoogleSheets() {
  try {
    console.log('🔧 Testing Google Sheets API connection...\n');

    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log('GOOGLE_SHEETS_ID:', process.env.GOOGLE_SHEETS_ID ? 'Set' : 'Not set');
    console.log('GOOGLE_PROJECT_ID:', process.env.GOOGLE_PROJECT_ID ? 'Set' : 'Not set');
    console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL ? 'Set' : 'Not set');
    console.log('GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'Set' : 'Not set');
    console.log();

    if (!process.env.GOOGLE_SHEETS_ID) {
      throw new Error('GOOGLE_SHEETS_ID is not set in environment variables');
    }

    // Create auth
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

    console.log('🔑 Creating Google Auth...');
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    console.log('✅ Google Auth created successfully');

    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets API client created');

    // Get spreadsheet metadata
    console.log('🔍 Getting spreadsheet metadata...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    });

    console.log('\n📊 Spreadsheet Information:');
    console.log('Title:', spreadsheet.data.properties.title);
    console.log('Locale:', spreadsheet.data.properties.locale);
    console.log('Sheets count:', spreadsheet.data.sheets.length);

    console.log('\n📋 Available Sheets:');
    spreadsheet.data.sheets.forEach((sheet, index) => {
      console.log(`${index + 1}. ${sheet.properties.title} (${sheet.properties.gridProperties.rowCount} rows, ${sheet.properties.gridProperties.columnCount} cols)`);
    });

    // Try to read data from the first sheet
    const firstSheetName = spreadsheet.data.sheets[0].properties.title;
    console.log(`\n🔍 Trying to read data from: ${firstSheetName}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: `${firstSheetName}!A1:E10`,
    });

    const rows = response.data.values;
    if (rows && rows.length > 0) {
      console.log(`✅ Successfully read ${rows.length} rows`);
      console.log('\n📝 First few rows:');
      rows.slice(0, 5).forEach((row, index) => {
        console.log(`${index + 1}: [${row.join(', ')}]`);
      });
    } else {
      console.log('📋 No data found');
    }

    console.log('\n🎉 Google Sheets API test completed successfully!');

  } catch (error) {
    console.error('\n❌ Google Sheets API test failed:');
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Code:', error.code);
    }
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}

testGoogleSheets();
