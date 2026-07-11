"use client";

import { useEffect, useState } from "react";

// Project logo with graceful fallback.
// Looks for /project-logos/<projectId>.png in the public folder.
// Renders a colored monogram immediately; swaps to the image only if it
// actually loads (probed via the Image object, so no broken-image flash).

const palette = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-teal-600",
];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return palette[h % palette.length];
}

function initials(name: string): string {
  const words = name.replace(/^Project\s+/i, "").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

export function ProjectLogo({
  projectId,
  name,
  size = 40,
}: {
  projectId: string;
  name: string;
  size?: number;
}) {
  const src = `/project-logos/${projectId}.png`;
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);

  if (loaded) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name} logo`}
        width={size}
        height={size}
        className="shrink-0 rounded-lg object-contain"
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg font-semibold text-white ${colorFor(name)}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
