import { defaultOptions, type AnalysisOptions } from "./analyze";

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Filter dasbor dari URL (?versi=CD&sampel=semua&longstring=12). */
export function parseOptions(params: Params | URLSearchParams): AnalysisOptions {
  const get = (k: string) => (params instanceof URLSearchParams ? params.get(k) ?? undefined : first(params[k]));
  const versi = get("versi");
  const sampel = get("sampel");
  const ls = Number(get("longstring"));
  return {
    version: versi === "CD" || versi === "DC" ? versi : "all",
    sample: sampel === "semua" ? "all" : "clean",
    longstringThreshold: Number.isInteger(ls) && ls >= 3 && ls <= 53 ? ls : defaultOptions.longstringThreshold,
  };
}

export function optionsToQuery(o: AnalysisOptions): string {
  const q = new URLSearchParams();
  if (o.version !== "all") q.set("versi", o.version);
  if (o.sample === "all") q.set("sampel", "semua");
  if (o.longstringThreshold !== defaultOptions.longstringThreshold) q.set("longstring", String(o.longstringThreshold));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function describeOptions(o: AnalysisOptions): string {
  const version = o.version === "all" ? "semua versi form" : `versi ${o.version}`;
  const sample = o.sample === "clean" ? "sampel bersih" : "semua jawaban";
  return `${sample}, ${version}, ambang longstring ${o.longstringThreshold}`;
}
