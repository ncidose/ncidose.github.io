import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { Portal } from "@/pages/Portal";

describe("portal migration experience", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("tells existing users they can keep their Gmail and approval", () => {
    render(
      <MemoryRouter initialEntries={["/portal"]}>
        <Portal />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Gmail address previously used/i)).toBeInTheDocument();
    expect(screen.getByText(/cloudflare will send a one-time code/i)).toBeInTheDocument();
  });

  it("opens an approved account without a new registration step", () => {
    render(
      <MemoryRouter initialEntries={["/portal"]}>
        <Portal />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /sign in with approved email/i }));

    expect(screen.getByText("Welcome, Approved Researcher")).toBeInTheDocument();
    expect(screen.getByText("Approved", { selector: ".text-3xl" })).toBeInTheDocument();
  });

  it("shows the branded public portal landing before secure authentication", () => {
    render(
      <MemoryRouter initialEntries={["/portal"]}>
        <Portal publicLanding />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /your approved tools, in one place/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in with approved email/i })).toBeEnabled();
    expect(screen.getByText(/cloudflare will send a one-time code/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request access as a new user/i })).toBeInTheDocument();
  });

  it("shows the NCI STA workflow for a new user", () => {
    render(
      <MemoryRouter initialEntries={["/portal/request-access"]}>
        <Portal />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /clearer path from STA to downloads/i })).toBeInTheDocument();
    expect(screen.getByText(/Technology Transfer Center remains responsible/i)).toBeInTheDocument();
    expect(screen.getByText(/No signed agreement document is uploaded/i)).toBeInTheDocument();
    expect(screen.queryByText("DCC")).not.toBeInTheDocument();
    expect(screen.getByText(/If the answer is NO, please do not continue with the Software Transfer Agreement/i)).toBeInTheDocument();
    expect(screen.getAllByText(/If the answer is YES, please do not continue with the Software Transfer Agreement/i)).toHaveLength(2);
  });
});
