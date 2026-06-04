import type { Team, RoadmapSegment } from "@/types/database";
import type { SegmentLayout, MonthHeader } from "@/lib/roadmap-logic";
import { GanttReadOnly } from "./GanttReadOnly";

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type DeviationRow = {
  id: string;
  date: string;
  reason: string;
  affected_stakeholders: string | null;
  status: "open" | "resolved";
};

type Props = {
  productName: string;
  channelName: string | null;
  startDate: string;
  estimatedEnd: Date | null;
  teams: Team[];
  segments: RoadmapSegment[];
  layoutMap: Map<string, SegmentLayout>;
  monthHeaders: MonthHeader[];
  totalSprints: number;
  productStart: Date;
  deviations: DeviationRow[];
};

export function RoadmapReadOnly({
  productName,
  channelName,
  startDate,
  estimatedEnd,
  teams,
  segments,
  layoutMap,
  monthHeaders,
  totalSprints,
  productStart,
  deviations,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      {/* Ficha del producto */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-brand-black">{productName}</h2>
            {channelName && (
              <span className="text-xs text-brand-gray">Canal: <span className="font-medium text-brand-black">{channelName}</span></span>
            )}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] text-brand-gray uppercase tracking-wide">Inicio</span>
              <span className="text-sm font-semibold text-brand-black">{fmtDateShort(startDate)}</span>
            </div>
            {estimatedEnd && (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] text-brand-gray uppercase tracking-wide">Publicación estimada</span>
                <span className="text-sm font-semibold text-brand-orange">{fmtDate(estimatedEnd)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gantt */}
      {teams.length === 0 ? (
        <p className="text-sm text-brand-gray text-center py-6">Sin equipos visibles configurados.</p>
      ) : (
        <GanttReadOnly
          teams={teams}
          segments={segments}
          layoutMap={layoutMap}
          monthHeaders={monthHeaders}
          totalSprints={totalSprints}
          productStart={productStart}
        />
      )}

      {/* Desvíos */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-brand-black">
          Desvíos
          {deviations.length > 0 && (
            <span className="ml-2 text-xs font-normal text-brand-gray">({deviations.length})</span>
          )}
        </h3>

        {deviations.length === 0 ? (
          <p className="text-xs text-brand-gray bg-white rounded-xl border border-gray-200 px-4 py-6 text-center">
            Sin desvíos registrados.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {deviations.map((d) => (
              <div
                key={d.id}
                className={`rounded-xl border p-4 flex flex-col gap-2 ${
                  d.status === "resolved"
                    ? "border-gray-100 bg-gray-50 opacity-70"
                    : "border-orange-100 bg-orange-50/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-brand-black">{fmtDateShort(d.date)}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    d.status === "open"
                      ? "bg-orange-100 text-brand-orange"
                      : "bg-green-100 text-brand-green"
                  }`}>
                    {d.status === "open" ? "Abierto" : "Resuelto"}
                  </span>
                </div>
                <p className="text-sm text-brand-black leading-snug">{d.reason}</p>
                {d.affected_stakeholders && (
                  <p className="text-xs text-brand-gray">
                    <span className="font-semibold">Stakeholders afectados:</span> {d.affected_stakeholders}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
