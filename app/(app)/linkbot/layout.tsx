import { LinkbotTabs } from "./LinkbotTabs";

export default function LinkbotLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Linkbot</h1>
          <p className="mt-1 text-sm text-slate-500">Texts matched applicants, books viewings, reminds them, asks how it went, and takes jobs from your office by text.</p>
        </div>
        <LinkbotTabs />
      </div>
      {children}
    </>
  );
}
