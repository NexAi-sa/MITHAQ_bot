// Main pipeline: Content Generation + Publishing
const ai = require('./openai');
const sheets = require('./sheets');
const twitter = require('./twitter');
const telegram = require('./telegram');

// ═══════════════════════════════════════════
// PIPELINE 1: Generate Content
// Runs every 6 hours
// ═══════════════════════════════════════════
async function generateContent() {
    console.log('\n🚀 ═══ CONTENT GENERATION PIPELINE ═══');
    console.log(`⏰ ${new Date().toISOString()}\n`);

    try {
        // Step 1: Strategy
        const strategy = await ai.generateStrategy();

        // Step 2: Write tweet
        const tweet = await ai.writeTweet(strategy);

        // Step 3: Optimize
        const optimized = await ai.optimizeTweet(tweet);

        // Parse results
        let strategyData, tweetData, optimizedData;
        try {
            strategyData = JSON.parse(ai.cleanJson(strategy));
        } catch {
            strategyData = { content_pillar: '', target_persona: '', content_idea: strategy };
        }
        try {
            optimizedData = JSON.parse(ai.cleanJson(optimized));
        } catch {
            optimizedData = { optimized_tweet_1: optimized };
        }

        // Step 4: Save to Google Sheets
        await sheets.appendRow({
            contentIdea: strategyData.content_idea || strategy.substring(0, 200),
            contentPillar: strategyData.content_pillar || '',
            targetPersona: strategyData.target_persona || '',
            tweetContent: tweet,
            optimizedTweet: optimized,
            postingTime: optimizedData.optimal_posting_time || strategyData.suggested_posting_time || '',
        });

        // Step 5: Telegram notification
        await telegram.notifyNewContent({
            pillar: strategyData.content_pillar,
            persona: strategyData.target_persona,
            tweet: optimizedData.optimized_tweet_1 || ai.cleanJson(optimized).substring(0, 200),
            postingTime: optimizedData.optimal_posting_time || '',
        });

        console.log('\n✅ ═══ CONTENT GENERATION COMPLETE ═══\n');
        return { success: true, strategy: strategyData, optimized: optimizedData };
    } catch (error) {
        console.error('❌ Content generation failed:', error.message);
        try {
            await telegram.sendMessage(`❌ خطأ في توليد المحتوى: ${error.message}`);
        } catch { }
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════
// PIPELINE 2: Publish Approved Content
// Runs every hour
// ═══════════════════════════════════════════
async function publishApproved() {
    console.log('\n📤 ═══ PUBLISHING PIPELINE ═══');
    console.log(`⏰ ${new Date().toISOString()}\n`);

    try {
        // Step 1: Read approved content
        const approved = await sheets.readApproved();

        if (approved.length === 0) {
            console.log('📭 No approved content to publish');
            return { success: true, published: 0 };
        }

        let published = 0;

        for (const item of approved) {
            try {
                // Parse optimized tweet
                let tweets = [];
                try {
                    const parsed = JSON.parse(ai.cleanJson(item.optimizedTweet));
                    tweets.push(parsed.optimized_tweet_1);
                    if (parsed.optimized_tweet_2) tweets.push(parsed.optimized_tweet_2);
                    if (parsed.optimized_tweet_3) tweets.push(parsed.optimized_tweet_3);
                } catch {
                    // Plain text tweet
                    tweets.push(item.optimizedTweet);
                }

                // Post to X
                if (tweets.length > 1) {
                    await twitter.postThread(tweets);
                } else {
                    await twitter.postTweet(tweets[0]);
                }

                // Update status
                await sheets.updateStatus(item.rowIndex, 'Published');
                published++;

                // Notify
                await telegram.sendMessage(`✅ تم نشر تغريدة: ${tweets[0].substring(0, 80)}...`);

                // Delay between posts
                await new Promise((r) => setTimeout(r, 5000));
            } catch (postError) {
                console.error(`❌ Failed to publish row ${item.rowIndex}:`, postError.message);
                await sheets.updateStatus(item.rowIndex, `Error: ${postError.message.substring(0, 50)}`);
            }
        }

        console.log(`\n✅ ═══ PUBLISHED ${published}/${approved.length} TWEETS ═══\n`);
        return { success: true, published };
    } catch (error) {
        console.error('❌ Publishing pipeline failed:', error.message);
        try {
            await telegram.sendMessage(`❌ خطأ في النشر: ${error.message}`);
        } catch { }
        return { success: false, error: error.message };
    }
}

module.exports = { generateContent, publishApproved };
