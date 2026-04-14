// Mithaq Content Bot - Entry Point
// Replaces the n8n workflow with a simple Node.js cron scheduler

const cron = require('node-cron');
let pipeline;
try {
    pipeline = require('./lib/pipeline');
} catch {
    pipeline = require('./pipeline');
}
const { generateContent, publishApproved } = pipeline;

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
// CRON SCHEDULE (Optimized for Saudi audience 23-36 age group)
// Times are in UTC (KSA = UTC+3)
// ═══════════════════════════════════════

// 🌅 Morning slot: 7:00 AM KSA (4:00 UTC) — commute scrolling
cron.schedule('0 4 * * *', async () => {
    console.log('⏰ Cron [صباح]: Content generation triggered (7 AM KSA)');
    await generateContent();
});

// 🍽️ Lunch slot: 12:00 PM KSA (9:00 UTC) — lunch break engagement
cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Cron [ظهر]: Content generation triggered (12 PM KSA)');
    await generateContent();
});

// 🌆 Evening slot: 5:00 PM KSA (14:00 UTC) — post-work browsing
cron.schedule('0 14 * * *', async () => {
    console.log('⏰ Cron [مساء]: Content generation triggered (5 PM KSA)');
    await generateContent();
});

// 🌙 Night slot: 9:00 PM KSA (18:00 UTC) — golden period, highest engagement
cron.schedule('0 18 * * *', async () => {
    console.log('⏰ Cron [ليل]: Content generation triggered (9 PM KSA)');
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

    console.log('\n📅 Cron jobs active (KSA times):');
    console.log('   - 🌅 صباح: 7:00 AM KSA — تغريدات تحفيزية');
    console.log('   - 🍽️ ظهر: 12:00 PM KSA — إحصائيات ومقارنات');
    console.log('   - 🌆 مساء: 5:00 PM KSA — محتوى تفاعلي');
    console.log('   - 🌙 ليل: 9:00 PM KSA — محتوى عميق (الفترة الذهبية)');
    console.log('   - 📤 Publish check: every hour');
    console.log('\n💤 Waiting for next schedule...\n');
})();
