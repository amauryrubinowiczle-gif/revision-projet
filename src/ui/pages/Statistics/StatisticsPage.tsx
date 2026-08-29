import { useStatistics } from "@ui/hooks/useStatistics";
import { StatTile } from "@ui/components/StatTile";
import { DailyActivityChart } from "./DailyActivityChart";
import { LevelDistributionChart } from "./LevelDistributionChart";

/** Page Statistiques — voir brief : total fiches, temps moyen, streak, taux de réussite, terminées, en difficulté. */
export function StatisticsPage() {
  const { data, isLoading, isError } = useStatistics();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold">Statistiques</h1>

      {isLoading && <p className="mt-8 text-sm text-ink-muted">Chargement…</p>}
      {isError && <p className="mt-8 text-sm text-danger">Impossible de charger les statistiques.</p>}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="Fiches au total" value={String(data.totalCards)} />
            <StatTile label="Temps moyen quotidien" value={`${Math.round(data.averageDailyReviewSeconds / 60)} min`} />
            <StatTile label="Jours consécutifs" value={String(data.consecutiveReviewDays)} />
            <StatTile label="Taux de réussite" value={`${Math.round(data.successRate * 100)}%`} />
            <StatTile label="Fiches maîtrisées" value={String(data.masteredCardsCount)} />
            <StatTile label="Fiches en difficulté" value={String(data.strugglingCardsCount)} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <DailyActivityChart activity={data.dailyActivity} />
            <LevelDistributionChart distribution={data.levelDistribution} />
          </div>
        </>
      )}
    </div>
  );
}
