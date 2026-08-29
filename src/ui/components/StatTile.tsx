interface StatTileProps {
  label: string;
  value: string;
}

/** Petite tuile sobre pour afficher un chiffre clé — réutilisée par Dashboard et Statistiques. */
export function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-sm text-ink-muted">{label}</div>
    </div>
  );
}
