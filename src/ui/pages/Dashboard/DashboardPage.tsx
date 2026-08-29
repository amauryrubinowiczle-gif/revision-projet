import { Link } from "react-router-dom";
import { useDashboardSummary } from "@ui/hooks/useDashboardSummary";
import { StatTile } from "@ui/components/StatTile";

/**
 * Écran d'accueil — nombre de fiches prévues aujourd'hui, temps estimé, fiches en retard,
 * progression globale (voir brief). Branché sur GetDashboardSummaryUseCase via useDashboardSummary.
 */
export function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSummary();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold">Bonjour</h1>
      <p className="mt-1 text-sm text-ink-muted">Voici où vous en êtes aujourd'hui.</p>

      {isLoading && <p className="mt-8 text-sm text-ink-muted">Chargement…</p>}
      {isError && <p className="mt-8 text-sm text-danger">Impossible de charger le tableau de bord.</p>}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="À réviser aujourd'hui" value={String(data.dueTodayCount)} />
            <StatTile label="En retard" value={String(data.overdueCount)} />
            <StatTile label="Temps estimé" value={`${data.estimatedMinutes} min`} />
            <StatTile label="Progression" value={`${Math.round(data.overallProgressRatio * 100)}%`} />
          </div>

          <Link
            to="/review"
            className="mt-8 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Réviser
          </Link>
        </>
      )}
    </div>
  );
}
