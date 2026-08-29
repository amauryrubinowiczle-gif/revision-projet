interface EmptyStateProps {
  title: string;
  description?: string;
}

/** Reprend le motif de l'icône de l'app (anneaux concentriques, voir design/icone-revision.html) en discret. */
function OrbitMotif() {
  return (
    <svg width="48" height="48" viewBox="0 0 200 200" fill="none" aria-hidden="true" className="mb-3">
      <circle cx="100" cy="100" r="30" className="stroke-border" strokeWidth="7" />
      <circle cx="100" cy="100" r="55" className="stroke-border" strokeWidth="7" opacity="0.6" />
      <circle cx="100" cy="100" r="80" className="stroke-border" strokeWidth="7" opacity="0.3" />
      <circle cx="100" cy="100" r="11" className="fill-accent" opacity="0.7" />
    </svg>
  );
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
      <OrbitMotif />
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
    </div>
  );
}
