import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLibrary } from "@ui/hooks/useLibrary";
import { useCourses } from "@ui/hooks/useCourses";
import { useTags } from "@ui/hooks/useTags";
import { useArchiveCard, useDeleteCard, useUnarchiveCard } from "@ui/hooks/useCardActions";
import { EmptyState } from "@ui/components/EmptyState";
import { courseDotStyle } from "@ui/theme/courseColors";
import type { LibraryFilter, LibrarySortField } from "@domain/ports/CardRepository";
import type { DueStatus } from "@domain/value-objects/DueStatus";
import type { CourseId, TagId } from "@domain/value-objects/Ids";

type StatusFilterValue = "ACTIVE" | DueStatus;

const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: "ACTIVE", label: "Toutes les fiches actives" },
  { value: "OVERDUE", label: "En retard" },
  { value: "DUE_TODAY", label: "À réviser aujourd'hui" },
  { value: "SCHEDULED", label: "Programmées" },
  { value: "ARCHIVED", label: "Archivées" },
];

const DUE_STATUS_LABELS: Record<DueStatus, string> = {
  OVERDUE: "En retard",
  DUE_TODAY: "Aujourd'hui",
  SCHEDULED: "Programmée",
  ARCHIVED: "Archivée",
};

const SORT_OPTIONS: { field: LibrarySortField; label: string }[] = [
  { field: "nextReviewDate", label: "Prochaine révision" },
  { field: "title", label: "Titre" },
  { field: "currentLevel", label: "Niveau" },
];

const PAGE_SIZE_STEP = 50;
const inputClass = "rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent";
const ROW_HEIGHT = 52;

function statusToFilter(status: StatusFilterValue): Pick<LibraryFilter, "includeArchived" | "dueStatus"> {
  if (status === "ACTIVE") return {};
  if (status === "ARCHIVED") return { includeArchived: true, dueStatus: "ARCHIVED" };
  return { dueStatus: status };
}

/** Bibliothèque — filtres/recherche/tri (Phase 4), liste virtualisée pour tenir sur plusieurs centaines de fiches. */
export function LibraryPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [courseId, setCourseId] = useState<CourseId | "">("");
  const [selectedTagIds, setSelectedTagIds] = useState<TagId[]>([]);
  const [status, setStatus] = useState<StatusFilterValue>("ACTIVE");
  const [sortField, setSortField] = useState<LibrarySortField>("nextReviewDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(PAGE_SIZE_STEP);

  // Petit debounce manuel : évite une requête (aller-retour IPC) à chaque frappe.
  useEffect(() => {
    const timeout = setTimeout(() => setSearchText(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Toute modification de filtre/tri repart de la première page.
  useEffect(() => {
    setPageSize(PAGE_SIZE_STEP);
  }, [searchText, courseId, selectedTagIds, status, sortField, sortDirection]);

  const filter: LibraryFilter = useMemo(
    () => ({
      searchText: searchText || undefined,
      courseId: courseId || undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      ...statusToFilter(status),
    }),
    [searchText, courseId, selectedTagIds, status],
  );

  const { data, isLoading } = useLibrary(filter, { page: 1, pageSize }, { field: sortField, direction: sortDirection });
  const coursesQuery = useCourses();
  const tagsQuery = useTags();
  const archiveCard = useArchiveCard();
  const unarchiveCard = useUnarchiveCard();
  const deleteCard = useDeleteCard();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = items.length < total;
  const courseById = useMemo(() => new Map((coursesQuery.data ?? []).map((c) => [c.id, c])), [coursesQuery.data]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  function toggleTag(id: TagId) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSort(field: LibrarySortField) {
    if (field === sortField) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bibliothèque</h1>
        <Link to="/card/new" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-raised">
          Nouvelle fiche
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          className={inputClass}
          style={{ minWidth: 280 }}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Rechercher (titre, commentaire)…"
        />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as StatusFilterValue)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {coursesQuery.data && coursesQuery.data.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCourseId("")}
            className={`rounded-full border px-3 py-1 text-xs ${
              courseId === "" ? "border-accent bg-accent/10 text-accent" : "border-border text-ink-muted hover:bg-surface-raised"
            }`}
          >
            Tous les cours
          </button>
          {coursesQuery.data.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => setCourseId(courseId === course.id ? "" : course.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                courseId === course.id ? "border-accent bg-accent/10 text-accent" : "border-border text-ink-muted hover:bg-surface-raised"
              }`}
            >
              {course.color && <span className="inline-block h-2 w-2 rounded-full" style={courseDotStyle(course.color)} />}
              {course.name}
            </button>
          ))}
        </div>
      )}

      {tagsQuery.data && tagsQuery.data.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {tagsQuery.data.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`rounded-full border px-3 py-1 text-xs ${
                selectedTagIds.includes(tag.id) ? "border-accent bg-accent/10 text-accent" : "border-border text-ink-muted hover:bg-surface-raised"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-ink-muted">
        <span>Trier par :</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.field}
            type="button"
            onClick={() => toggleSort(opt.field)}
            className={`hover:text-ink ${sortField === opt.field ? "font-medium text-ink" : ""}`}
          >
            {opt.label}
            {sortField === opt.field ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}
          </button>
        ))}
        {total > 0 && <span className="ml-auto">{total} fiche(s)</span>}
      </div>

      {isLoading && <p className="mt-8 text-sm text-ink-muted">Chargement…</p>}

      {!isLoading && items.length === 0 && (
        <div className="mt-8">
          <EmptyState title="Aucune fiche" description="Aucune fiche ne correspond à ces filtres." />
        </div>
      )}

      {items.length > 0 && (
        <div ref={parentRef} className="mt-6 max-h-[60vh] overflow-y-auto rounded-lg border border-border">
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const card = items[virtualRow.index];
              if (!card) return null;
              return (
                <div
                  key={card.id}
                  className="flex items-center justify-between border-b border-border px-4 text-sm last:border-b-0"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {card.courseId && courseById.get(card.courseId)?.color && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={courseDotStyle(courseById.get(card.courseId)?.color)}
                        title={courseById.get(card.courseId)?.name}
                      />
                    )}
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{card.title}</span>
                      <span className="text-xs text-ink-muted">Niveau {card.currentLevel}/7</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-ink-muted">{DUE_STATUS_LABELS[card.dueStatus]}</span>
                    <Link to={`/card/${card.id}/edit`} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-raised">
                      Modifier
                    </Link>
                    {card.dueStatus !== "ARCHIVED" ? (
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-raised"
                        disabled={archiveCard.isPending}
                        onClick={() => archiveCard.mutate(card.id)}
                      >
                        Archiver
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-raised"
                          disabled={unarchiveCard.isPending}
                          onClick={() => unarchiveCard.mutate(card.id)}
                        >
                          Réactiver
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-border px-2 py-1 text-xs text-danger hover:bg-danger/10"
                          disabled={deleteCard.isPending}
                          onClick={() => {
                            if (window.confirm(`Supprimer définitivement « ${card.title} » ? Cette action est irréversible.`)) {
                              deleteCard.mutate(card.id);
                            }
                          }}
                        >
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className="rounded-md border border-border px-4 py-1.5 text-sm hover:bg-surface-raised"
            onClick={() => setPageSize((prev) => prev + PAGE_SIZE_STEP)}
          >
            Charger plus ({items.length}/{total})
          </button>
        </div>
      )}
    </div>
  );
}
