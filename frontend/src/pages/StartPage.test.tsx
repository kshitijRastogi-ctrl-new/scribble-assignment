import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { describe, expect, it } from "vitest";
import { StartPage } from "./StartPage";

function renderPage() {
  const html = renderToStaticMarkup(
    <StaticRouter location="/">
      <StartPage />
    </StaticRouter>
  );
  return new DOMParser().parseFromString(html, "text/html");
}

describe("StartPage", () => {
  it("labels the step cards with an existing page-header heading", () => {
    const page = renderPage();
    const section = page.querySelector('section[aria-labelledby="how-to-play"]');
    const header = section?.firstElementChild;
    expect(header?.className).toBe("page-header");
    expect(header?.querySelector("h2#how-to-play")?.textContent).toBe("How to play");
    expect(header?.nextElementSibling?.className).toBe("hero__grid");
  });

  it("preserves the room links and the three step cards", () => {
    const page = renderPage();
    const links = Array.from(page.querySelectorAll(".button-row--hero a"));
    expect(links.map((link) => [link.textContent, link.getAttribute("href"), link.className])).toEqual([
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

  it("keeps the cards in the existing responsive hero grid", () => {
    const page = renderPage();
    expect(page.querySelector(".panel.hero .hero__grid")?.children).toHaveLength(3);
  });
});
