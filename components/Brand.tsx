/** Tenurage's mark: a roof over a T. A placeholder until there's a brand. */
export function TenurageMark({ className = "h-[22px] w-[22px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M12 4v16" />
      <path d="M8 20h8" />
    </svg>
  );
}

export function TenurageWordmark() {
  return (
    <span className="flex items-center gap-2 text-slate-900">
      <TenurageMark />
      <span className="text-[19px] font-semibold tracking-[-0.02em]">Tenurage</span>
    </span>
  );
}
