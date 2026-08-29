import { describe, expect, it } from "vitest";
import { selectExercise } from "@domain/policies/selectExercise";
import type { Exercise } from "@domain/entities/Exercise";
import { asExerciseId } from "@domain/value-objects/Ids";

function makeExercise(id: string, difficulty: Exercise["difficulty"]): Exercise {
  return {
    id: asExerciseId(id),
    title: `Exercice ${id}`,
    description: null,
    reference: null,
    difficulty,
    courseId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const easy = makeExercise("e1", "EASY");
const medium = makeExercise("e2", "MEDIUM");
const hard = makeExercise("e3", "HARD");

describe("selectExercise", () => {
  it("retourne null si aucun exercice disponible", () => {
    expect(selectExercise(3, { questionsSucceeded: 1, questionsTotal: 1, definitionsSucceeded: 0, definitionsTotal: 0 }, [])).toBeNull();
  });

  it("propose un exercice EASY en cas d'échec récent, même à un niveau élevé", () => {
    const result = selectExercise(
      7,
      { questionsSucceeded: 1, questionsTotal: 2, definitionsSucceeded: 0, definitionsTotal: 0 },
      [easy, medium, hard],
    );
    expect(result?.difficulty).toBe("EASY");
  });

  it("propose HARD à un niveau avancé sans échec", () => {
    const result = selectExercise(7, { questionsSucceeded: 2, questionsTotal: 2, definitionsSucceeded: 1, definitionsTotal: 1 }, [
      easy,
      medium,
      hard,
    ]);
    expect(result?.difficulty).toBe("HARD");
  });

  it("propose MEDIUM à un niveau intermédiaire sans échec", () => {
    const result = selectExercise(4, { questionsSucceeded: 1, questionsTotal: 1, definitionsSucceeded: 0, definitionsTotal: 0 }, [
      easy,
      medium,
      hard,
    ]);
    expect(result?.difficulty).toBe("MEDIUM");
  });

  it("se rabat sur l'exercice disponible le plus proche si la difficulté cible n'existe pas", () => {
    const result = selectExercise(7, { questionsSucceeded: 1, questionsTotal: 1, definitionsSucceeded: 0, definitionsTotal: 0 }, [
      medium,
    ]);
    expect(result?.difficulty).toBe("MEDIUM");
  });
});
