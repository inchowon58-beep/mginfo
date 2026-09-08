import type { SiteIconSpec } from "./site-icon";

export function SiteIconMark({ spec, size }: { spec: SiteIconSpec; size: number }) {
  const fontSize = Math.round(size * (spec.letters.length > 1 ? 0.42 : 0.5));
  const inset = Math.max(3, Math.round(size * 0.12));
  const radius = Math.round((spec.radius / 32) * size);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: spec.mark === "split" ? spec.accent : spec.bg,
        borderRadius: spec.mark === "circle" ? size : radius,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {spec.mark === "split" ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "58%",
            height: "100%",
            background: spec.bg,
          }}
        />
      ) : null}
      {spec.mark === "bar" ? (
        <div
          style={{
            position: "absolute",
            left: inset,
            top: inset,
            bottom: inset,
            width: Math.max(3, Math.round(size * 0.1)),
            background: spec.accent,
            borderRadius: 99,
          }}
        />
      ) : null}
      {spec.mark === "dot" ? (
        <div
          style={{
            position: "absolute",
            right: inset,
            top: inset,
            width: Math.max(5, Math.round(size * 0.18)),
            height: Math.max(5, Math.round(size * 0.18)),
            background: spec.accent,
            borderRadius: 99,
          }}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          color: spec.fg,
          fontSize,
          fontWeight: 700,
          letterSpacing: spec.letters.length > 1 ? -1 : 0,
          lineHeight: 1,
        }}
      >
        {spec.letters}
      </div>
    </div>
  );
}
