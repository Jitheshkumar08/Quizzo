import type { MetadataRoute } from "next";

const baseUrl = "https://quizzo.tech";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
