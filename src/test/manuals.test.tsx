import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Manuals from "@/pages/Manuals";

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
  });
});
