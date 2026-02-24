// One-time OAuth2 setup script
// Run this ONCE to get a refresh token, then set it as GOOGLE_REFRESH_TOKEN env var

const http = require('http');
const { google } = require('googleapis');

// Your OAuth2 credentials from Google Cloud Console
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3333/callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/spreadsheets'],
});

console.log('\n🔑 Google Sheets OAuth2 Setup\n');
console.log('1. Open this URL in your browser:\n');
console.log(`   ${authUrl}\n`);
console.log('2. Authorize access and wait for the redirect...\n');

// Start temporary server to catch the callback
const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/callback')) {
        const url = new URL(req.url, 'http://localhost:3333');
        const code = url.searchParams.get('code');

        if (code) {
            try {
                const { tokens } = await oauth2Client.getToken(code);
                console.log('\n✅ SUCCESS! Your refresh token:\n');
                console.log(`   GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
                console.log('   Add this to your Railway environment variables.\n');

                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<h1>✅ تم بنجاح!</h1><p>ارجع للتيرمنال وانسخ الـ GOOGLE_REFRESH_TOKEN</p><p>ممكن تغلق هذي الصفحة الحين.</p>');
            } catch (err) {
                console.error('❌ Error:', err.message);
                res.writeHead(500);
                res.end('Error: ' + err.message);
            }
        }

        setTimeout(() => {
            server.close();
            process.exit(0);
        }, 2000);
    }
});

server.listen(3333, () => {
    console.log('🌐 Waiting for callback on http://localhost:3333/callback ...\n');
});
