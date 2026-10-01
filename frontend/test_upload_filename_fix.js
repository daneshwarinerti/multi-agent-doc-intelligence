import fs from 'fs';

async function testFilenameFixAndCollision() {
  console.log("=== BACKEND FILENAME FIX & COLLISION HANDLING VERIFICATION ===");

  const testFilePath = './Annual_Financial_Report_2024.txt';
  const testContent = "PharmaCorp 2024 Financial Report Page 1: Overview\nRevenue grew 24% year-over-year to $4.2B.";
  fs.writeFileSync(testFilePath, testContent, 'utf-8');

  try {
    // Test 1: Upload original file
    const fileBuffer = fs.readFileSync(testFilePath);
    const blob1 = new Blob([fileBuffer], { type: 'text/plain' });
    const formData1 = new FormData();
    formData1.append('file', blob1, 'Annual_Financial_Report_2024.txt');

    console.log("1. Uploading 'Annual_Financial_Report_2024.txt'...");
    const res1 = await fetch('http://127.0.0.1:8000/api/upload', {
      method: 'POST',
      body: formData1,
    });
    const json1 = await res1.json();
    console.log("Response 1 JSON:");
    console.log(JSON.stringify(json1, null, 2));

    console.log("\n" + "=".repeat(60) + "\n");

    // Test 2: Upload duplicate file with same original filename to test collision handling
    const blob2 = new Blob([fileBuffer], { type: 'text/plain' });
    const formData2 = new FormData();
    formData2.append('file', blob2, 'Annual_Financial_Report_2024.txt');

    console.log("2. Uploading duplicate file with same original name 'Annual_Financial_Report_2024.txt'...");
    const res2 = await fetch('http://127.0.0.1:8000/api/upload', {
      method: 'POST',
      body: formData2,
    });
    const json2 = await res2.json();
    console.log("Response 2 (Collision Handled) JSON:");
    console.log(JSON.stringify(json2, null, 2));

    console.log("\n" + "=".repeat(60) + "\n");

    // Test 3: List documents endpoint
    console.log("3. Fetching GET http://127.0.0.1:8000/api/documents ...");
    const listRes = await fetch('http://127.0.0.1:8000/api/documents');
    const listJson = await listRes.json();
    console.log("GET /api/documents Output:");
    console.log(JSON.stringify(listJson, null, 2));

    if (json1.file_name === "Annual_Financial_Report_2024.txt" && json2.file_name === "Annual_Financial_Report_2024 (1).txt") {
      console.log("\nSUCCESS: Original filename capturing and collision handling verified!");
    }
  } catch (err) {
    console.error("Error during test:", err);
  } finally {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

testFilenameFixAndCollision();
