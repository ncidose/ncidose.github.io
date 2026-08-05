export const questionTools = ["All", "NCICT", "NCIRF", "NCINM", "PHANTOM", "General"] as const;
export type QuestionTool = Exclude<(typeof questionTools)[number], "All">;
export const questionRequestTypes = ["technical_question", "bug_report", "feature_request"] as const;
export type QuestionRequestType = (typeof questionRequestTypes)[number];
export type QuestionVisibility = "public_after_review" | "team_only";
export type QuestionMessageType = "request" | "response" | "follow_up" | "status_update";
export const questionRequestTypeLabels: Record<QuestionRequestType, string> = {
  technical_question: "Technical question",
  bug_report: "Bug report",
  feature_request: "Feature request",
};

export type QuestionAttachment = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

export type QuestionAnswer = {
  id: string;
  body: string;
  responseType: "team" | "community";
  authorName: string | null;
  parentAnswerId: string | null;
  messageType: QuestionMessageType;
  createdAt: string;
  updatedAt: string;
  editable?: boolean;
  attachments: QuestionAttachment[];
};

export type PublicQuestion = {
  id: string;
  tool: QuestionTool;
  requestType: QuestionRequestType;
  pinned: boolean;
  authorName: string | null;
  visibility: QuestionVisibility;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  attachments: QuestionAttachment[];
  answers: QuestionAnswer[];
};

export type ManagedQuestion = PublicQuestion & {
  status: "submitted" | "draft" | "published" | "archived";
  source: "portal" | "github_discussions" | "admin";
  submitter?: { name: string | null; email: string | null; institution: string | null };
};

const questionMessageTypeLabels: Record<QuestionMessageType, string> = {
  request: "Request",
  response: "Response",
  follow_up: "Follow-up",
  status_update: "Status update",
};

export const questionAnswerLabel = (answer: QuestionAnswer) => {
  const authorName = answer.authorName?.toLowerCase() === "@ncidoseteam"
    ? "@choonsiklee"
    : answer.authorName;
  const participant = answer.responseType === "team"
    ? `NCI Dose Team${authorName ? ` · ${authorName}` : ""}`
    : `User Community${authorName ? ` · ${authorName}` : ""}`;
  return `${participant} · ${questionMessageTypeLabels[answer.messageType]}`;
};

export const normalizePublicQuestion = (question: PublicQuestion): PublicQuestion => ({
  ...question,
  requestType: question.requestType || "technical_question",
  pinned: Boolean(question.pinned),
  authorName: question.authorName || null,
  visibility: question.visibility || "public_after_review",
  attachments: Array.isArray(question.attachments) ? question.attachments : [],
  answers: Array.isArray(question.answers) ? question.answers.map((answer) => ({
    ...answer,
    authorName: answer.authorName || null,
    parentAnswerId: answer.parentAnswerId || null,
    messageType: answer.messageType || "response",
    attachments: Array.isArray(answer.attachments) ? answer.attachments : [],
  })) : [],
});

export const publicQuestionsApi = "https://portal.ncidosetools.com/api/public/questions";
