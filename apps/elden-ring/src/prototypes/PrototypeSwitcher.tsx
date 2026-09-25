// PROTOTYPE: floating variant switcher shared by throwaway prototypes. Never ships (dev only).
import { useEffect, useState } from "react";

export function useVariant<K extends string>(keys: readonly K[]) {
  const read = () => {
    const v = new URLSearchParams(location.search).get("variant");
    return (keys.includes(v as K) ? v : keys[0]) as K;
  };
  const [variant, setVariant] = useState<K>(read);
  const set = (next: K) => {
    const url = new URL(location.href);
    url.searchParams.set("variant", next);
    history.replaceState(null, "", url);
    setVariant(next);
  };
  return [variant, set] as const;
}

export function PrototypeSwitcher<K extends string>({
  variants,
  current,
  onChange,
}: {
  variants: readonly { key: K; name: string }[];
  current: K;
  onChange: (key: K) => void;
}) {
  const index = variants.findIndex((v) => v.key === current);
  const cycle = (step: number) => {
    const next = variants[(index + step + variants.length) % variants.length];
    if (next) onChange(next.key);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement)?.isContentEditable) return;
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  if (!import.meta.env.DEV) return null;
  const label = variants[index];
  const button: React.CSSProperties = {
    all: "unset",
    cursor: "pointer",
    padding: "4px 12px",
    fontSize: 18,
  };
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: "#ff2d8a",
        color: "white",
        font: "600 14px/1 system-ui, sans-serif",
        boxShadow: "0 6px 24px rgba(0,0,0,.35)",
        zIndex: 1000,
        userSelect: "none",
      }}
    >
      <button style={button} onClick={() => cycle(-1)} aria-label="Previous variant">
        ←
      </button>
      <span style={{ minWidth: 220, textAlign: "center" }}>
        {label?.key} — {label?.name}
      </span>
      <button style={button} onClick={() => cycle(1)} aria-label="Next variant">
        →
      </button>
    </div>
  );
}
