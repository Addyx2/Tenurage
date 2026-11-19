/** The top of every page: a title, a line on what it's for, and actions on the right. */
export function PageTitle({ title, subtitle, description, actions }: { title: string; subtitle?: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 pt-6 md:pt-10">
      <div>
        <h1 className="headline text-3xl md:text-[44px]">{title}{subtitle ? <span className="text-slate-400"> {subtitle}</span> : null}</h1>
        {description ? <p className="mt-3 max-w-2xl text-[15px] text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
