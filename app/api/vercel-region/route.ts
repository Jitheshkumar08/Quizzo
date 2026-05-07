export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EXPECTED_REGION = "bom1";

export function GET() {
  const actualRegion = process.env.VERCEL_REGION ?? "local";

  return Response.json(
    {
      expectedRegion: EXPECTED_REGION,
      actualRegion,
      matchesExpectedRegion: actualRegion === EXPECTED_REGION,
      isVercel: process.env.VERCEL === "1",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
