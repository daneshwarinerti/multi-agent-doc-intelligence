import fs from 'fs';

async function testStage5SummaryAndInsights() {
  console.log("=== STAGE 5 VERIFICATION: SUMMARY & INSIGHTS FETCH ===");

  // Step 1: Upload a test document to obtain doc_id
  const testFilePath = './test_sample_stage5.txt';
  const testContent = "PharmaCorp 2023 Clinical Summary Page 1: Trial Overview\nTrial results show Compound B2 achieved 88% overall efficacy in Phase 3 trials with zero severe adverse events reported. FDA submission is scheduled for Q2 2024.";
  fs.writeFileSync(testFilePath, testContent, 'utf-8');

  try {
    const fileBuffer = fs.readFileSync(testFilePath);
    const blob = new Blob([fileBuffer], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'test_sample_stage5.txt');

    console.log("1. Ingesting test document to backend...");
    const uploadRes = await fetch('http://127.0.0.1:8000/api/upload', {
      method: 'POST',
      body: formData,
    });
    const uploadJson = await uploadRes.json();
    const docId = uploadJson.doc_id;
    console.log(`Uploaded! Doc ID: ${docId}\n`);

    // Step 2: Fetch Summary
    console.log(`2. Calling GET http://127.0.0.1:8000/api/summary/${docId}...`);
    const summaryRes = await fetch(`http://127.0.0.1:8000/api/summary/${docId}`);
    console.log("Summary HTTP Status:", summaryRes.status);
    const summaryJson = await summaryRes.json();
    console.log("Summary JSON Received by <SummaryTab /> Component:");
    console.log(JSON.stringify(summaryJson, null, 2));
    console.log("\n" + "=".repeat(60) + "\n");

    // Step 3: Fetch Insights
    console.log(`3. Calling GET http://127.0.0.1:8000/api/insights/${docId}...`);
    const insightsRes = await fetch(`http://127.0.0.1:8000/api/insights/${docId}`);
    console.log("Insights HTTP Status:", insightsRes.status);
    const insightsJson = await insightsRes.json();
    console.log("Insights JSON Received by <InsightsTab /> Component:");
    console.log(JSON.stringify(insightsJson, null, 2));

    if (summaryRes.ok && insightsRes.ok) {
      console.log("\nSUCCESS: Stage 5 Summary and Insights fetch contracts verified!");
    }
  } catch (err) {
    console.error("Error during Stage 5 test:", err);
  } finally {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

testStage5SummaryAndInsights();
