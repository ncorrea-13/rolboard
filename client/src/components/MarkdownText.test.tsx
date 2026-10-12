import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MarkdownText } from "./MarkdownText";

describe("MarkdownText", () => {
  it("renders tables inside the .md container", () => {
    const { container } = render(
      <MarkdownText text={"| A | B |\n| --- | --- |\n| 1 | 2 |"} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("md");
    expect(root.querySelectorAll("th")).toHaveLength(2);
    expect(root.querySelectorAll("td")).toHaveLength(2);
  });

  it("turns [!NOTE] blockquotes into callouts", () => {
    const { container } = render(<MarkdownText text={"> [!NOTE]\n> Hola"} />);
    expect(container.querySelector(".callout-note")).not.toBeNull();
  });

  it("sanitizes script tags", () => {
    const { container } = render(
      <MarkdownText text={"hola <script>alert(1)</script>"} />,
    );
    expect(container.querySelector("script")).toBeNull();
  });

  it("renders inline text in a span without the md class", () => {
    const { container } = render(<MarkdownText inline text="**hola**" />);
    expect(container.firstElementChild?.tagName).toBe("SPAN");
    expect(container.firstElementChild).not.toHaveClass("md");
  });
});
