import { put } from "@vercel/blob";

export async function uploadJsonToBlob(
  quizTitle: string,
  data: object
): Promise<string | null> {
  // Blob storage is optional; quiz generation should still work without JSON archival.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("BLOB_READ_WRITE_TOKEN is missing. Skipping JSON upload.");
    return null;
  }

  const filename = `quizzes/${Date.now()}-${quizTitle
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")}.json`;

  try {
    const blob = await put(filename, JSON.stringify(data, null, 2), {
      access: "public",
      contentType: "application/json",
    });
    return blob.url;
  } catch (error) {
    console.error("Vercel Blob upload failed:", error);
    return null;
  }
}
