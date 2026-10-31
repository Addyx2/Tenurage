/** Tenurage's mark: a roofline over a key-bit, in the brand teal. */
export function TenurageMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span className={`flex items-center justify-center rounded-lg bg-brand-700 text-white ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-[60%] w-[60%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M12 9.5v10M12 14h3.5M12 17.5h2.5" />
      </svg>
    </span>
  );
}

export function TenurageWordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <TenurageMark />
      <span className="font-display text-lg font-bold tracking-tight text-slate-900">Tenurage</span>
    </span>
  );
}
