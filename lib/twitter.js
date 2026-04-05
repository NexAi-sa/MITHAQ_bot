// X/Twitter posting using OAuth 1.0a
// No browser auth needed - uses pre-generated keys

const crypto = require('crypto');
const https = require('https');

const CONFIG = {
  consumerKey: process.env.X_CONSUMER_KEY,
  consumerSecret: process.env.X_CONSUMER_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET,
};

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateSignature(method, url, params) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');
  const baseString = `${method}&${percentEncode(url)}&${percentEncode(sorted)}`;
  const signingKey = `${percentEncode(CONFIG.consumerSecret)}&${percentEncode(CONFIG.accessTokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

function buildAuthHeader(oauthParams) {
  return (
    'OAuth ' +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
      .join(', ')
  );
}

function postTweet(text, replyToId = null, mediaIds = null) {
  return new Promise((resolve, reject) => {
    const url = 'https://api.twitter.com/2/tweets';
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const oauthParams = {
      oauth_consumer_key: CONFIG.consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: CONFIG.accessToken,
      oauth_version: '1.0',
    };

    oauthParams.oauth_signature = generateSignature('POST', url, oauthParams);
    const authHeader = buildAuthHeader(oauthParams);

    const payload = { text };
    if (replyToId) payload.reply = { in_reply_to_tweet_id: replyToId };
    if (mediaIds && mediaIds.length > 0) payload.media = { media_ids: mediaIds };
    
    const body = JSON.stringify(payload);

    const options = {
      hostname: 'api.twitter.com',
      path: '/2/tweets',
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ Tweet posted: ${parsed.data?.id || 'OK'}`);
            resolve(parsed);
          } else {
            console.error(`❌ X API error (${res.statusCode}):`, data);
            reject(new Error(`X API ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`X parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function uploadMedia(b64Data) {
  return new Promise((resolve, reject) => {
    const url = 'https://upload.twitter.com/1.1/media/upload.json';
    const method = 'POST';
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // No body params in oauth signature for multipart
    const oauthParams = {
      oauth_consumer_key: CONFIG.consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: CONFIG.accessToken,
      oauth_version: '1.0',
    };

    oauthParams.oauth_signature = generateSignature(method, url, oauthParams);
    const authHeader = buildAuthHeader(oauthParams);

    const boundary = '----TwitterMediaUploadBoundary' + crypto.randomBytes(8).toString('hex');
    let body = `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="media_data"\r\n\r\n';
    body += b64Data + '\r\n';
    body += `--${boundary}--\r\n`;

    const options = {
      hostname: 'upload.twitter.com',
      path: '/1.1/media/upload.json',
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ Media uploaded: ${parsed.media_id_string}`);
            resolve(parsed.media_id_string);
          } else {
            console.error(`❌ Media upload error (${res.statusCode}):`, data);
            reject(new Error(`X API upload ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`X parse error on upload: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function postThread(tweets, firstTweetMediaIds = null) {
  let lastId = null;
  const results = [];
  for (let i = 0; i < tweets.length; i++) {
    const text = tweets[i];
    // Attach media only to the first tweet of the thread
    const mediaIds = i === 0 ? firstTweetMediaIds : null;
    const result = await postTweet(text, lastId, mediaIds);
    results.push(result);
    lastId = result.data?.id;
    // Small delay between thread tweets
    await new Promise((r) => setTimeout(r, 1000));
  }
  return results;
}

module.exports = { postTweet, postThread, uploadMedia };
