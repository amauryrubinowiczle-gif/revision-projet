import { and, asc, count, desc, eq, gt, inArray, lt, lte, like, or } from "drizzle-orm";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import type { Card, CardExerciseRef } from "@domain/entities/Card";
import type { NewCardAggregate } from "@domain/entities/NewCardAggregate";
import type { CardEditInput, CardRepository, CardSummary, LibraryFilter, LibrarySort, PagedResult, Pagination } from "@domain/ports/CardRepository";
import {
  asCardId,
  asCommentId,
  asCourseId,
  asDefinitionId,
  asExerciseId,
  asQuestionId,
  asRevisionSheetId,
  asTagId,
  type CardId,
} from "@domain/value-objects/Ids";
import { LocalDate } from "@domain/value-objects/LocalDate";
import { computeDueStatus } from "@domain/value-objects/DueStatus";
import { DomainValidationError } from "@domain/errors/DomainValidationError";
import * as schema from "../schema";
import { generateId } from "../ids";

/**
 * Adaptateur concret du port CardRepository (voir domain/ports/CardRepository.ts).
 * Isole toute connaissance de Drizzle/SQLite — le reste de l'application ne connaît
 * que l'interface. Voir aussi le risque technique n°1 (pont Drizzle/Tauri à valider).
 */
export class DrizzleCardRepository implements CardRepository {
  constructor(private readonly db: SqliteRemoteDatabase<typeof schema>) {}

  async findDueToday(today: LocalDate): Promise<Card[]> {
    const rows = await this.db
      .select()
      .from(schema.cards)
      .where(and(eq(schema.cards.isArchived, false), lte(schema.cards.nextReviewDate, today.toISODate())));

    const cards = await Promise.all(rows.map((row) => this.hydrateCard(row)));
    return cards;
  }

  async findById(id: CardId): Promise<Card | null> {
    const [row] = await this.db.select().from(schema.cards).where(eq(schema.cards.id, id)).limit(1);
    if (!row) return null;
    return this.hydrateCard(row);
  }

