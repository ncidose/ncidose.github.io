export const questionTools = ["All", "NCICT", "NCIRF", "NCINM", "PHANTOM", "General"] as const;
export type QuestionTool = Exclude<(typeof questionTools)[number], "All">;

export type QuestionAnswer = {
  id: string;
  body: string;
  responseType: "team" | "community";
  createdAt: string;
  updatedAt: string;
  editable?: boolean;
};

export type PublicQuestion = {
  id: string;
  tool: QuestionTool;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  answers: QuestionAnswer[];
};

export type ManagedQuestion = PublicQuestion & {
  status: "submitted" | "draft" | "published" | "archived";
  source: "portal" | "github_discussions" | "admin";
  submitter?: { name: string | null; email: string | null; institution: string | null };
};

export const publicQuestionsApi = "https://portal.ncidosetools.com/api/public/questions";
