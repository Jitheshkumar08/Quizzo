const pdfParse = require('pdf-parse');
const fs = require('fs');
async function test() {
  const buffer = fs.readFileSync('test/data/05-versions-space.pdf');
  const result = await pdfParse(buffer);
  console.log("SUCCESS, extracted length:", result.text.length);
}
test();
