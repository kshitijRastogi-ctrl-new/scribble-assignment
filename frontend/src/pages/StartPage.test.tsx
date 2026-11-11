import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { describe, expect, it } from "vitest";
import styles from "../styles/app.css?raw";
import { StartPage } from "./StartPage";

function renderPage() {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(
    <StaticRouter location="/">
      <StartPage />
    </StaticRouter>
  );
  return container;
}

describe("StartPage", () => {
  it("places the How to play heading directly above the step cards", () => {
    const page = renderPage();
    const heading = page.querySelector("h2.hero__heading");
    expect(heading?.textContent).toBe("How to play");
    expect(heading?.nextElementSibling?.className).toBe("hero__grid");
    expect(Array.from(heading?.nextElementSibling?.querySelectorAll(".card h2") ?? [], (item) => item.textContent))
      .toEqual(["Draw", "Guess", "Win"]);
  });

  it("uses the same typography and ink colour as card headings", () => {
    const style = document.createElement("style");
    style.textContent = styles;
    document.head.appendChild(style);
    try {
      const rules = Array.from(style.sheet?.cssRules ?? []);
      const headingRule = rules.find((rule) =>
        (rule as CSSStyleRule).selectorText?.split(",").map((selector) => selector.trim()).join(",") === ".card h2,.hero__heading"
      ) as CSSStyleRule | undefined;
      expect(headingRule?.style.getPropertyValue("color")).toBe("var(--ink)");
      expect(headingRule?.style.getPropertyValue("font-size")).toBe("1.25rem");
      expect(headingRule?.style.getPropertyValue("font-weight")).toBe("600");
    } finally {
      style.remove();
    }
  });

  it("retains the responsive phone-width grid and padding rules", () => {
    const page = renderPage();
    expect(page.querySelector(".hero__heading")?.parentElement?.getAttribute("style")).toBeNull();
    expect(styles).toMatch(/\.hero__grid\s*\{\s*grid-template-columns:\s*repeat\(auto-fit, minmax\(280px, 1fr\)\)/);
    expect(styles).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.app-shell\s*\{\s*padding: 24px 16px/);
    expect(styles).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.hero,[\s\S]*?padding: 24px 16px/);
  });

  it("preserves the room links and step card content", () => {
    const page = renderPage();
    const links = Array.from(page.querySelectorAll(".button-row--hero a"), (link) => [
      link.textContent, link.getAttribute("href"), link.className,
    ]);
    expect(links).toEqual([
      ["Create Room", "/create-room", "button button--primary"],
      ["Join Room", "/join-room", "button button--secondary"],
    ]);
    const cards = Array.from(page.querySelectorAll(".hero__grid .card"), (card) => [
      card.querySelector(".card__badge")?.textContent,
      card.querySelector("h2")?.textContent,
      card.querySelector("p")?.textContent,
    ]);
    expect(cards).toEqual([
      ["Step 1", "Draw", "Get a word and sketch it out on the canvas. No artistic skills required!"],
      ["Step 2", "Guess", "Type your guesses as fast as you can when other players are drawing."],
      ["Step 3", "Win", "Score the most points across all rounds to be crowned the winner."],
    ]);
  });
});
