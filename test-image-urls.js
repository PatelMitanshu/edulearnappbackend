const https = require('https');
const http = require('http');

// Test the failing image URLs
const testUrls = [
  'https://qdvdptbkzlpzcormseaz.supabase.co/storage/v1/object/public/edulearner/profiles/students/68abe5750d3adbf178fd97c2/1756222739818-j9x14unlz.jpg',
  'https://qdvdptbkzlpzcormseaz.supabase.co/storage/v1/object/public/edulearner/profiles/students/68abe5770d3adbf178fd97cc/1756222809704-af30pbm2s.jpg',
  'https://qdvdptbkzlpzcormseaz.supabase.co/storage/v1/object/public/edulearner/profiles/students/68abe5780d3adbf178fd97d6/1756222869539-c366f55kw.jpg'
];

function testImageUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      console.log(`\n🔍 Testing: ${url}`);
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`Content-Type: ${res.headers['content-type']}`);
      console.log(`Content-Length: ${res.headers['content-length']}`);
      console.log(`Cache-Control: ${res.headers['cache-control']}`);
      console.log(`Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin']}`);
      
      if (res.statusCode === 200) {
        console.log('✅ URL is accessible');
      } else {
        console.log('❌ URL returned error status');
      }
      
      resolve({
        url,
        status: res.statusCode,
        headers: res.headers,
        success: res.statusCode === 200
      });
    });
    
    req.on('error', (error) => {
      console.log(`\n❌ Error testing ${url}:`, error.message);
      resolve({
        url,
        error: error.message,
        success: false
      });
    });
    
    req.setTimeout(10000, () => {
      console.log(`\n⏰ Timeout testing ${url}`);
      req.destroy();
      resolve({
        url,
        error: 'Timeout',
        success: false
      });
    });
    
    req.end();
  });
}

async function testAllUrls() {
  console.log('🧪 Testing image URLs that are failing in React Native...\n');
  
  const results = [];
  for (const url of testUrls) {
    const result = await testImageUrl(url);
    results.push(result);
  }
  
  console.log('\n📊 Summary:');
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.url.slice(-30)}... - ${result.success ? 'OK' : result.error || result.status}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n${successCount}/${results.length} URLs are accessible`);
}

testAllUrls().catch(console.error);
