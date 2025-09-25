#!/usr/bin/env node

// Direct OAuth test to verify Google credentials
const https = require('https');
const querystring = require('querystring');

console.log('🔍 Testing Google OAuth Credentials Directly');
console.log('===============================================');

// Read credentials from .env
const fs = require('fs');
const envFile = fs.readFileSync('/app/.env', 'utf8');
const envLines = envFile.split('\n');

let clientId = '';
let clientSecret = '';

envLines.forEach(line => {
  if (line.startsWith('GOOGLE_CLIENT_ID=')) {
    clientId = line.split('=')[1].trim();
  }
  if (line.startsWith('GOOGLE_CLIENT_SECRET=')) {
    clientSecret = line.split('=')[1].trim();
  }
});

console.log('Client ID:', clientId ? clientId.substring(0, 20) + '...' : 'NOT FOUND');
console.log('Client Secret:', clientSecret ? 'GOCSPX-' + clientSecret.substring(7, 15) + '...' : 'NOT FOUND');

if (!clientId || !clientSecret) {
  console.log('❌ ERROR: Missing OAuth credentials in .env file');
  process.exit(1);
}

// Test 1: Check if credentials are valid by making a basic OAuth discovery request
console.log('\n📍 Test 1: OAuth Discovery Request');
const discoveryUrl = 'https://accounts.google.com/.well-known/openid_configuration';

https.get(discoveryUrl, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Google OAuth Discovery: SUCCESS');
      const config = JSON.parse(data);
      console.log('   Token endpoint:', config.token_endpoint);
      console.log('   Auth endpoint:', config.authorization_endpoint);
      
      // Test 2: Try to validate client credentials with Google
      testClientCredentials(clientId, clientSecret, config.token_endpoint);
    } else {
      console.log('❌ Google OAuth Discovery: FAILED', res.statusCode);
    }
  });
}).on('error', (err) => {
  console.log('❌ Network error:', err.message);
});

function testClientCredentials(clientId, clientSecret, tokenEndpoint) {
  console.log('\n📍 Test 2: Client Credentials Validation');
  
  // Prepare token request (using client_credentials grant type for validation)
  const postData = querystring.stringify({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });

  const options = {
    hostname: 'oauth2.googleapis.com',
    port: 443,
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Response status:', res.statusCode);
      
      if (res.statusCode === 200) {
        console.log('✅ Client Credentials: VALID');
        console.log('   Google recognizes your OAuth client');
      } else if (res.statusCode === 400 || res.statusCode === 401) {
        console.log('❌ Client Credentials: INVALID');
        try {
          const error = JSON.parse(data);
          console.log('   Error:', error.error);
          console.log('   Description:', error.error_description);
          
          if (error.error === 'invalid_client') {
            console.log('\n🔧 SOLUTION NEEDED:');
            console.log('   1. Verify Client ID and Secret in Google Console');
            console.log('   2. Check if OAuth client is ACTIVE (not disabled)');
            console.log('   3. Ensure OAuth consent screen is configured');
            console.log('   4. Consider creating new OAuth credentials');
          }
        } catch (e) {
          console.log('   Raw response:', data);
        }
      } else {
        console.log('⚠️  Unexpected response:', res.statusCode);
        console.log('   Data:', data);
      }
    });
  });

  req.on('error', (err) => {
    console.log('❌ Request error:', err.message);
  });

  req.write(postData);
  req.end();
}