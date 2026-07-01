import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";
import { BrowserRouter } from "react-router-dom";

const GoodComponent = () => <div>Funciona</div>;
const BadComponent = () => { throw new Error("Test error"); };

function renderWithRouter(ui) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe("ErrorBoundary", () => {
  it("renderiza children cuando no hay error", () => {
    renderWithRouter(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Funciona")).toBeInTheDocument();
  });

  it("muestra mensaje de error cuando hay error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithRouter(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    expect(screen.getByText("Reintentar")).toBeInTheDocument();
    expect(screen.getByText("Volver al inicio")).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
