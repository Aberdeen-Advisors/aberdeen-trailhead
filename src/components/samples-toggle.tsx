"use client";

import { useRouter } from "next/navigation";

// Show or hide the built-in sample projects for this browser. Hiding them
// removes them from the cards, the KPIs, the AI summary, decks and Ask Horizon.
export function SamplesToggle({ hidden }: { hidden: boolean }) {
  const router = useRouter();
  const toggle = () => {
    document.cookie = `hv_hide_samples=${hidden ? "0" : "1"}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  return (
    <button type="button" onClick={toggle} className="text-[0.72rem] font-medium text-hv-muted underline-offset-2 hover:text-teal-ink hover:underline">
      {hidden ? "Show sample projects" : "Hide sample projects"}
    </button>
  );
}
