import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { NewCardAggregate } from "@domain/entities/NewCardAggregate";
import type { CardEditInput } from "@domain/ports/CardRepository";
import { asCardId, type CourseId, type ExerciseId, type TagId } from "@domain/value-objects/Ids";
import type { Difficulty } from "@domain/value-objects/Difficulty";
import type { ReviewLevel } from "@domain/value-objects/ReviewLevel";
import { useCourses, useCreateCourse } from "@ui/hooks/useCourses";
import { useTags, useCreateTag } from "@ui/hooks/useTags";
import { useExercises, useCreateExercise } from "@ui/hooks/useExercises";
import { useCreateCard, useUpdateCard } from "@ui/hooks/useCreateCard";
import { useCard } from "@ui/hooks/useCard";
import { COURSE_COLOR_OPTIONS, courseDotStyle } from "@ui/theme/courseColors";

interface QuestionDraft {
  draftId: string;
  prompt: string;
  answerText: string;
  revisionSheetContent: string;
}

interface DefinitionDraft {
  draftId: string;
  term: string;
  expectedAnswer: string;
  linkedQuestionDraftId: string | null;
}

function emptyQuestion(): QuestionDraft {
  return { draftId: crypto.randomUUID(), prompt: "", answerText: "", revisionSheetContent: "" };
}

function emptyDefinition(): DefinitionDraft {
  return { draftId: crypto.randomUUID(), term: "", expectedAnswer: "", linkedQuestionDraftId: null };
}

