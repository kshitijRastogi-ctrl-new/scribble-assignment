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
    const heading = page.querySelector("#how-to-play-heading");
    const section = heading?.parentElement;

    expect(heading?.tagName).toBe("H2");
    expect(heading?.textContent).toBe("How to play");
    expect(section?.getAttribute("aria-labelledby")).toBe("how-to-play-heading");
    expect(heading?.nextElementSibling?.className).toBe("hero__grid");
    expect(Array.from(heading!.nextElementSibling!.querySelectorAll("h2"), (h) => h.textContent))
      .toEqual(["Draw", "Guess", "Win"]);
  });

  it("uses the existing card heading typography and ink colour", () => {
    const page = renderPage();
    expect(page.querySelector("#how-to-play-heading")?.className).toBe("hero__heading");
    expect(styles).toMatch(/\.card h2,\s*\.hero__heading\s*\{\s*margin: 0;\s*color: var\(--ink\);\s*font-size: 1\.25rem;\s*font-weight: 600;/);
  });

  it("preserves the room links and card content", () => {
    const page = renderPage();
    const links = Array.from(page.querySelectorAll(".button-row--hero a"));
    expect(links.map((link) => [link.textContent?.trim(), link.getAttribute("href"), link.className])).toEqual([
      ["Create Room", "/create-room", "button button--primary"],
      ["Join Room", "/join-room", "button button--secondary"],
    ]);
    const cards = Array.from(page.querySelectorAll(".hero__grid .card"));
    expect(cards.map((card) => [
      card.querySelector(".card__badge")?.textContent,
      card.querySelector("h2")?.textContent,
      card.querySelector("p")?.textContent,
    ])).toEqual([
      ["Step 1", "Draw", "Get a word and sketch it out on the canvas. No artistic skills required!"],
      ["Step 2", "Guess", "Type your guesses as fast as you can when other players are drawing."],
      ["Step 3", "Win", "Score the most points across all rounds to be crowned the winner."],
    ]);
  });

  it("retains the responsive grid and phone-width spacing", () => {
    const page = renderPage();
    expect(page.querySelector(".hero__grid")?.getAttribute("style")).toBe("margin-top:16px");
    expect(styles).toMatch(/\.hero__grid\s*\{\s*grid-template-columns: repeat\(auto-fit, minmax\(280px, 1fr\)\);/);
    expect(styles).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.app-shell\s*\{\s*padding: 24px 16px;/);
    expect(styles).toMatch(/@media \(max-width: 720px\)[\s\S]*?\.hero,\s*\.placeholder-page,\s*\.game-page\s*\{\s*padding: 24px 16px;/);
    // At 375px, shell and panel padding plus panel borders leave room for a 280px card.
    expect(375 - 2 * 16 - 2 - 2 * 16).toBeGreaterThanOrEqual(280);
  });
});
