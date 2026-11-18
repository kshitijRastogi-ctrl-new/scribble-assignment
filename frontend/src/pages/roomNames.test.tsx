import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateRoomPage } from "./CreateRoomPage";
import { JoinRoomPage } from "./JoinRoomPage";

const { navigate, createRoom, joinRoom } = vi.hoisted(() => ({
  navigate: vi.fn(), createRoom: vi.fn(), joinRoom: vi.fn()
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("../state/roomStore", () => ({ useRoomStore: () => ({ createRoom, joinRoom }) }));

describe.each([
  { name: "Create Room", Page: CreateRoomPage, placeholder: "Sketch captain", request: createRoom },
  { name: "Join Room", Page: JoinRoomPage, placeholder: "Second pencil", request: joinRoom }
])("$name name validation", ({ Page, placeholder, request }) => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<Page />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  function fill(placeholderText: string, value: string) {
    const input = container.querySelector<HTMLInputElement>(`input[placeholder="${placeholderText}"]`)!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  async function submit(name: string) {
    fill(placeholder, name);
    if (placeholder === "Second pencil") fill("ABCD", "ABCD");
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  }

  it("accepts exactly 20 characters after trimming and navigates to the lobby", async () => {
    const name = "a".repeat(20);
    await submit(`  ${name}  `);
    if (placeholder === "Second pencil") expect(request).toHaveBeenCalledWith("ABCD", name);
    else expect(request).toHaveBeenCalledWith(name);
    expect(navigate).toHaveBeenCalledWith("/lobby");
  });

  it("rejects empty and whitespace-only names without navigating", async () => {
    for (const name of ["", "   "]) {
      await submit(name);
      expect(container.textContent).toContain("Name cannot be empty");
      expect(request).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    }
  });

  it("rejects names longer than 20 characters after trimming without navigating", async () => {
    await submit(`  ${"a".repeat(21)}  `);
    expect(container.textContent).toContain("Name must be 20 characters or fewer");
    expect(request).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
