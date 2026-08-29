import type { ReviewLevel } from "@domain/value-objects/ReviewLevel";

const BAR_WIDTH = 28;
const GAP = 8;
const CHART_HEIGHT = 120;
const LEVELS: ReviewLevel[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * Niveau = grandeur ORDINALE (le palier 7 n'est pas juste "une autre catégorie" que le
 * palier 1, c'est une position dans une progression) — un seul ton (accent), intensité
 * croissante par palier plutôt que 7 teintes catégorielles (voir skill dataviz,
 * "ordinal vs catégoriel"). On module l'opacité de --accent (déjà le seul ton d'accent
 * du thème, voir globals.css) plutôt que d'inventer une nouvelle rampe de couleurs.
 */
export function LevelDistributionChart({ distribution }: { distribution: Record<ReviewLevel, number> }) {
  const max = Math.max(1, ...LEVELS.map((l) => distribution[l]));
  const width = LEVELS.length * (BAR_WIDTH + GAP) - GAP;
  const usableHeight = CHART_HEIGHT - 24;

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm font-medium">Répartition des fiches actives par niveau</p>

      <svg viewBox={`0 0 ${width} ${CHART_HEIGHT}`} width="100%" height={CHART_HEIGHT} className="mt-4 overflow-visible">
        <line x1={0} y1={CHART_HEIGHT - 20} x2={width} y2={CHART_HEIGHT - 20} className="stroke-border" strokeWidth={1} />
        {LEVELS.map((level, index) => {
          const count = distribution[level];
          const x = index * (BAR_WIDTH + GAP);
          const barHeight = (count / max) * usableHeight;
          const y = CHART_HEIGHT - 20 - barHeight;
          // Palier 1 -> 0.3, palier 7 -> 1.0 : intensité monotone croissante.
          const opacity = 0.3 + (0.7 * (level - 1)) / (LEVELS.length - 1);

          return (
            <g key={level}>
              <title>{`Niveau ${level} : ${count} fiche(s)`}</title>
              <rect
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={Math.max(barHeight, count > 0 ? 2 : 0)}
                rx={2}
                className="stroke-border"
                strokeWidth={1}
                fill={`rgb(var(--accent) / ${opacity})`}
              />
              {count > 0 && (
                <text x={x + BAR_WIDTH / 2} y={y - 4} textAnchor="middle" className="fill-ink-muted text-[9px] tabular-nums">
                  {count}
                </text>
              )}
              <text x={x + BAR_WIDTH / 2} y={CHART_HEIGHT - 6} textAnchor="middle" className="fill-ink-muted text-[9px]">
                {level}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
