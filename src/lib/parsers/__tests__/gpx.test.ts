import { describe, it, expect } from "vitest";
import { parseGpx } from "@/lib/parsers/gpx";

const GPX_MINIMAL = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <trk>
    <name>Test Trail</name>
    <trkseg>
      <trkpt lat="0.000" lon="0.000">
        <ele>0</ele>
        <time>2026-07-04T08:00:00Z</time>
      </trkpt>
      <trkpt lat="0.001" lon="0.000">
        <ele>50</ele>
        <time>2026-07-04T08:05:00Z</time>
      </trkpt>
      <trkpt lat="0.002" lon="0.000">
        <ele>120</ele>
        <time>2026-07-04T08:12:00Z</time>
      </trkpt>
      <trkpt lat="0.003" lon="0.000">
        <ele>100</ele>
        <time>2026-07-04T08:18:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

const GPX_CON_FC = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <trk>
    <trkseg>
      <trkpt lat="0.0" lon="0.0">
        <ele>10</ele>
        <time>2026-07-04T08:00:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
            <gpxtpx:hr>140</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
      <trkpt lat="0.001" lon="0.0">
        <ele>60</ele>
        <time>2026-07-04T08:05:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
            <gpxtpx:hr>160</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe("parseGpx", () => {
  it("parsea un GPX valido y extrae distancia, D+, D- y fecha", () => {
    const r = parseGpx(GPX_MINIMAL);
    expect(r).not.toBeNull();
    expect(r!.titulo).toBe("Test Trail");
    expect(r!.deporte).toBe("trail"); // D+ 120 > 100
    expect(r!.fecha).toBe("2026-07-04");
    expect(r!.duracionSeg).toBeGreaterThan(0);
    expect(r!.distanciaM).toBeGreaterThan(300);
    expect(r!.desnivelPosM).toBe(120);
    expect(r!.desnivelNegM).toBe(20);
    expect(r!.traza.length).toBe(4);
  });

  it("detecta running si D+ < 100", () => {
    const gpxPlano = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="0.0" lon="0.0"><ele>10</ele></trkpt>
    <trkpt lat="0.001" lon="0.0"><ele>12</ele></trkpt>
  </trkseg></trk>
</gpx>`;
    const r = parseGpx(gpxPlano);
    expect(r!.deporte).toBe("running");
  });

  it("extrae FC de extensiones Garmin", () => {
    const r = parseGpx(GPX_CON_FC);
    expect(r).not.toBeNull();
    expect(r!.fcMedia).toBe(150);
    expect(r!.fcMax).toBe(160);
  });

  it("lanza error con XML invalido", () => {
    expect(() => parseGpx("<notgpx>")).toThrow();
  });

  it("devuelve null si no hay trkpt", () => {
    const gpxVacio = `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg></trkseg></trk></gpx>`;
    expect(parseGpx(gpxVacio)).toBeNull();
  });

  it("acepta Document como entrada", () => {
    const doc = new DOMParser().parseFromString(GPX_MINIMAL, "application/xml");
    const r = parseGpx(doc);
    expect(r).not.toBeNull();
    expect(r!.titulo).toBe("Test Trail");
  });
});