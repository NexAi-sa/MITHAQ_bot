// OpenAI content generation pipeline
// Replicates the 3-step AI chain: Strategist → Writer → Optimizer

const OpenAI = require('openai');
let brandContext;
try { brandContext = require('./brand-context'); } catch { brandContext = require('./lib/brand-context'); }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Step 1: Content Strategist
async function generateStrategy() {
    console.log('🧠 Step 1: Content Strategist...');

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.9,
        max_tokens: 600,
        messages: [
            {
                role: 'system',
                content: `You are a Content Strategist for Mithaq, a Saudi matrimonial app. You specialize in crafting viral tweets for X (Twitter).

## CRITICAL AUDIENCE RULE:
Your target audience is EXCLUSIVELY المقبلين على الزواج (people who are SEEKING marriage, not yet married). NEVER create content for married couples or address married people.

## BRAND KNOWLEDGE:
${JSON.stringify(brandContext)}

## YOUR RULES:
1. Pick ONE content pillar from the CONTENT_PILLARS list (prioritize 'رمضان_والزواج' pillar 40% of the time)
2. Pick ONE target persona (Khaled OR Sarah) - remember they are UNMARRIED and SEEKING marriage
3. Pick ONE viral structure from VIRAL_STRUCTURES
4. Generate a unique angle that connects with a SPECIFIC pain point from DEEP_PAIN_POINTS
5. Use current time as creativity seed: ${new Date().toISOString()}
6. Consider the PEAK_TIMES data - suggest optimal posting time
7. Consider HASHTAG_STRATEGY - suggest 1-2 relevant hashtags
8. NEVER write content about married life - ONLY content about searching for the right spouse

## OUTPUT FORMAT (JSON ONLY, NO MARKDOWN):
{
  "content_pillar": "Name of the chosen pillar",
  "target_persona": "Khaled or Sarah",
  "viral_structure": "The chosen viral hook structure",
  "content_idea": "Brief description in Arabic",
  "angle": "The specific unique angle/twist",
  "key_emotion": "The primary emotion to trigger",
  "competitor_weakness_to_exploit": "Which competitor weakness this highlights",
  "suggested_posting_time": "Best time to post based on PEAK_TIMES",
  "suggested_hashtags": ["hashtag1", "hashtag2"]
}`,
            },
            {
                role: 'user',
                content:
                    'Generate a fresh, unique content idea for Mithaq optimized for X/Twitter. The tweet should make the reader stop scrolling, think deeply, and engage. Focus on themes relevant to المقبلين على الزواج (singles seeking marriage). MUST target a specific pain point that makes the reader feel "هذا يتكلم عني!"',
            },
        ],
    });

    const content = response.choices[0].message.content;
    console.log('  ✅ Strategy generated');
    return content;
}

// Step 2: Content Writer
async function writeTweet(strategy) {
    console.log('✍️ Step 2: Content Writer...');

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 1000,
        messages: [
            {
                role: 'system',
                content: `You are an expert Arabic tweet writer for Mithaq, a Saudi matrimonial app. Your target audience is المقبلين على الزواج (singles seeking marriage).

Key Rules:
- Write in White Arabic with Saudi flavor (عربية بيضاء بلمسة سعودية رزينة)
- Maximum 280 characters per tweet
- Can write a thread (2-3 tweets) if the idea is rich enough
- Use the tone: The Wise Expert (Rational, Calm, Confident)
- NEVER use: Dating, Flirting, Hookups, مواعدة, فلِرت
- ALWAYS swap: Dating→تعارف جاد, Love→انسجام/قبول, Chat→حوار/نقاش
- No direct selling language - keep it as sincere advice
- Use rhetorical questions to make followers think
- If writing a thread, format as: tweet_1, tweet_2, tweet_3

OUTPUT FORMAT (JSON ONLY):
{
  "format": "single" or "thread",
  "tweet_1": "First/single tweet text",
  "tweet_2": "Second tweet if thread (optional)",
  "tweet_3": "Third tweet if thread (optional)"
}`,
            },
            {
                role: 'user',
                content: `Write a compelling tweet or short thread for Mithaq based on this content strategy:\n\n${strategy}`,
            },
        ],
    });

    const content = response.choices[0].message.content;
    console.log('  ✅ Tweet written');
    return content;
}

// Step 3: Tweet Optimizer
async function optimizeTweet(tweet) {
    console.log('🔧 Step 3: Tweet Optimizer...');

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.5,
        max_tokens: 800,
        messages: [
            {
                role: 'system',
                content: `You are a Tweet Optimizer for Mithaq on X (Twitter). Target audience: المقبلين على الزواج (singles seeking marriage).

Your job:
1. Ensure each tweet is under 280 characters
2. Optimize hook (first line must grab attention)
3. Add appropriate hashtags (max 2)
4. Ensure CTA or engagement trigger
5. Check tone matches "Wise Expert"
6. Verify no forbidden terms (dating/flirting etc.)

OUTPUT FORMAT (JSON ONLY):
{
  "optimized_tweet_1": "Optimized first/single tweet",
  "optimized_tweet_2": "Optimized second tweet if thread (or empty)",
  "optimized_tweet_3": "Optimized third tweet if thread (or empty)",
  "optimal_posting_time": "Suggested posting time"
}`,
            },
            {
                role: 'user',
                content: `Optimize this tweet for maximum engagement on X:\n\n${tweet}`,
            },
        ],
    });

    const content = response.choices[0].message.content;
    console.log('  ✅ Tweet optimized');
    return content;
}

// Clean JSON from AI response (remove markdown code fences)
function cleanJson(str) {
    return str
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
}

module.exports = { generateStrategy, writeTweet, optimizeTweet, cleanJson };
