import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LobbyPage } from "./LobbyPage";

vi.mock("../state/roomStore", () => ({
  useRoomStore: () => ({ fetchRoom: vi.fn(), startGame: vi.fn() }),
  useRoomState: () => ({
    room: { code: "ABCD", host: "Alice", participants: [{ id: "1", name: "Alice", isHost: true }] },
    error: null,
    isLoading: false,
  }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("LobbyPage", () => {
  it("lets the host copy the displayed room code from the lobby", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue("Alice") });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      act(() => root.render(<MemoryRouter><LobbyPage /></MemoryRouter>));
      const badge = container.querySelector(".room-code-badge");
      const button = badge?.querySelector("button");
      expect(badge?.querySelector(".room-code-badge__code")?.textContent).toBe("ABCD");
      expect(button?.textContent).toBe("Copy code");
      await act(async () => button?.click());
      expect(writeText).toHaveBeenCalledWith("ABCD");
      expect(button?.textContent).toBe("Copied");
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});
