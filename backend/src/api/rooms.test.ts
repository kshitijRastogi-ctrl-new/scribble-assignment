import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../app.js";

describe("room name validation API", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server = createApp().listen(0, "127.0.0.1", (error) => error ? reject(error) : resolve());
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  function post(path: string, playerName: string) {
    return fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName })
    });
  }

  it("rejects overlong names on create and join with a 400 and message", async () => {
    const created = await post("/rooms", "Host");
    const { room } = await created.json() as { room: { code: string } };
    for (const path of ["/rooms", `/rooms/${room.code}/join`]) {
      const response = await post(path, `  ${"a".repeat(21)}  `);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Name must be 20 characters or fewer" });
    }
    const snapshot = await fetch(`${baseUrl}/rooms/${room.code}`);
    const data = await snapshot.json() as { room: { participants: unknown[] } };
    expect(data.room.participants).toHaveLength(1);
  });

  it("rejects empty and whitespace-only names on create and join", async () => {
    for (const path of ["/rooms", "/rooms/ABCD/join"]) {
      for (const name of ["", "   "]) {
        const response = await post(path, name);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Name cannot be empty" });
      }
    }
  });

  it("accepts exactly 20 trimmed characters on create and join", async () => {
    const name = "a".repeat(20);
    const created = await post("/rooms", `  ${name}  `);
    expect(created.status).toBe(201);
    const { room } = await created.json() as { room: { code: string; host: string } };
    expect(room.host).toBe(name);
    const joined = await post(`/rooms/${room.code}/join`, ` ${"b".repeat(20)} `);
    expect(joined.status).toBe(200);
  });
});
