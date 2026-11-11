import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoomCodeBadge } from "./RoomCodeBadge";

describe("RoomCodeBadge", () => {
  let container: HTMLDivElement;
  let root: Root;
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<RoomCodeBadge code="ABCD" />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  function button() {
    return container.querySelector("button")!;
  }

  async function click() {
    await act(async () => { button().click(); });
  }

  it("shows a styled Copy button next to the code and share hint", () => {
    expect(button().textContent).toBe("Copy");
    expect(button().type).toBe("button");
    expect(button().className).toContain("button button--secondary");
    expect(button().className).toContain("room-code-badge__copy");
    expect(button().previousElementSibling?.textContent).toBe("ABCD");
    expect(container.textContent).toContain("Share this code with friends to join");
    expect(button().parentElement?.className).toBe("room-code-badge__row");
  });

  it("copies the code and shows Copied! for two seconds", async () => {
    await click();
    expect(writeText).toHaveBeenCalledWith("ABCD");
    expect(button().textContent).toBe("Copied!");
    act(() => vi.advanceTimersByTime(1999));
    expect(button().textContent).toBe("Copied!");
    act(() => vi.advanceTimersByTime(1));
    expect(button().textContent).toBe("Copy");
  });

  it("restarts the feedback timer on another successful copy", async () => {
    await click();
    act(() => vi.advanceTimersByTime(1500));
    await click();
    act(() => vi.advanceTimersByTime(500));
    expect(button().textContent).toBe("Copied!");
    act(() => vi.advanceTimersByTime(1500));
    expect(button().textContent).toBe("Copy");
  });

  it("offers manual copying when the clipboard rejects or is unavailable, and allows retry", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    await click();
    expect(button().textContent).toBe("Copy");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("copy the code manually");
    Reflect.deleteProperty(navigator, "clipboard");
    await click();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await click();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(button().textContent).toBe("Copied!");
  });

  it("clears feedback when the code changes and ignores stale clipboard results", async () => {
    let resolve!: () => void;
    writeText.mockReturnValueOnce(new Promise<void>((done) => { resolve = done; }));
    act(() => button().click());
    act(() => root.render(<RoomCodeBadge code="WXYZ" />));
    await act(async () => { resolve(); });
    expect(button().textContent).toBe("Copy");
    await click();
    expect(writeText).toHaveBeenLastCalledWith("WXYZ");
    expect(button().textContent).toBe("Copied!");
    act(() => root.render(<RoomCodeBadge code="EFGH" />));
    expect(button().textContent).toBe("Copy");
    expect(vi.getTimerCount()).toBe(0);
  });
});
