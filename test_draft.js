
const { generateStrategy, writeTweet, optimizeTweet, cleanJson } = require('./lib/openai');

async function testDraft() {
    try {
        console.log("\n==================== 1. STRATEGY ====================");
        const strategyRaw = await generateStrategy();
        const strategy = cleanJson(strategyRaw);
        console.log(JSON.stringify(JSON.parse(strategy), null, 2));

        console.log("\n==================== 2. INITIAL DRAFT ====================");
        const draftRaw = await writeTweet(strategy);
        const draft = cleanJson(draftRaw);
        console.log(JSON.stringify(JSON.parse(draft), null, 2));

        console.log("\n==================== 3. OPTIMIZED TWEET ====================");
        const optimizedRaw = await optimizeTweet(draft);
        const optimized = cleanJson(optimizedRaw);
        console.log(JSON.stringify(JSON.parse(optimized), null, 2));
        
        console.log("\n✅ Test completed successfully!");
    } catch (err) {
        console.error("❌ Error running test:", err);
    }
}

testDraft();
