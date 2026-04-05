// Telegram notifications via Bot API
const https = require('https');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendMessage(text) {
    return new Promise((resolve, reject) => {
        // Use plain text to avoid Markdown parsing errors
        const body = JSON.stringify({
            chat_id: CHAT_ID,
            text: text.replace(/[*_`\[\]()~>#+=|{}.!-]/g, ''),
        });

        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ Telegram notification sent');
                    resolve(JSON.parse(data));
                } else {
                    console.error(`❌ Telegram error (${res.statusCode}):`, data);
                    reject(new Error(`Telegram ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function notifyNewContent(content) {
    const msg =
        `🆕 تغريدة جديدة جاهزة للموافقة\n\n` +
        `📌 المحور: ${content.pillar || 'N/A'}\n` +
        `🎯 الشخصية: ${content.persona || 'N/A'}\n\n` +
        `📝 التغريدة:\n${content.tweet || 'N/A'}\n\n` +
        `⏰ وقت النشر المقترح: ${content.postingTime || 'N/A'}\n\n` +
        `✅ للموافقة: غير Status الى Approved في Google Sheets`;

    return sendMessage(msg);
}

module.exports = { sendMessage, notifyNewContent };
