import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Manuals from "@/pages/Manuals";
import Versions from "@/pages/Versions";

describe("public manuals", () => {
  it("lists research software and vendor API manuals", () => {
    render(
      <MemoryRouter initialEntries={["/manuals"]}>
        <Routes>
          <Route path="/manuals" element={<Manuals />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Manuals & API Documentation" })).toBeInTheDocument();
    expect(screen.getByText("NCICT 4 User Manual")).toBeInTheDocument();
    expect(screen.getByText("NCIRF API Manual")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Release History" })).toBeInTheDocument();
    expect(screen.getByText("NCICT Release History")).toBeInTheDocument();
  });

  it("renders a Markdown manual inside the website reader", () => {
    render(
      <MemoryRouter initialEntries={["/manuals/ncict"]}>
        <Routes>
          <Route path="/manuals/:manualId" element={<Manuals />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "NCICT 4 User Manual" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Introduction" })).toBeInTheDocument();
    expect(screen.getByText("Documented release 4.20260502")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Introduction" })).not.toHaveAttribute("href");
  });

  it("renders the NCICT release record inside the documentation site", () => {
    render(
      <MemoryRouter initialEntries={["/versions/ncict"]}>
        <Routes>
          <Route path="/versions/:toolId" element={<Versions />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "NCICT Release History" })).toBeInTheDocument();
    expect(screen.getAllByText("July 13, 2026")).toHaveLength(2);
    expect(screen.getByText("4.20260415")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /April 15, 2026/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download approved releases/i })).toHaveAttribute(
      "href",
      "https://portal.ncidosetools.com",
    );
  });
});
