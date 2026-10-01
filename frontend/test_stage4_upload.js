import fs from 'fs';
import path from 'path';

async function testUploadFromFrontend() {
  console.log("=== STAGE 4 VERIFICATION: REACT FRONTEND UPLOAD FETCH ===");

  // Create temporary test file
  const testFilePath = './test_sample_stage4.txt';
  const testContent = "PharmaCorp 2023 Clinical Summary Page 1: Overview\nTrial results show Compound B2 achieved 88% overall efficacy in Phase 3 trials.";
  fs.writeFileSync(testFilePath, testContent, 'utf-8');

  try {
    const fileBuffer = fs.readFileSync(testFilePath);
    const blob = new Blob([fileBuffer], { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', blob, 'test_sample_stage4.txt');

    console.log("Sending fetch() request to http://127.0.0.1:8000/api/upload ...");
    const response = await fetch('http://127.0.0.1:8000/api/upload', {
      method: 'POST',
      body: formData,
    });

    console.log("HTTP Response Status:", response.status);
    const json = await response.json();
    console.log("JSON Payload Received by Frontend Component:");
    console.log(JSON.stringify(json, null, 2));

    if (json.status === "success" && json.doc_id && json.chunk_count > 0) {
      console.log("SUCCESS: Stage 4 Frontend upload contract verified!");
    } else {
      console.error("FAILED: Unexpected payload format.");
    }
  } catch (err) {
    console.error("Error during upload test:", err);
  } finally {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

testUploadFromFrontend();
