import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.history.replaceState({}, "", "/");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<App />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("StartPage", () => {
  it("shows a Rules card below the Draw, Guess and Win cards", () => {
    const grid = container.querySelector(".hero__grid");
    expect(Array.from(grid!.querySelectorAll(".card h2"), (heading) => heading.textContent))
      .toEqual(["Draw", "Guess", "Win"]);
    const rules = grid!.nextElementSibling;
    expect(rules?.matches("article.card")).toBe(true);
    expect(rules?.querySelector("h2")?.textContent).toBe("Rules");
  });

  it("lists the three rules in order", () => {
    const rules = container.querySelector(".hero__grid + article.card ol");
    expect(rules).not.toBeNull();
    expect(Array.from(rules!.querySelectorAll("li"), (item) => item.textContent)).toEqual([
      "The drawer gets a word and sketches it.",
      "The other players type their guesses.",
      "The highest score after all rounds wins.",
    ]);
  });

  it.each([
    ["Create Room", "/create-room", "Sketch captain", "Create and Continue"],
    ["Join Room", "/join-room", "Second pencil", "Join Lobby"],
  ])("opens the %s form from the start page", (label, path, placeholder, submit) => {
    const link = Array.from(container.querySelectorAll("a")).find((item) => item.textContent?.trim() === label);
    expect(link).toBeDefined();
    act(() => link!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })));
    expect(window.location.pathname).toBe(path);
    expect(container.querySelector(`input[placeholder="${placeholder}"]`)).not.toBeNull();
    expect(container.querySelector("form button[type=submit]")?.textContent?.trim()).toBe(submit);
  });
});
