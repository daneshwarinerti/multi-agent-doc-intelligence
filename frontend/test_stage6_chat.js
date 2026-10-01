import fs from 'fs';

async function testStage6ChatTab() {
  console.log("=== STAGE 6 VERIFICATION: REACT CHATTAB FETCH TO /api/ask ===");

  // Step 1: Upload a test document to obtain doc_id
  const testFilePath = './test_sample_stage6.txt';
  const testContent = "PharmaCorp 2023 Clinical Summary Page 1: Trial Results\nCompound B2 achieved 88% overall efficacy in Phase 3 trials with zero severe adverse events reported. FDA submission is scheduled for Q2 2024.";
  fs.writeFileSync(testFilePath, testContent, 'utf-8');

  try {
    const fileBuffer = fs.readFileSync(testFilePath);
    const blob = new Blob([fileBuffer], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'test_sample_stage6.txt');

    console.log("1. Uploading test document...");
    const uploadRes = await fetch('http://127.0.0.1:8000/api/upload', {
      method: 'POST',
      body: formData,
    });
    const uploadJson = await uploadRes.json();
    const docId = uploadJson.doc_id;
    console.log(`Uploaded! Doc ID: ${docId}\n`);

    // Step 2: Test in-document query from ChatTab component
    console.log("2. ChatTab sending in-document query: 'What was the efficacy of Compound B2?'");
    const askRes1 = await fetch('http://127.0.0.1:8000/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_id: docId,
        question: "What was the efficacy of Compound B2?",
      }),
    });

    console.log("Q&A Response Status:", askRes1.status);
    const askJson1 = await askRes1.json();
    console.log("JSON Payload Received by <ChatTab /> Message State:");
    console.log(JSON.stringify(askJson1, null, 2));

    console.log("\n" + "=".repeat(60) + "\n");

    // Step 3: Test out-of-document query from ChatTab component
    console.log("3. ChatTab sending out-of-document query: 'What is the speed of light?'");
    const askRes2 = await fetch('http://127.0.0.1:8000/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc_id: docId,
        question: "What is the speed of light?",
      }),
    });

    console.log("Q&A Response Status:", askRes2.status);
    const askJson2 = await askRes2.json();
    console.log("JSON Payload Received by <ChatTab /> Message State:");
    console.log(JSON.stringify(askJson2, null, 2));

    if (askRes1.ok && askRes2.ok) {
      console.log("\nSUCCESS: Stage 6 ChatTab & Sources panel fetch contracts verified!");
    }
  } catch (err) {
    console.error("Error during Stage 6 test:", err);
  } finally {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

testStage6ChatTab();