const inputClass = "w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent";
const labelClass = "text-sm font-medium text-ink";
const sectionTitleClass = "text-xs font-medium uppercase tracking-wide text-ink-muted";
const REVIEW_LEVELS: ReviewLevel[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * Création ET édition de fiches — même formulaire (retour utilisateur : la Bibliothèque
 * doit permettre de modifier questions/définitions/exercices/niveau d'une fiche existante).
 * `/card/new` crée via CreateCardUseCase ; `/card/:id/edit` charge la fiche existante et
 * modifie via UpdateCardUseCase. Cours/exercices/tags se créent "à la volée" dans les deux
 * modes (voir section 3 du document d'architecture).
 */
export function CardEditorPage() {
  const navigate = useNavigate();
  const { id: rawId } = useParams<{ id?: string }>();
  const editingId = rawId ? asCardId(rawId) : undefined;

  const cardQuery = useCard(editingId);
  const initializedRef = useRef(false);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [courseId, setCourseId] = useState<CourseId | null>(null);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseColor, setNewCourseColor] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<ReviewLevel>(1);

  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [definitions, setDefinitions] = useState<DefinitionDraft[]>([]);

  const [selectedExerciseIds, setSelectedExerciseIds] = useState<ExerciseId[]>([]);
  const [newExerciseTitle, setNewExerciseTitle] = useState("");
  const [newExerciseDifficulty, setNewExerciseDifficulty] = useState<Difficulty>("MEDIUM");
  const [newExerciseReference, setNewExerciseReference] = useState("");

  const [selectedTagIds, setSelectedTagIds] = useState<TagId[]>([]);
  const [newTagName, setNewTagName] = useState("");

  const [formError, setFormError] = useState<string | null>(null);

  const coursesQuery = useCourses();
  const createCourse = useCreateCourse();
  const tagsQuery = useTags();
  const createTag = useCreateTag();
  const exercisesQuery = useExercises();
  const createExercise = useCreateExercise();
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();

  // Pré-remplit le formulaire une seule fois quand la fiche à éditer arrive — pas à
  // chaque refetch (ne pas écraser ce que l'utilisateur est en train de saisir).
  useEffect(() => {
    const card = cardQuery.data;
    if (!card || initializedRef.current) return;
    initializedRef.current = true;

    setTitle(card.title);
    setNotes(card.notes ?? "");
    setCourseId(card.courseId);
    setCurrentLevel(card.currentLevel);

    const questionDrafts = card.questions.map((q) => ({
      draftId: crypto.randomUUID(),
      prompt: q.prompt,
      answerText: q.answerText,
      revisionSheetContent: q.revisionSheet?.content ?? "",
    }));
    setQuestions(questionDrafts.length > 0 ? questionDrafts : [emptyQuestion()]);

    setDefinitions(
      card.definitions.map((d) => {
        const questionIndex = card.questions.findIndex((q) => q.id === d.linkedQuestionId);
        return {
          draftId: crypto.randomUUID(),
          term: d.term,
          expectedAnswer: d.expectedAnswer,
          linkedQuestionDraftId: questionIndex >= 0 ? (questionDrafts[questionIndex]?.draftId ?? null) : null,
        };
      }),
    );

    setSelectedExerciseIds(card.exerciseRefs.map((r) => r.exerciseId));
    setSelectedTagIds(card.tagIds);
  }, [cardQuery.data]);

  const canSubmit = title.trim().length > 0 && questions.every((q) => q.prompt.trim() && q.answerText.trim());

  function updateQuestion(draftId: string, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q) => (q.draftId === draftId ? { ...q, ...patch } : q)));
  }

  function removeQuestion(draftId: string) {
    setQuestions((prev) => prev.filter((q) => q.draftId !== draftId));
    setDefinitions((prev) => prev.map((d) => (d.linkedQuestionDraftId === draftId ? { ...d, linkedQuestionDraftId: null } : d)));
  }

  function updateDefinition(draftId: string, patch: Partial<DefinitionDraft>) {
    setDefinitions((prev) => prev.map((d) => (d.draftId === draftId ? { ...d, ...patch } : d)));
  }

  function removeDefinition(draftId: string) {
    setDefinitions((prev) => prev.filter((d) => d.draftId !== draftId));
  }

  async function handleCreateCourse() {
    const name = newCourseName.trim();
    if (!name) return;
    const id = await createCourse.mutateAsync({ name, color: newCourseColor });
    setCourseId(id);
    setNewCourseName("");
    setNewCourseColor(null);
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    const id = await createTag.mutateAsync(name);
    setSelectedTagIds((prev) => [...prev, id]);
    setNewTagName("");
  }

  async function handleCreateExercise() {
    const exerciseTitle = newExerciseTitle.trim();
    if (!exerciseTitle) return;
    const id = await createExercise.mutateAsync({
      title: exerciseTitle,
      description: null,
      reference: newExerciseReference.trim() ? newExerciseReference.trim() : null,
      difficulty: newExerciseDifficulty,
      courseId,
    });
    setSelectedExerciseIds((prev) => [...prev, id]);
    setNewExerciseTitle("");
    setNewExerciseReference("");
  }

  function toggleExercise(id: ExerciseId) {
    setSelectedExerciseIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleTag(id: TagId) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const baseInput: NewCardAggregate = {
      title: title.trim(),
      courseId,
      notes: notes.trim() ? notes.trim() : null,
      questions: questions.map((q) => ({
        prompt: q.prompt.trim(),
        answerText: q.answerText.trim(),
        revisionSheetContent: q.revisionSheetContent.trim() ? q.revisionSheetContent.trim() : null,
      })),
      definitions: definitions.map((d) => {
        const linkedIndex = d.linkedQuestionDraftId ? questions.findIndex((q) => q.draftId === d.linkedQuestionDraftId) : -1;
        return {
          term: d.term.trim(),
          expectedAnswer: d.expectedAnswer.trim(),
          linkedQuestionIndex: linkedIndex >= 0 ? linkedIndex : null,
        };
      }),
      exerciseIds: selectedExerciseIds,
      tagIds: selectedTagIds,
    };

    try {
      if (editingId) {
        const input: CardEditInput = { ...baseInput, currentLevel };
        await updateCard.mutateAsync({ id: editingId, input });
      } else {
        await createCard.mutateAsync(baseInput);
      }
      navigate("/library");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
    }
  }

  if (editingId && cardQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold">Modifier la fiche</h1>
        <p className="mt-8 text-sm text-ink-muted">Chargement…</p>
      </div>
    );
  }

  if (editingId && !cardQuery.isLoading && !cardQuery.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold">Modifier la fiche</h1>
        <p className="mt-8 text-sm text-danger">Cette fiche est introuvable.</p>
      </div>
    );
  }

  const isSaving = editingId ? updateCard.isPending : createCard.isPending;

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="text-xl font-semibold">{editingId ? "Modifier la fiche" : "Nouvelle fiche"}</h1>

      <form className="mt-8 flex flex-col gap-10" onSubmit={handleSubmit}>
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="card-title">
              Titre
            </label>
            <input id="card-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de la fiche" />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Cours</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCourseId(null)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  courseId === null ? "border-accent bg-accent/10 text-accent" : "border-border text-ink-muted hover:bg-surface-raised"
                }`}
              >
                Aucun cours
              </button>
              {coursesQuery.data?.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setCourseId(course.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                    courseId === course.id ? "border-accent bg-accent/10 text-accent" : "border-border text-ink-muted hover:bg-surface-raised"
                  }`}
                >
                  {course.color && <span className="inline-block h-2 w-2 rounded-full" style={courseDotStyle(course.color)} />}
                  {course.name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={inputClass}
                style={{ maxWidth: 220 }}
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="Nouveau cours…"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setNewCourseColor(null)}
                  aria-label="Sans couleur"
                  className={`h-6 w-6 rounded-full border-2 ${newCourseColor === null ? "border-accent" : "border-border"}`}
                />
                {COURSE_COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewCourseColor(opt.value)}
                    aria-label={opt.label}
                    title={opt.label}
                    className={`h-6 w-6 rounded-full border-2 ${opt.swatchClass} ${newCourseColor === opt.value ? "border-ink" : "border-transparent"}`}
                  />
                ))}
              </div>
              <button
                type="button"
                className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-raised disabled:opacity-40"
                disabled={!newCourseName.trim() || createCourse.isPending}
                onClick={handleCreateCourse}
              >
                Créer
              </button>
            </div>
          </div>

          {editingId && (
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="card-level">
                Niveau
              </label>
              <select
                id="card-level"
                className={inputClass}
                style={{ maxWidth: 160 }}
                value={currentLevel}
                onChange={(e) => setCurrentLevel(Number(e.target.value) as ReviewLevel)}
              >
                {REVIEW_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    Niveau {level}/7
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink-muted">
                Correction manuelle du palier de répétition espacée — ne change pas la date de prochaine révision.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="card-notes">
              Commentaire
            </label>
            <textarea
              id="card-notes"
              className={inputClass}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note libre (optionnel)"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className={sectionTitleClass}>Questions</span>
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-raised"
              onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
            >
              + Ajouter une question
            </button>
          </div>

          {questions.map((q, index) => (
            <div key={q.draftId} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-muted">Question {index + 1}</span>
                {questions.length > 1 && (
                  <button type="button" className="text-xs text-danger hover:underline" onClick={() => removeQuestion(q.draftId)}>
                    Supprimer
                  </button>
                )}
              </div>
              <input
                className={inputClass}
                value={q.prompt}
                onChange={(e) => updateQuestion(q.draftId, { prompt: e.target.value })}
                placeholder="Intitulé de la question"
              />
              <input
                className={inputClass}
                value={q.answerText}
                onChange={(e) => updateQuestion(q.draftId, { answerText: e.target.value })}
                placeholder="Réponse attendue"
              />
              <textarea
                className={inputClass}
                rows={2}
                value={q.revisionSheetContent}
                onChange={(e) => updateQuestion(q.draftId, { revisionSheetContent: e.target.value })}
                placeholder="Fiche de révision affichée en cas d'échec (optionnel)"
              />
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className={sectionTitleClass}>Définitions</span>
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-raised"
              onClick={() => setDefinitions((prev) => [...prev, emptyDefinition()])}
            >
              + Ajouter une définition
            </button>
          </div>

          {definitions.map((d, index) => (
            <div key={d.draftId} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-muted">Définition {index + 1}</span>
                <button type="button" className="text-xs text-danger hover:underline" onClick={() => removeDefinition(d.draftId)}>
                  Supprimer
                </button>
              </div>
              <input
                className={inputClass}
                value={d.term}
                onChange={(e) => updateDefinition(d.draftId, { term: e.target.value })}
                placeholder="Terme"
              />
              <input
                className={inputClass}
                value={d.expectedAnswer}
                onChange={(e) => updateDefinition(d.draftId, { expectedAnswer: e.target.value })}
                placeholder="Définition attendue"
              />
              <select
                className={inputClass}
                value={d.linkedQuestionDraftId ?? ""}
                onChange={(e) => updateDefinition(d.draftId, { linkedQuestionDraftId: e.target.value || null })}
              >
                <option value="">Non rattachée à une question</option>
                {questions.map((q, qIndex) => (
                  <option key={q.draftId} value={q.draftId}>
                    Rattacher à la question {qIndex + 1}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <span className={sectionTitleClass}>Exercices</span>
          <div className="flex flex-wrap gap-2">
            {exercisesQuery.data?.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => toggleExercise(exercise.id)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selectedExerciseIds.includes(exercise.id) ? "border-accent bg-accent/10 text-accent" : "border-border text-ink-muted hover:bg-surface-raised"
                }`}
              >
                {exercise.title}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className={inputClass}
              style={{ maxWidth: 220 }}
              value={newExerciseTitle}
              onChange={(e) => setNewExerciseTitle(e.target.value)}
              placeholder="Nouvel exercice…"
            />
            <select className={inputClass} style={{ maxWidth: 140 }} value={newExerciseDifficulty} onChange={(e) => setNewExerciseDifficulty(e.target.value as Difficulty)}>
              <option value="EASY">Facile</option>
              <option value="MEDIUM">Moyen</option>
              <option value="HARD">Difficile</option>
            </select>
            <input
              className={inputClass}
              style={{ maxWidth: 220 }}
              value={newExerciseReference}
              onChange={(e) => setNewExerciseReference(e.target.value)}
              placeholder="Référence (optionnel)"
            />
            <button
              type="button"
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-raised disabled:opacity-40"
              disabled={!newExerciseTitle.trim() || createExercise.isPending}
              onClick={handleCreateExercise}
            >
              Créer
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <span className={sectionTitleClass}>Tags</span>
          <div className="flex flex-wrap gap-2">
            {tagsQuery.data?.map((tag) => (
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
          <div className="flex gap-2">
            <input className={inputClass} value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Nouveau tag…" />
            <button
              type="button"
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface-raised disabled:opacity-40"
              disabled={!newTagName.trim() || createTag.isPending}
              onClick={handleCreateTag}
            >
              Créer
            </button>
          </div>
        </section>

        {formError && <p className="text-sm text-danger">{formError}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface-raised" onClick={() => navigate("/library")}>
            Annuler
          </button>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            disabled={!canSubmit || isSaving}
          >
            {isSaving ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer la fiche"}
          </button>
        </div>
      </form>
    </div>
  );
}
