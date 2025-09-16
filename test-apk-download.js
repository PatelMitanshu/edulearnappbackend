const https = require('https');
const fs = require('fs');

// Test function to verify APK download URL
async function testApkDownload(url, outputPath) {
    return new Promise((resolve, reject) => {
        console.log(`Testing APK download from: ${url}`);
        
        const file = fs.createWriteStream(outputPath);
        
        https.get(url, (response) => {
            console.log(`Status Code: ${response.statusCode}`);
            console.log(`Content-Type: ${response.headers['content-type']}`);
            console.log(`Content-Length: ${response.headers['content-length']} bytes`);
            
            if (response.statusCode === 200) {
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    console.log('✅ APK download test successful!');
                    console.log(`✅ File saved to: ${outputPath}`);
                    resolve(true);
                });
                
                file.on('error', (err) => {
                    fs.unlink(outputPath, () => {}); // Delete incomplete file
                    console.error('❌ File write error:', err.message);
                    reject(err);
                });
            } else if (response.statusCode === 302 || response.statusCode === 301) {
                console.log(`↗️  Redirect to: ${response.headers.location}`);
                // Follow redirect
                testApkDownload(response.headers.location, outputPath)
                    .then(resolve)
                    .catch(reject);
            } else if (response.statusCode === 404) {
                console.error('❌ APK not found (404). Make sure you:');
                console.error('   1. Created a GitHub release with tag v2.1.0');
                console.error('   2. Uploaded the APK file to that release');
                console.error('   3. Published the release');
                reject(new Error('APK not found'));
            } else {
                console.error(`❌ Download failed with status: ${response.statusCode}`);
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', (err) => {
            console.error('❌ Network error:', err.message);
            reject(err);
        });
    });
}

// Test the current download URL
const testUrl = 'http://192.168.1.6:3000/downloads/edulearn-v2.1.0.apk';
const testOutput = './test-download.apk';

console.log('🧪 Testing APK download URL...');
console.log('📋 This will verify if your GitHub release is properly configured');
console.log('');

testApkDownload(testUrl, testOutput)
    .then(() => {
        console.log('');
        console.log('🎉 SUCCESS: APK download URL is working correctly!');
        console.log('✅ Your app update system should work properly now.');
        
        // Clean up test file
        fs.unlink(testOutput, () => {});
    })
    .catch((error) => {
        console.log('');
        console.log('❌ FAILED: APK download URL is not working');
        console.log('🔧 Solution: Upload the APK to GitHub releases first');
        console.log('📋 Follow the instructions in GITHUB_RELEASE_GUIDE.md');
        console.log('');
        console.error('Error details:', error.message);
    });

module.exports = { testApkDownload };