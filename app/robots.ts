import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/dashboard", "/instructor/", "/student/", "/settings"],
    },
    sitemap: "https://quizzo.tech/sitemap.xml",
    host: "https://quizzo.tech",
  };
}
