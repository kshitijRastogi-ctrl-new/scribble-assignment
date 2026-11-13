import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoomCodeBadge } from "./RoomCodeBadge";

describe("RoomCodeBadge", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    Reflect.deleteProperty(navigator, "clipboard");
    vi.useRealTimers();
  });

  function render(code = "ABCD") {
    act(() => root.render(<RoomCodeBadge code={code} />));
  }

  function button() {
    const element = container.querySelector("button");
    if (!element) throw new Error("Copy button missing");
    return element;
  }

  async function click() {
    await act(async () => button().click());
  }

  function clipboard(writeText: (text: string) => Promise<void>) {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  }

  it("shows Copy code next to the unchanged code, label and hint", () => {
    render();
    expect(container.querySelector(".room-code-badge__label")?.textContent).toBe("Room Code");
    expect(container.querySelector(".room-code-badge__code")?.textContent).toBe("ABCD");
    expect(container.querySelector(".room-code-badge__hint")?.textContent).toBe("Share this code with friends to join");
    expect(button().textContent).toBe("Copy code");
    expect(button().parentElement?.querySelector(".room-code-badge__code")?.textContent).toBe("ABCD");
  });

  it("copies only the code and shows Copied for two seconds", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    clipboard(writeText);
    render();
    await click();
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith("ABCD");
    expect(button().textContent).toBe("Copied");
    act(() => vi.advanceTimersByTime(1999));
    expect(button().textContent).toBe("Copied");
    act(() => vi.advanceTimersByTime(1));
    expect(button().textContent).toBe("Copy code");
  });

  it("restarts the confirmation timer on another successful copy", async () => {
    clipboard(vi.fn().mockResolvedValue(undefined));
    render();
    await click();
    act(() => vi.advanceTimersByTime(1500));
    await click();
    act(() => vi.advanceTimersByTime(1500));
    expect(button().textContent).toBe("Copied");
    act(() => vi.advanceTimersByTime(500));
    expect(button().textContent).toBe("Copy code");
  });

  it("reports a rejected copy without claiming success and allows retry", async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error("denied")).mockResolvedValueOnce(undefined);
    clipboard(writeText);
    render();
    await click();
    expect(button().textContent).toBe("Copy code");
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Unable to copy code. Please copy it manually.");
    await click();
    expect(button().textContent).toBe("Copied");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("reports when the clipboard API is unavailable", async () => {
    Reflect.deleteProperty(navigator, "clipboard");
    render();
    await click();
    expect(button().textContent).toBe("Copy code");
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it("clears the confirmation timer when the code changes", async () => {
    clipboard(vi.fn().mockResolvedValue(undefined));
    render();
    await click();
    expect(vi.getTimerCount()).toBe(1);
    render("WXYZ");
    expect(button().textContent).toBe("Copy code");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores an old copy result when the code changes", async () => {
    let resolveCopy: () => void = () => {};
    clipboard(() => new Promise<void>((resolve) => { resolveCopy = resolve; }));
    render();
    act(() => button().click());
    render("WXYZ");
    await act(async () => resolveCopy());
    expect(button().textContent).toBe("Copy code");
    expect(container.querySelector(".room-code-badge__code")?.textContent).toBe("WXYZ");
  });
});
