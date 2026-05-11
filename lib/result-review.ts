type SnapshotQuestionInput = {
  id: string;
  questionText: string;
  options: unknown;
  correctAnswer: string;
  explanation?: string | null;
  order?: number | null;
};

export interface ResultReviewQuestion {
  id: string;
  questionText: string;
  options: unknown;
  correctAnswer: string;
  explanation: string | null;
  order: number;
}

export interface ResultReviewSnapshot {
  version: 1;
  questionIds: string[];
  questions: ResultReviewQuestion[];
}

export interface ResultReviewStats {
  correct: number;
  incorrect: number;
  unattempted: number;
  isLegacyQuestionMismatch: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toReviewQuestion(question: SnapshotQuestionInput, index: number): ResultReviewQuestion | null {
  if (
    typeof question.id !== "string" ||
    typeof question.questionText !== "string" ||
    typeof question.correctAnswer !== "string"
  ) {
    return null;
  }

  return {
    id: question.id,
    questionText: question.questionText,
    options: isRecord(question.options) ? question.options : {},
    correctAnswer: question.correctAnswer,
    explanation: typeof question.explanation === "string" ? question.explanation : null,
    order: typeof question.order === "number" ? question.order : index,
  };
}

export function buildResultReviewSnapshot(questions: SnapshotQuestionInput[]): ResultReviewSnapshot {
  const reviewQuestions = questions
    .map((question, index) => toReviewQuestion(question, index))
    .filter((question): question is ResultReviewQuestion => !!question);

  return {
    version: 1,
    questionIds: reviewQuestions.map((question) => question.id),
    questions: reviewQuestions,
  };
}

export function parseResultReviewSnapshot(value: unknown): ResultReviewSnapshot | null {
  if (!isRecord(value) || !Array.isArray(value.questions)) return null;

  const questions = value.questions
    .map((question, index) => (isRecord(question) ? toReviewQuestion(question as SnapshotQuestionInput, index) : null))
    .filter((question): question is ResultReviewQuestion => !!question);

  if (questions.length === 0) return null;

  return {
    version: 1,
    questionIds: questions.map((question) => question.id),
    questions,
  };
}

export function calculateResultReviewStats(args: {
  questions: ResultReviewQuestion[];
  userAnswers: Record<string, string>;
  savedScore: number;
  savedTotal: number;
}): ResultReviewStats {
  const answerCount = Object.values(args.userAnswers).filter((answer) => answer.trim() !== "").length;
  const matchedAnswerCount = args.questions.filter((question) => !!args.userAnswers[question.id]).length;
  const isLegacyQuestionMismatch = answerCount > 0 && matchedAnswerCount === 0;

  if (isLegacyQuestionMismatch) {
    const attempted = Math.min(answerCount, args.savedTotal);
    const correct = Math.min(Math.max(args.savedScore, 0), attempted);
    const incorrect = Math.max(0, attempted - correct);
    const unattempted = Math.max(0, args.savedTotal - attempted);
    return { correct, incorrect, unattempted, isLegacyQuestionMismatch };
  }

  const correct = args.questions.filter((question) => args.userAnswers[question.id] === question.correctAnswer).length;
  const incorrect = args.questions.filter((question) => {
    const answer = args.userAnswers[question.id];
    return !!answer && answer !== question.correctAnswer;
  }).length;
  const reviewedTotal = args.questions.length || args.savedTotal;
  const unattempted = Math.max(0, reviewedTotal - correct - incorrect);

  return { correct, incorrect, unattempted, isLegacyQuestionMismatch };
}
