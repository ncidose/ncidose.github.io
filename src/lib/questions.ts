export const questionTools = ["All", "NCICT", "NCIRF", "NCINM", "PHANTOM", "General"] as const;
export type QuestionTool = Exclude<(typeof questionTools)[number], "All">;
export const questionRequestTypes = ["technical_question", "bug_report", "feature_request"] as const;
export type QuestionRequestType = (typeof questionRequestTypes)[number];
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

export const normalizePublicQuestion = (question: PublicQuestion): PublicQuestion => ({
  ...question,
  requestType: question.requestType || "technical_question",
  pinned: Boolean(question.pinned),
  attachments: Array.isArray(question.attachments) ? question.attachments : [],
  answers: Array.isArray(question.answers) ? question.answers.map((answer) => ({
    ...answer,
    attachments: Array.isArray(answer.attachments) ? answer.attachments : [],
  })) : [],
});

export const publicQuestionsApi = "https://portal.ncidosetools.com/api/public/questions";
