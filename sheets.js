// Google Sheets integration using OAuth2 with refresh token
const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;

let sheetsClient = null;

async function getClient() {
    if (sheetsClient) return sheetsClient;

    let auth;

    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        // Service Account auth
        const keyJson = JSON.parse(
            Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
        );
        auth = new google.auth.GoogleAuth({
            credentials: keyJson,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    } else if (process.env.GOOGLE_REFRESH_TOKEN) {
        // OAuth2 with refresh token
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });
        auth = oauth2Client;
    } else {
        throw new Error(
            'Either GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_REFRESH_TOKEN is required'
        );
    }

    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
}

async function ensureHeaders() {
    const sheets = await getClient();

    // Check if headers exist
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A1:I1',
    });

    const headers = response.data.values?.[0] || [];
    if (headers.length === 0) {
        // Add headers
        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A1:I1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [
                    [
                        'Content_Idea',
                        'Content_Pillar',
                        'Target_Persona',
                        'Tweet_Content',
                        'Optimized_Tweet',
                        'Status',
                        'Posting_Time',
                        'Created_At',
                        'Published_At',
                    ],
                ],
            },
        });
        console.log('📋 Headers created in Google Sheet');
    }
}

async function appendRow(data) {
    const sheets = await getClient();
    await ensureHeaders();

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const values = [
        [
            data.contentIdea || '',
            data.contentPillar || '',
            data.targetPersona || '',
            data.tweetContent || '',
            data.optimizedTweet || '',
            'Pending Approval',
            data.postingTime || '',
            now, // Created_At
            '', // Published_At (empty)
        ],
    ];

    const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A:I',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });

    console.log('✅ Row added to Google Sheets');
    return response.data;
}

async function readApproved() {
    const sheets = await getClient();

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A:I',
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return []; // Only header or empty

    const headers = rows[0];
    const statusIdx = headers.indexOf('Status');
    const optimizedIdx = headers.indexOf('Optimized_Tweet');
    const createdIdx = headers.indexOf('Created_At');

    if (statusIdx === -1) {
        console.log('⚠️ No "Status" column found in sheet');
        return [];
    }

    const approved = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[statusIdx] === 'Approved') {
            approved.push({
                rowIndex: i + 1, // 1-indexed for Sheets API
                optimizedTweet: row[optimizedIdx] || row[4] || '',
                createdAt: row[createdIdx] || row[7] || '',
                rawRow: row,
            });
        }
    }

    console.log(`📋 Found ${approved.length} approved tweet(s)`);
    return approved;
}

async function updateStatus(rowIndex, status) {
    const sheets = await getClient();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Update Status (F) and Published_At (I)
    await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Sheet1!F${rowIndex}:I${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[status, '', '', now]],
        },
    });

    console.log(`✅ Row ${rowIndex} updated to "${status}"`);
}

module.exports = { appendRow, readApproved, updateStatus };
