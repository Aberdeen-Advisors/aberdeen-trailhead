"use client";

import { useEffect, useState } from "react";
import { STACK_LABELS, type StackKey } from "@/lib/stacks";

// One tech-stack logo. Tries /stack-logos/<key>.png, then .svg; shows a small
// text label until (or unless) an image actually loads, so no broken images.
function StackLogo({ stackKey, detail }: { stackKey: StackKey; detail?: string }) {
  const label = STACK_LABELS[stackKey];
  const tip = detail ? `${label} — ${detail}` : label;
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tryLoad = (exts: string[]) => {
      if (!exts.length) return;
      const url = `/stack-logos/${stackKey}.${exts[0]}`;
      const img = new Image();
      img.onload = () => !cancelled && setSrc(url);
      img.onerror = () => !cancelled && tryLoad(exts.slice(1));
      img.src = url;
    };
    tryLoad(["png", "svg"]);
    return () => {
      cancelled = true;
    };
  }, [stackKey]);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={label} title={tip} className="h-5 w-auto max-w-[96px] object-contain" />
    );
  }
  return (
    <span title={tip} className="rounded-full border border-hv-border px-2 py-0.5 text-[0.65rem] font-medium text-navy">
      {label}
    </span>
  );
}

export function StackLogos({ stack, details = {} }: { stack: StackKey[]; details?: Partial<Record<StackKey, string>> }) {
  if (!stack.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[0.62rem] font-semibold uppercase tracking-wider text-hv-muted">Runs on</span>
      {stack.map((k) => (
        <StackLogo key={k} stackKey={k} detail={details[k]} />
      ))}
    </div>
  );
}
