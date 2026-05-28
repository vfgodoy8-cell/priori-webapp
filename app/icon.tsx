import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "flex-start",
          width: "100%",
          height: "100%",
          padding: "7px 5px",
          background: "white",
          gap: 0,
        }}
      >
        <div style={{ height: 6, width: 22, borderRadius: 3, background: "#E8621A", marginBottom: 3 }} />
        <div style={{ height: 6, width: 14, borderRadius: 3, background: "rgba(232,98,26,0.65)", marginBottom: 3 }} />
        <div style={{ height: 6, width: 8,  borderRadius: 3, background: "rgba(232,98,26,0.30)" }} />
      </div>
    ),
    { ...size }
  );
}
