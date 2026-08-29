import type { DailyActivity } from "@domain/ports/StatisticsRepository";

const BAR_WIDTH = 16;
const GAP = 2;
const CHART_HEIGHT = 120;

/**
 * Histogramme empilé succès/échec sur les N derniers jours — deux séries, donc légende
 * toujours présente (voir skill dataviz). Succès/échec sont des couleurs de STATUT
 * (état, sens réservé), pas des catégories : on réutilise --success/--danger déjà
 * définis dans le thème plutôt qu'une palette catégorielle générique.
 */
export function DailyActivityChart({ activity }: { activity: DailyActivity[] }) {
  const max = Math.max(1, ...activity.map((a) => a.successCount + a.failureCount));
  const width = activity.length * (BAR_WIDTH + GAP);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Activité de révision (14 derniers jours)</p>
        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-success" /> Réussi
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-danger" /> Échoué
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${CHART_HEIGHT}`} width="100%" height={CHART_HEIGHT} className="mt-4 overflow-visible">
        <line x1={0} y1={CHART_HEIGHT - 20} x2={width} y2={CHART_HEIGHT - 20} className="stroke-border" strokeWidth={1} />
        {activity.map((day, index) => {
          const total = day.successCount + day.failureCount;
          const x = index * (BAR_WIDTH + GAP);
          const usableHeight = CHART_HEIGHT - 24;
          const successHeight = (day.successCount / max) * usableHeight;
          const failureHeight = (day.failureCount / max) * usableHeight;
          const baseline = CHART_HEIGHT - 20;
          const failureY = baseline - failureHeight;
          const successY = failureY - successHeight - (day.successCount > 0 && day.failureCount > 0 ? GAP : 0);

          return (
            <g key={day.date.toISODate()}>
              {total > 0 && <title>{`${day.date.toISODate()} — ${day.successCount} réussie(s), ${day.failureCount} échouée(s)`}</title>}
              {day.failureCount > 0 && (
                <rect x={x} y={failureY} width={BAR_WIDTH} height={failureHeight} rx={2} className="fill-danger" />
              )}
              {day.successCount > 0 && (
                <rect x={x} y={successY} width={BAR_WIDTH} height={successHeight} rx={2} className="fill-success" />
              )}
              <text x={x + BAR_WIDTH / 2} y={CHART_HEIGHT - 6} textAnchor="middle" className="fill-ink-muted text-[9px]">
                {day.date.toISODate().slice(8, 10)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
