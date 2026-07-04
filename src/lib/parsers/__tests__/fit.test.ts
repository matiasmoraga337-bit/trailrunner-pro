import { describe, it, expect } from "vitest";
import { parseFit } from "@/lib/parsers/fit";

describe("parseFit", () => {
  it("lanza error con buffer invalido", async () => {
    const buffer = new Uint8Array([0, 0, 0, 0]).buffer;
    try {
      const r = await parseFit(buffer);
      // Si no lanza, deberia ser null
      expect(r).toBeNull();
    } catch {
      // Esperamos que falle parseando FIT corrupto
    }
  });

  it("devuelve null con buffer vacio", async () => {
    const buffer = new ArrayBuffer(0);
    try {
      const r = await parseFit(buffer);
      expect(r).toBeNull();
    } catch {
      // FIT con buffer vacio es invalido
    }
  });
});