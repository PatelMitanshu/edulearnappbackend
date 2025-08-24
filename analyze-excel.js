const XLSX = require('xlsx');
const fs = require('fs');

function analyzeExcelFile(filePath) {
  try {
    console.log(`Analyzing Excel file: ${filePath}`);
    console.log('='.repeat(50));
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      console.log('Error: Excel file must contain at least a header row and one data row');
      return;
    }
    
    const headers = jsonData[0];
    const rows = jsonData.slice(1);
    
    console.log(`Headers found: ${headers.join(', ')}`);
    console.log(`Total data rows: ${rows.length}`);
    console.log('-'.repeat(30));
    
    // Find UID column
    let uidColumnIndex = -1;
    headers.forEach((header, index) => {
      const cleanHeader = header.toString().toLowerCase().trim();
      if (cleanHeader.includes('uid') || cleanHeader === 'યુઆઈડી' || 
          cleanHeader.includes('id') || cleanHeader.includes('આઈડી')) {
        uidColumnIndex = index;
        console.log(`UID column found at index ${index}: "${header}"`);
      }
    });
    
    if (uidColumnIndex === -1) {
      console.log('No UID column found in the Excel file');
      return;
    }
    
    // Analyze UIDs
    const uids = [];
    const uidCounts = {};
    const emptyUIDs = [];
    
    rows.forEach((row, index) => {
      const uid = row[uidColumnIndex];
      const rowNumber = index + 2; // +2 because we start from row 2
      
      if (uid === null || uid === undefined || uid === '') {
        emptyUIDs.push(rowNumber);
      } else {
        const uidStr = uid.toString().trim();
        uids.push({ uid: uidStr, row: rowNumber });
        
        if (!uidCounts[uidStr]) {
          uidCounts[uidStr] = [];
        }
        uidCounts[uidStr].push(rowNumber);
      }
    });
    
    console.log(`\nUID Analysis:`);
    console.log(`- Total UIDs found: ${uids.length}`);
    console.log(`- Empty UIDs: ${emptyUIDs.length} rows (${emptyUIDs.slice(0, 5).join(', ')}${emptyUIDs.length > 5 ? '...' : ''})`);
    console.log(`- Unique UIDs: ${Object.keys(uidCounts).length}`);
    
    // Find duplicates
    const duplicates = Object.entries(uidCounts).filter(([uid, rows]) => rows.length > 1);
    
    if (duplicates.length > 0) {
      console.log(`\n❌ DUPLICATE UIDs FOUND (${duplicates.length}):`);
      duplicates.forEach(([uid, rows]) => {
        console.log(`  UID "${uid}": appears in rows ${rows.join(', ')}`);
      });
      
      console.log(`\n🔍 Detailed duplicate analysis:`);
      duplicates.forEach(([uid, rows]) => {
        console.log(`\n  UID "${uid}":`);
        rows.forEach(rowNum => {
          const rowIndex = rowNum - 2; // Convert back to array index
          const row = rows[rowIndex];
          const nameCol = headers.findIndex(h => 
            h.toString().toLowerCase().includes('name') || 
            h.toString().includes('નામ')
          );
          const name = nameCol >= 0 ? (row[nameCol] || 'Unknown') : 'Unknown';
          console.log(`    Row ${rowNum}: ${name}`);
        });
      });
      
    } else {
      console.log(`\n✅ No duplicate UIDs found! All UIDs are unique.`);
    }
    
    // Show sample UIDs
    console.log(`\nSample UIDs (first 10):`);
    uids.slice(0, 10).forEach(({ uid, row }) => {
      console.log(`  Row ${row}: ${uid}`);
    });
    
  } catch (error) {
    console.error('Error analyzing Excel file:', error.message);
    console.log('\nUsage: node analyze-excel.js <path-to-excel-file>');
  }
}

// Get file path from command line argument
const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node analyze-excel.js <path-to-excel-file>');
  console.log('Example: node analyze-excel.js students.xlsx');
} else if (!fs.existsSync(filePath)) {
  console.log(`Error: File not found: ${filePath}`);
} else {
  analyzeExcelFile(filePath);
}
