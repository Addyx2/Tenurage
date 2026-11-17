import { cn } from "@/lib/utils";

import { TourVideo } from "./TourVideo";

/** A line drawing of a house or a block of flats, for properties with no photos yet. */
function Facade({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-[6%] bottom-0 top-[14%] h-[86%] w-[88%]" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        {kind === "flat" ? (
          <>
            <path d="M50 140V20h100v120" />
            <path d="M42 20h116" opacity=".5" />
            {[34, 62, 90].flatMap((y) => [64, 92, 120].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="16" height="20" />))}
            <rect x="88" y="116" width="24" height="24" rx="12" />
          </>
        ) : (
          <>
            <path d="M20 140V58l40-30 40 30v82M100 140V58l40-30 40 30v82" />
            <path d="M8 66 60 26l52 40M88 66l52-40 52 40" opacity=".5" />
            <rect x="45" y="104" width="22" height="36" rx="11" />
            <rect x="125" y="104" width="22" height="36" rx="11" />
            <rect x="28" y="64" width="16" height="20" />
            <rect x="72" y="64" width="16" height="20" />
            <rect x="108" y="64" width="16" height="20" />
            <rect x="152" y="64" width="16" height="20" />
            <rect x="152" y="96" width="20" height="24" />
          </>
        )}
      </g>
    </svg>
  );
}

/**
 * A property's picture: its video tour (muted, looping) if it has one, else
 * its cover photo, else a drawing that says there are no photos yet.
 */
export function PropertyMedia({
  property,
  className,
  video = true,
  label,
}: {
  property: { address: string; kind: string; photos: string[]; videoUrl: string | null };
  className?: string;
  video?: boolean;
  label?: boolean;
}) {
  const cover = property.photos[0];
  return (
    <div className={cn("relative aspect-[16/10] overflow-hidden bg-gradient-to-b from-[#eef3f8] to-[#e3eaf1] text-[#9fb0c2]", className)}>
      {video && property.videoUrl ? (
        <TourVideo src={property.videoUrl} poster={cover} />
      ) : cover ? (
        // Agencies' own photo hosts: any https origin, so a plain img rather than next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={`${property.address}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <Facade kind={property.kind} />
          {label !== false ? <span className="absolute bottom-2.5 left-3 rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-slate-500">No photos yet</span> : null}
        </>
      )}
    </div>
  );
}
