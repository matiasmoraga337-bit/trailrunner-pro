import { describe, it, expect } from "vitest";
import {
  formatDistancia,
  formatDistanciaKm,
  formatDesnivel,
  formatPeso,
  formatDuration,
  formatRitmo,
  formatVelocidad,
  formatDateISO,
  formatDateCorta,
  formatDateLarga,
} from "@/lib/format";

describe("formatDistancia", () => {
  it("muestra metros si < 1000", () => {
    expect(formatDistancia(500)).toContain("500 m");
    expect(formatDistancia(999)).toContain("999 m");
  });

  it("muestra km si >= 1000", () => {
    expect(formatDistancia(1000)).toContain("1 km");
    expect(formatDistancia(5000)).toContain("5 km");
    expect(formatDistancia(10500)).toContain("10,5 km");
  });
});

describe("formatDistanciaKm", () => {
  it("siempre en km", () => {
    expect(formatDistanciaKm(500)).toContain("0,5 km");
    expect(formatDistanciaKm(42195)).toContain("42,2 km");
  });
});

describe("formatDesnivel", () => {
  it("siempre en m", () => {
    expect(formatDesnivel(1500)).toContain("1.500 m");
    expect(formatDesnivel(0)).toContain("0 m");
  });
});

describe("formatPeso", () => {
  it("en kg", () => {
    expect(formatPeso(70)).toContain("70 kg");
  });
});

describe("formatDuration", () => {
  it("formatea segundos a mm:ss (< 1h)", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("formatea horas (> 1h)", () => {
    expect(formatDuration(3600)).toBe("1h 00m");
    expect(formatDuration(3665)).toBe("1h 01m");
    expect(formatDuration(7200)).toBe("2h 00m");
  });
});

describe("formatRitmo", () => {
  it("convierte s/km a m:ss /km", () => {
    expect(formatRitmo(360)).toBe("6:00 /km");
    expect(formatRitmo(300)).toBe("5:00 /km");
    expect(formatRitmo(0)).toBe("-");
  });

  it("redondea segundos", () => {
    // 362 s/km → 6:02 /km
    expect(formatRitmo(362)).toBe("6:02 /km");
  });
});

describe("formatVelocidad", () => {
  it("convierte m/s a km/h", () => {
    const v = 10 / 3.6; // ~2.78 m/s = 10 km/h
    expect(formatVelocidad(v)).toContain("10 km/h");
  });
});

describe("formatDateISO", () => {
  it("devuelve YYYY-MM-DD", () => {
    expect(formatDateISO("2026-07-04")).toBe("2026-07-04");
    expect(formatDateISO(new Date("2026-01-01"))).toBe("2026-01-01");
  });
});

describe("formatDateCorta", () => {
  it("devuelve dd/mm/aaaa", () => {
    const r = formatDateCorta("2026-07-04T12:00:00Z");
    expect(r).toContain("04");
    expect(r).toContain("07");
    expect(r).toContain("2026");
  });
});

describe("formatDateLarga", () => {
  it("devuelve dia nombre, dia nro, mes nombre", () => {
    const r = formatDateLarga("2026-07-04T12:00:00Z");
    expect(r).toMatch(/sábado|4 de julio/i);
  });
});