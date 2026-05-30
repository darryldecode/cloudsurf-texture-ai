import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-metadata";

export const alt = "Cloudsurf Texture AI texture atlas workspace preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#090a0f",
          color: "#f4f7fb",
          padding: 72,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              border: "1px solid #2f3747",
              background: "#101622",
              color: "#8bf5b2",
              fontSize: 38,
              fontWeight: 700,
            }}
          >
            C
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 34, fontWeight: 700 }}>{siteConfig.name}</div>
            <div style={{ color: "#8bf5b2", fontSize: 24 }}>AI texture atlas generation</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
            <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.02 }}>
              Production-ready texture sets from building references.
            </div>
            <div style={{ color: "#b7c0d2", fontSize: 28, lineHeight: 1.35 }}>
              Generate atlases, PBR maps, and emissive night textures for scenery, games, and visualization.
            </div>
          </div>

          <div
            style={{
              width: 330,
              height: 330,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              borderRadius: 18,
              border: "1px solid #2f3747",
              background: "#101622",
              padding: 22,
            }}
          >
            <div style={{ display: "flex", gap: 16 }}>
              <TextureSwatch colors={["#575c58", "#c7c5b9", "#747970"]} />
              <TextureSwatch colors={["#253450", "#7188b8", "#9b73bd"]} />
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <TextureSwatch colors={["#151515", "#7d7d7d", "#d7d7d7"]} />
              <TextureSwatch colors={["#05070c", "#f6cf70", "#05070c"]} />
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

function TextureSwatch({ colors }: { colors: string[] }) {
  return (
    <div
      style={{
        width: 135,
        height: 135,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: `linear-gradient(135deg, ${colors.join(", ")})`,
      }}
    />
  );
}
