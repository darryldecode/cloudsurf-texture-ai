import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-metadata";

const publicRoutes = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/terms-and-conditions", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/privacy-policy", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/refund-policy", priority: 0.4, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
