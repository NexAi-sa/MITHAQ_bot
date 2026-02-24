// Mithaq Content Bot - Entry Point
// Replaces the n8n workflow with a simple Node.js cron scheduler

const cron = require('node-cron');
const { generateContent, publishApproved } = require('./lib/pipeline');

console.log('🤖 ═══════════════════════════════════════');
console.log('   Mithaq Content Bot v1.0');
console.log('   Started at:', new Date().toISOString());
console.log('═══════════════════════════════════════════\n');

// Validate required env vars
const required = [
    'OPENAI_API_KEY',
    'GOOGLE_SHEETS_ID',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'X_CONSUMER_KEY',
    'X_CONSUMER_SECRET',
    'X_ACCESS_TOKEN',
    'X_ACCESS_TOKEN_SECRET',
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    process.exit(1);
}

// Check Google auth (either service account or OAuth2)
if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_REFRESH_TOKEN) {
    console.error('❌ Need GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_REFRESH_TOKEN + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET');
    process.exit(1);
}

console.log('✅ All environment variables present\n');

// ═══════════════════════════════════════
// CRON SCHEDULE
// ═══════════════════════════════════════

// Generate fresh content every 6 hours (0:00, 6:00, 12:00, 18:00 UTC)
cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ Cron: Content generation triggered');
    await generateContent();
});

// Check for approved content every hour
cron.schedule('0 * * * *', async () => {
    console.log('⏰ Cron: Publishing check triggered');
    await publishApproved();
});

// Run immediately on startup
(async () => {
    console.log('🏁 Running initial content generation...\n');
    await generateContent();

    console.log('\n🏁 Running initial publish check...\n');
    await publishApproved();

    console.log('\n📅 Cron jobs active:');
    console.log('   - Content generation: every 6 hours');
    console.log('   - Publish check: every hour');
    console.log('\n💤 Waiting for next schedule...\n');
})();
