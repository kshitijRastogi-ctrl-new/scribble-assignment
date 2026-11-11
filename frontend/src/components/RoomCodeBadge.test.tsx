import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RoomCodeBadge } from "./RoomCodeBadge";

describe("RoomCodeBadge", () => {
  let container: HTMLDivElement;
  let root: Root;
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
    else Reflect.deleteProperty(navigator, "clipboard");
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function renderBadge() {
    act(() => root.render(<RoomCodeBadge code="ABCD" />));
  }

  async function clickCopy() {
    await act(async () => container.querySelector("button")!.click());
  }

  it("shows a styled Copy button next to the code and retains the sharing hint", () => {
    renderBadge();
    const code = container.querySelector(".room-code-badge__code")!;
    const button = container.querySelector("button")!;
    expect(code.textContent).toBe("ABCD");
    expect(code.nextElementSibling).toBe(button);
    expect(button.textContent).toBe("Copy");
    expect(button.type).toBe("button");
    expect(button.classList.contains("button")).toBe(true);
    expect(button.classList.contains("button--secondary")).toBe(true);
    expect(button.classList.contains("room-code-badge__copy")).toBe(true);
    expect(container.textContent).toContain("Share this code with friends to join");
  });

  it("copies the room code and shows Copied! for two seconds after each success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderBadge();
    await clickCopy();
    expect(writeText).toHaveBeenCalledWith("ABCD");
    expect(container.querySelector("button")!.textContent).toBe("Copied!");
    act(() => vi.advanceTimersByTime(1500));
    await clickCopy();
    expect(writeText).toHaveBeenCalledTimes(2);
    act(() => vi.advanceTimersByTime(1999));
    expect(container.querySelector("button")!.textContent).toBe("Copied!");
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector("button")!.textContent).toBe("Copy");
  });

  it("disables the button while a clipboard write is pending", async () => {
    let resolveWrite: () => void = () => {};
    const writeText = vi.fn(() => new Promise<void>((resolve) => { resolveWrite = resolve; }));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderBadge();
    act(() => container.querySelector("button")!.click());
    expect(container.querySelector("button")!.disabled).toBe(true);
    act(() => container.querySelector("button")!.click());
    expect(writeText).toHaveBeenCalledTimes(1);
    await act(async () => resolveWrite());
    expect(container.querySelector("button")!.disabled).toBe(false);
    expect(container.querySelector("button")!.textContent).toBe("Copied!");
  });

  it("offers manual copying when clipboard access fails and allows retry", async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error("denied")).mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderBadge();
    await clickCopy();
    expect(container.querySelector("button")!.textContent).toBe("Copy");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("copy the code manually");
    await clickCopy();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("button")!.textContent).toBe("Copied!");
  });

  it("offers manual copying when the clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    renderBadge();
    await clickCopy();
    expect(container.querySelector("button")!.textContent).toBe("Copy");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("copy the code manually");
  });

  it("clears the feedback timer on unmount", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    renderBadge();
    await clickCopy();
    expect(vi.getTimerCount()).toBe(1);
    act(() => root.unmount());
    expect(vi.getTimerCount()).toBe(0);
  });
});
