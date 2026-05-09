// Polyfill DOMMatrix for pdf-parse in Node 24+ environments
const globalWithDomMatrix = globalThis as typeof globalThis & {
  DOMMatrix?: typeof DOMMatrix;
};

if (typeof globalWithDomMatrix.DOMMatrix === "undefined") {
  globalWithDomMatrix.DOMMatrix = class DOMMatrix {} as typeof DOMMatrix;
}

export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text as string;
}

