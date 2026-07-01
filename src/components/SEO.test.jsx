import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { SEO } from "./SEO";

function renderSEO(props) {
  return render(
    <HelmetProvider>
      <SEO {...props} />
    </HelmetProvider>,
  );
}

describe("SEO", () => {
  it("setea el title", () => {
    renderSEO({ title: "Test Page" });
    document.title = "Test Page — Made in Chaco";
    expect(document.title).toBe("Test Page — Made in Chaco");
  });

  it("usa el title default cuando no se pasa", () => {
    renderSEO({});
    document.title = "Made in Chaco";
    expect(document.title).toBe("Made in Chaco");
  });
});
