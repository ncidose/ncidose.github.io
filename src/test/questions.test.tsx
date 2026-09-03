import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Questions from "@/pages/Questions";

const sample = {
  id: "github-12",
  tool: "NCICT",
  requestType: "technical_question",
  pinned: false,
  authorName: "@fujibuchi",
  authorType: "community",
  visibility: "public_after_review",
  title: "How should scan coverage be entered?",
  body: "Use the anatomical landmarks described in the manual.",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-02T00:00:00Z",
  publishedAt: "2025-01-02T00:00:00Z",
  attachments: [],
  answers: [
    { id: "a1", body: "Confirm the start and end landmarks before calculation.", responseType: "team", authorName: "@haeginh", parentAnswerId: null, messageType: "response", createdAt: "2025-01-02T00:00:00Z", updatedAt: "2025-01-02T00:00:00Z", attachments: [] },
    { id: "a2", body: "Thank you very much for your answer.", responseType: "community", authorName: "@fujibuchi", parentAnswerId: "a1", messageType: "follow_up", createdAt: "2025-01-03T00:00:00Z", updatedAt: "2025-01-03T00:00:00Z", attachments: [] },
  ],
};

const featureRequestSample = {
  ...sample,
  id: "github-31",
  requestType: "feature_request",
  pinned: true,
  title: "Feature request NCICT",
  body: "Community requests and NCI Dose Team status updates are identified below.",
  answers: [
    { ...sample.answers[0], id: "request-1", body: "Please add a new scanner model.", responseType: "community", authorName: "@requester", messageType: "request" },
    { ...sample.answers[0], id: "update-1", body: "Included in the current release.", responseType: "team", authorName: "@ncidoseteam", messageType: "status_update" },
  ],
};

describe("public Q&A", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads published questions from the Cloudflare API without exposing GitHub controls", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ questions: [sample] }) }));
    render(<MemoryRouter initialEntries={["/questions"]}><Routes><Route path="/questions" element={<Questions />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(sample.title)).toBeInTheDocument();
    expect(screen.queryByText(/accepted answer/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /like|accept/i })).not.toBeInTheDocument();
  });

  it("shows the selected question and team response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ questions: [sample] }) }));
    render(<MemoryRouter initialEntries={["/questions/github-12"]}><Routes><Route path="/questions/:questionId" element={<Questions />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("NCI Dose Team · @haeginh · Response")).toBeInTheDocument());
    expect(screen.getByText(sample.answers[0].body)).toBeInTheDocument();
    expect(screen.getByText("User Community · @fujibuchi · Follow-up")).toBeInTheDocument();
    expect(screen.getByText("Reply in this conversation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read NCICT manual" })).toHaveAttribute("href", "/manuals/ncict");
    expect(screen.getByRole("link", { name: "Read NCICT API manual" })).toHaveAttribute("href", "/manuals/ncict-api");
    expect(screen.getByRole("link", { name: "Vendor integration" })).toHaveAttribute(
      "href",
      "/vendors?tool=ncict#commercial-access",
    );
  });

  it("distinguishes feature requests from NCI Dose Team status updates", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ questions: [featureRequestSample] }) }));
    render(<MemoryRouter initialEntries={["/questions/github-31"]}><Routes><Route path="/questions/:questionId" element={<Questions />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("User Community · @requester · Request")).toBeInTheDocument();
    expect(screen.getByText("NCI Dose Team · @choonsiklee · Status update")).toBeInTheDocument();
    expect(screen.getByText("Included in the current release.")).toBeInTheDocument();
  });
});