  async findSummaries(filter: LibraryFilter, page: Pagination, sort?: LibrarySort): Promise<PagedResult<CardSummary>> {
    const todayLocal = LocalDate.fromUTCDate(new Date());
    const todayISO = todayLocal.toISODate();

    const conditions = [];
    if (filter.dueStatus === "ARCHIVED") {
      conditions.push(eq(schema.cards.isArchived, true));
    } else {
      if (!filter.includeArchived) conditions.push(eq(schema.cards.isArchived, false));
      if (filter.dueStatus === "OVERDUE") conditions.push(lt(schema.cards.nextReviewDate, todayISO));
      else if (filter.dueStatus === "DUE_TODAY") conditions.push(eq(schema.cards.nextReviewDate, todayISO));
      else if (filter.dueStatus === "SCHEDULED") conditions.push(gt(schema.cards.nextReviewDate, todayISO));
    }
    if (filter.courseId) conditions.push(eq(schema.cards.courseId, filter.courseId));
    if (filter.searchText) conditions.push(or(like(schema.cards.title, `%${filter.searchText}%`), like(schema.cards.notes, `%${filter.searchText}%`)));
    if (filter.tagIds && filter.tagIds.length > 0) {
      // Correspond si la fiche porte AU MOINS UN des tags demandés.
      conditions.push(
        inArray(
          schema.cards.id,
          this.db.select({ id: schema.cardTags.cardId }).from(schema.cardTags).where(inArray(schema.cardTags.tagId, filter.tagIds)),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn =
      sort?.field === "title" ? schema.cards.title : sort?.field === "currentLevel" ? schema.cards.currentLevel : schema.cards.nextReviewDate;
    const orderBy = sort?.direction === "desc" ? desc(sortColumn) : asc(sortColumn);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(schema.cards)
        .where(where)
        .orderBy(orderBy)
        .limit(page.pageSize)
        .offset((page.page - 1) * page.pageSize),
      this.db.select({ value: count() }).from(schema.cards).where(where),
    ]);
    const total = totalRows[0]?.value ?? 0;

    // Requêtes groupées sur l'ensemble de la page plutôt qu'une requête par fiche
    // (N+1) — chaque aller-retour supplémentaire coûte un tour d'IPC Tauri (voir
    // risque technique n°8), sensible dès plusieurs centaines de fiches.
    const cardIds = rows.map((r) => r.id);
    const [tagRows, successRows] =
      cardIds.length === 0
        ? [[], []]
        : await Promise.all([
            this.db.select().from(schema.cardTags).where(inArray(schema.cardTags.cardId, cardIds)),
            this.db
              .select({ cardId: schema.cardReviewEvents.cardId, value: count() })
              .from(schema.cardReviewEvents)
              .where(and(inArray(schema.cardReviewEvents.cardId, cardIds), eq(schema.cardReviewEvents.result, "SUCCESS")))
              .groupBy(schema.cardReviewEvents.cardId),
          ]);

    const tagsByCard = new Map<string, ReturnType<typeof asTagId>[]>();
    for (const t of tagRows) {
      const list = tagsByCard.get(t.cardId) ?? [];
      list.push(asTagId(t.tagId));
      tagsByCard.set(t.cardId, list);
    }
    const successCountByCard = new Map<string, number>();
    for (const s of successRows) {
      if (s.cardId) successCountByCard.set(s.cardId, s.value);
    }

    const items: CardSummary[] = rows.map((row) => {
      const nextReviewDate = LocalDate.fromISODate(row.nextReviewDate);
      return {
        id: asCardId(row.id),
        title: row.title,
        courseId: row.courseId ? asCourseId(row.courseId) : null,
        currentLevel: row.currentLevel,
        nextReviewDate,
        dueStatus: computeDueStatus({ isArchived: row.isArchived, nextReviewDate, today: todayLocal }),
        successCount: successCountByCard.get(row.id) ?? 0,
        lastReviewDate: row.lastReviewDate ? LocalDate.fromISODate(row.lastReviewDate) : null,
        tagIds: tagsByCard.get(row.id) ?? [],
      };
    });

    return { items, total };
  }

  async save(card: Card): Promise<void> {
    await this.db
      .update(schema.cards)
      .set({
        title: card.title,
        courseId: card.courseId,
        currentLevel: card.currentLevel,
        nextReviewDate: card.nextReviewDate.toISODate(),
        lastReviewDate: card.lastReviewDate?.toISODate() ?? null,
        isArchived: card.isArchived,
        notes: card.notes,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.cards.id, card.id));
  }

  async createWithChildren(input: NewCardAggregate): Promise<CardId> {
    if (!input.title.trim()) {
      throw new DomainValidationError("Le titre de la fiche ne peut pas être vide.");
    }
    if (input.questions.length === 0) {
      throw new DomainValidationError("Une fiche doit contenir au moins une question.");
    }

    // ⚠️ PAS enveloppé dans db.transaction() : le spike de validation (voir HANDOFF.md)
    // a confirmé empiriquement que drizzle-orm/sqlite-proxy émet BEGIN/COMMIT/ROLLBACK
    // comme des appels "run" séparés à travers le pont, et que @tauri-apps/plugin-sql
    // exécute chaque appel via un pool de connexions sqlx (`pool.execute(query)`) — deux
    // appels successifs peuvent atterrir sur des connexions SQLite physiques différentes.
    // Un BEGIN sur une connexion et un INSERT sur une autre ne forment PAS une transaction
    // réelle : testé en conditions réelles, un rollback volontaire après un insert dans
    // db.transaction() n'annule PAS l'insert. db.transaction() donnerait donc une fausse
    // impression de sécurité ici. À la place : écritures séquentielles + nettoyage
    // compensatoire (delete en cascade de la fiche) si une étape échoue en cours de route.
    // Ce n'est pas une vraie atomicité (un crash process entre deux étapes laisserait
    // quand même une fiche partielle), mais couvre le cas réel visé (erreur de validation
    // ou contrainte SQL en cours d'écriture) sans dépendre d'un mécanisme qui ne tient pas
    // sa promesse. Une vraie fix passerait par un connection pool à une seule connexion
    // côté Rust (hors périmètre du plugin tel quel) — à discuter si le besoin se confirme.
    const now = new Date().toISOString();
    const cardId = generateId();
    const today = LocalDate.fromUTCDate(new Date());

    try {
      await this.db.insert(schema.cards).values({
        id: cardId,
        title: input.title,
        courseId: input.courseId,
        currentLevel: 1,
        nextReviewDate: today.toISODate(),
        lastReviewDate: null,
        isArchived: false,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      });

      const questionIds: string[] = [];
      for (const [index, q] of input.questions.entries()) {
        const questionId = generateId();
        questionIds.push(questionId);
        await this.db.insert(schema.questions).values({
          id: questionId,
          cardId,
          order: index,
          prompt: q.prompt,
          answerText: q.answerText,
          createdAt: now,
          updatedAt: now,
        });
        if (q.revisionSheetContent) {
          await this.db.insert(schema.revisionSheets).values({
            id: generateId(),
            questionId,
            content: q.revisionSheetContent,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      for (const [index, d] of input.definitions.entries()) {
        await this.db.insert(schema.definitions).values({
          id: generateId(),
          cardId,
          term: d.term,
          expectedAnswer: d.expectedAnswer,
          order: index,
          linkedQuestionId: d.linkedQuestionIndex !== null ? (questionIds[d.linkedQuestionIndex] ?? null) : null,
        });
      }

      for (const [index, exerciseId] of input.exerciseIds.entries()) {
        await this.db.insert(schema.cardExercises).values({ cardId, exerciseId, order: index });
      }

      for (const tagId of input.tagIds) {
        await this.db.insert(schema.cardTags).values({ cardId, tagId });
      }
    } catch (err) {
      // Nettoyage compensatoire : supprime la fiche (cascade questions/revisionSheets/
      // definitions/cardExercises/cardTags déjà insérées) plutôt que de laisser une
      // fiche incomplète en base.
      await this.db.delete(schema.cards).where(eq(schema.cards.id, cardId));
      throw err;
    }

    return asCardId(cardId);
  }

  async updateWithChildren(id: CardId, input: CardEditInput): Promise<void> {
    if (!input.title.trim()) {
      throw new DomainValidationError("Le titre de la fiche ne peut pas être vide.");
    }
    if (input.questions.length === 0) {
      throw new DomainValidationError("Une fiche doit contenir au moins une question.");
    }

    const now = new Date().toISOString();

    await this.db
      .update(schema.cards)
      .set({ title: input.title, courseId: input.courseId, notes: input.notes, currentLevel: input.currentLevel, updatedAt: now })
      .where(eq(schema.cards.id, id));

    const oldQuestionIds = (await this.db.select({ id: schema.questions.id }).from(schema.questions).where(eq(schema.questions.cardId, id))).map(
      (r) => r.id,
    );
    const oldDefinitionIds = (
      await this.db.select({ id: schema.definitions.id }).from(schema.definitions).where(eq(schema.definitions.cardId, id))
    ).map((r) => r.id);

    // Questions/définitions réécrites en bloc (pas de diff par élément) : on insère les
    // NOUVELLES avant de supprimer les ANCIENNES (ordre inverse de createWithChildren),
    // pour que le contenu déjà rédigé par l'utilisateur ne soit jamais perdu si une
    // insertion échoue en cours de route — seules les anciennes lignes seraient alors
    // restées, pas de trou. Voir le commentaire de createWithChildren pour le contexte
    // (db.transaction() non fiable à travers ce pont).
    const insertedQuestionIds: string[] = [];
    const insertedDefinitionIds: string[] = [];
    try {
      const newQuestionIds: string[] = [];
      for (const [index, q] of input.questions.entries()) {
        const questionId = generateId();
        newQuestionIds.push(questionId);
        await this.db.insert(schema.questions).values({
          id: questionId,
          cardId: id,
          order: index,
          prompt: q.prompt,
          answerText: q.answerText,
          createdAt: now,
          updatedAt: now,
        });
        insertedQuestionIds.push(questionId);
        if (q.revisionSheetContent) {
          await this.db.insert(schema.revisionSheets).values({
            id: generateId(),
            questionId,
            content: q.revisionSheetContent,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      for (const [index, d] of input.definitions.entries()) {
        const definitionId = generateId();
        await this.db.insert(schema.definitions).values({
          id: definitionId,
          cardId: id,
          term: d.term,
          expectedAnswer: d.expectedAnswer,
          order: index,
          linkedQuestionId: d.linkedQuestionIndex !== null ? (newQuestionIds[d.linkedQuestionIndex] ?? null) : null,
        });
        insertedDefinitionIds.push(definitionId);
      }
    } catch (err) {
      // Nettoyage compensatoire : retire les nouvelles lignes déjà insérées ; les anciennes
      // n'ont pas encore été touchées, la fiche reste dans son état d'avant l'édition.
      for (const questionId of insertedQuestionIds) {
        await this.db.delete(schema.questions).where(eq(schema.questions.id, questionId));
      }
      for (const definitionId of insertedDefinitionIds) {
        await this.db.delete(schema.definitions).where(eq(schema.definitions.id, definitionId));
      }
      throw err;
    }

    for (const questionId of oldQuestionIds) {
      await this.db.delete(schema.questions).where(eq(schema.questions.id, questionId));
    }
    for (const definitionId of oldDefinitionIds) {
      await this.db.delete(schema.definitions).where(eq(schema.definitions.id, definitionId));
    }

    // Exercices/tags : simples lignes de référence (pas de contenu rédigé à protéger) et
    // clé primaire composite (cardId, exerciseId|tagId) — l'ordre insert-avant-delete de
    // createWithChildren violerait cette clé si un exercice/tag est conservé tel quel.
    await this.db.delete(schema.cardExercises).where(eq(schema.cardExercises.cardId, id));
    await this.db.delete(schema.cardTags).where(eq(schema.cardTags.cardId, id));
    for (const [index, exerciseId] of input.exerciseIds.entries()) {
      await this.db.insert(schema.cardExercises).values({ cardId: id, exerciseId, order: index });
    }
    for (const tagId of input.tagIds) {
      await this.db.insert(schema.cardTags).values({ cardId: id, tagId });
    }
  }

  async archive(id: CardId): Promise<void> {
    await this.db.update(schema.cards).set({ isArchived: true, updatedAt: new Date().toISOString() }).where(eq(schema.cards.id, id));
  }

  async unarchive(id: CardId): Promise<void> {
    await this.db.update(schema.cards).set({ isArchived: false, updatedAt: new Date().toISOString() }).where(eq(schema.cards.id, id));
  }

  async delete(id: CardId): Promise<void> {
    // Suppression physique explicite — hors flux normal (voir section 4). Les enfants
    // directs (questions/definitions/comments) cascadent ; l'historique de révision
    // NE cascade PAS (onDelete "set null" en base) pour préserver les statistiques.
    await this.db.delete(schema.cards).where(eq(schema.cards.id, id));
  }

  async countActive(): Promise<number> {
    const rows = await this.db.select({ id: schema.cards.id }).from(schema.cards).where(eq(schema.cards.isArchived, false));
    return rows.length;
  }

  async countAll(): Promise<number> {
    const rows = await this.db.select({ id: schema.cards.id }).from(schema.cards);
    return rows.length;
  }

  async getProgressSnapshot(): Promise<{ activeCount: number; averageLevelRatio: number }> {
    // Ne charge que la colonne currentLevel des fiches actives — pas les agrégats complets
    // (questions/définitions/exercices), pour rester rapide sur plusieurs centaines de fiches.
    const rows = await this.db
      .select({ currentLevel: schema.cards.currentLevel })
      .from(schema.cards)
      .where(eq(schema.cards.isArchived, false));

    if (rows.length === 0) return { activeCount: 0, averageLevelRatio: 0 };

    const sumRatios = rows.reduce((sum, r) => sum + r.currentLevel / 7, 0);
    return { activeCount: rows.length, averageLevelRatio: sumRatios / rows.length };
  }

  private async hydrateCard(row: typeof schema.cards.$inferSelect): Promise<Card> {
    const [questionRows, definitionRows, exerciseRows, tagRows, commentRows] = await Promise.all([
      this.db.select().from(schema.questions).where(eq(schema.questions.cardId, row.id)),
      this.db.select().from(schema.definitions).where(eq(schema.definitions.cardId, row.id)),
      this.db.select().from(schema.cardExercises).where(eq(schema.cardExercises.cardId, row.id)),
      this.db.select().from(schema.cardTags).where(eq(schema.cardTags.cardId, row.id)),
      this.db.select().from(schema.comments).where(eq(schema.comments.cardId, row.id)),
    ]);

    // SQLite ne garantit pas l'ordre des lignes sans ORDER BY : trié explicitement par
    // `order` pour que l'affichage (et une future édition) respecte l'ordre saisi.
    const sortedQuestionRows = [...questionRows].sort((a, b) => a.order - b.order);
    const sortedDefinitionRows = [...definitionRows].sort((a, b) => a.order - b.order);

    const questions = await Promise.all(
      sortedQuestionRows.map(async (q) => {
        const [sheet] = await this.db.select().from(schema.revisionSheets).where(eq(schema.revisionSheets.questionId, q.id)).limit(1);
        return {
          id: asQuestionId(q.id),
          cardId: asCardId(q.cardId),
          order: q.order,
          prompt: q.prompt,
          answerText: q.answerText,
          revisionSheet: sheet
            ? {
                id: asRevisionSheetId(sheet.id),
                questionId: asQuestionId(sheet.questionId),
                content: sheet.content,
                createdAt: new Date(sheet.createdAt),
                updatedAt: new Date(sheet.updatedAt),
              }
            : null,
          createdAt: new Date(q.createdAt),
          updatedAt: new Date(q.updatedAt),
        };
      }),
    );

    const exerciseRefs: CardExerciseRef[] = exerciseRows
      .map((e) => ({ exerciseId: asExerciseId(e.exerciseId), order: e.order }))
      .sort((a, b) => a.order - b.order);

    return {
      id: asCardId(row.id),
      title: row.title,
      courseId: row.courseId ? asCourseId(row.courseId) : null,
      currentLevel: row.currentLevel as Card["currentLevel"],
      nextReviewDate: LocalDate.fromISODate(row.nextReviewDate),
      lastReviewDate: row.lastReviewDate ? LocalDate.fromISODate(row.lastReviewDate) : null,
      isArchived: row.isArchived,
      notes: row.notes,
      questions,
      definitions: sortedDefinitionRows.map((d) => ({
        id: asDefinitionId(d.id),
        cardId: asCardId(d.cardId),
        term: d.term,
        expectedAnswer: d.expectedAnswer,
        order: d.order,
        linkedQuestionId: d.linkedQuestionId ? asQuestionId(d.linkedQuestionId) : null,
      })),
      exerciseRefs,
      tagIds: tagRows.map((t) => asTagId(t.tagId)),
      comments: commentRows.map((c) => ({
        id: asCommentId(c.id),
        cardId: asCardId(c.cardId),
        body: c.body,
        createdAt: new Date(c.createdAt),
      })),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}
