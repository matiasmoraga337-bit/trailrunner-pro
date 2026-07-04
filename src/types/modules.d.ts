// Declaraciones de tipos para paquetes sin typedefs.

declare module "fit-decoder" {
  export interface FitRawJson {
    records: unknown[];
    littleEndian?: boolean;
    latestTimestamp?: number | null;
    header?: { dataSize: number };
    [k: string]: unknown;
  }
  export interface FitRecord {
    type?: string;
    data?: Record<string, unknown>;
  }
  export interface FitParsed {
    records: FitRecord[];
    [k: string]: unknown;
  }
  export function fit2json(buffer: ArrayBuffer): FitRawJson;
  export function parseRecords(
    raw: FitRawJson,
    options?: { skipUnknown?: boolean }
  ): FitParsed;
  export function getRecordFieldValue(
    parsed: FitParsed,
    recordType: string,
    field: string
  ): unknown[];
  export function getValueOverTime(
    parsed: FitParsed,
    recordType: string,
    field: string
  ): string[];
  export function getTimeLimits(parsed: FitParsed): {
    minTimestamp: number;
    maxTimestamp: number;
  };
}

declare module "@mapbox/togeojson" {
  import type { FeatureCollection } from "geojson";
  export function gpx(doc: Document, options?: { [k: string]: unknown }): FeatureCollection;
  export function kml(doc: Document, options?: { [k: string]: unknown }): FeatureCollection;
  export function tcx(doc: Document, options?: { [k: string]: unknown }): FeatureCollection;
}