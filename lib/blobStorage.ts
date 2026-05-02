import { put } from "@vercel/blob";

export async function uploadJsonToBlob(
  quizTitle: string,
  data: object
): Promise<string | null> {
  // Make Blob storage optional for local development
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    if (process.env.NODE_ENV === "development") {
      console.warn("BLOB_READ_WRITE_TOKEN is missing. Skipping JSON upload for local dev.");
      return null;
    }
    throw new Error("BLOB_READ_WRITE_TOKEN is required in production.");
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

