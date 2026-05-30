import type { Metadata } from "next";

export const siteConfig = {
  name: "Cloudsurf Texture AI",
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://cloudsurf-texture-ai.0xdd.cloud"),
  description:
    "AI texture atlas generation workspace for flight-sim scenery, game environment, and architectural visualization teams.",
  contactEmail: "contact@cloudsurf-texture-ai.0xdd.cloud",
};

export const defaultKeywords = [
  "AI texture generator",
  "texture atlas generator",
  "PBR texture maps",
  "emissive texture maps",
  "flight simulator scenery textures",
  "architectural visualization textures",
  "game environment textures",
];

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function publicPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      siteName: siteConfig.name,
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} texture atlas workspace preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

function normalizeSiteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return "https://cloudsurf-texture-ai.0xdd.cloud";
  }
}
