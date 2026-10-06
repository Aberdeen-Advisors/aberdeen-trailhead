"use client";

// "Print / Save as PDF" for the printable plan; hidden on paper.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="hv-btn whitespace-nowrap bg-navy px-4 py-2 text-[0.8rem] font-semibold text-white transition hover:bg-teal print:hidden"
    >
      Print / Save as PDF
    </button>
  );
}
