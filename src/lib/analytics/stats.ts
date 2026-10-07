/** Statistik dasar yang deterministik dan bebas dependensi. */

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/** Varians sampel (pembagi n - 1). */
export function variance(xs: readonly number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return s / (xs.length - 1);
}

export function sd(xs: readonly number[]): number {
  return Math.sqrt(variance(xs));
}

export function quantile(xs: readonly number[], q: number): number {
  if (xs.length === 0) return NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export const median = (xs: readonly number[]) => quantile(xs, 0.5);

export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return NaN;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return NaN;
  return sxy / Math.sqrt(sxx * syy);
}

/**
 * Cronbach's alpha untuk matriks responden x butir.
 * alpha = k/(k-1) * (1 - sum(var butir) / var(total)).
 */
export function cronbachAlpha(rows: readonly (readonly number[])[]): number {
  const k = rows[0]?.length ?? 0;
  if (k < 2 || rows.length < 2) return NaN;
  const itemVars = Array.from({ length: k }, (_, j) => variance(rows.map((r) => r[j])));
  const totalVar = variance(rows.map((r) => r.reduce((a, b) => a + b, 0)));
  if (!(totalVar > 0)) return NaN;
  return (k / (k - 1)) * (1 - itemVars.reduce((a, b) => a + b, 0) / totalVar);
}

/** Korelasi butir-total terkoreksi (butir dikeluarkan dari total). */
export function correctedItemTotal(rows: readonly (readonly number[])[]): number[] {
  const k = rows[0]?.length ?? 0;
  return Array.from({ length: k }, (_, j) => {
    const item = rows.map((r) => r[j]);
    const rest = rows.map((r) => r.reduce((a, b, idx) => (idx === j ? a : a + b), 0));
    return pearson(item, rest);
  });
}

/** Alpha bila butir j dihapus. */
export function alphaIfDeleted(rows: readonly (readonly number[])[]): number[] {
  const k = rows[0]?.length ?? 0;
  if (k < 3) return Array.from({ length: k }, () => NaN);
  return Array.from({ length: k }, (_, j) => cronbachAlpha(rows.map((r) => r.filter((_, idx) => idx !== j))));
}

// --- Distribusi t (via fungsi beta tak lengkap teregularisasi) ---

function logGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const v of c) ser += v / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

export function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betaContinuedFraction(a, b, x)) / a : 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** p dua sisi untuk statistik t dengan derajat bebas df. */
export function tTwoTailedP(t: number, df: number): number {
  if (!Number.isFinite(t) || !(df > 0)) return NaN;
  return regularizedBeta(df / (df + t * t), df / 2, 0.5);
}

export interface TTest {
  t: number;
  df: number;
  p: number;
  diff: number;
  /** Cohen's d (pooled SD untuk dua kelompok, SD selisih untuk berpasangan). */
  d: number;
}

export function welchT(a: readonly number[], b: readonly number[]): TTest {
  const na = a.length;
  const nb = b.length;
  const va = variance(a);
  const vb = variance(b);
  const diff = mean(a) - mean(b);
  const se = Math.sqrt(va / na + vb / nb);
  const t = diff / se;
  const df = (va / na + vb / nb) ** 2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1));
  const pooled = Math.sqrt(((na - 1) * va + (nb - 1) * vb) / (na + nb - 2));
  return { t, df, p: tTwoTailedP(t, df), diff, d: diff / pooled };
}

export function pairedT(a: readonly number[], b: readonly number[]): TTest {
  const diffs = a.map((x, i) => x - b[i]);
  const n = diffs.length;
  const m = mean(diffs);
  const s = sd(diffs);
  const t = m / (s / Math.sqrt(n));
  return { t, df: n - 1, p: tTwoTailedP(t, n - 1), diff: m, d: m / s };
}

/** Pembulatan ala Indonesia: koma desimal. */
export function fmt(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export function fmtP(p: number): string {
  if (!Number.isFinite(p)) return "-";
  if (p < 0.001) return "< 0,001";
  return fmt(p, 3);
}

export function pct(part: number, whole: number, digits = 0): string {
  if (!whole) return "-";
  return `${fmt((part / whole) * 100, digits)}%`;
}

/** "p < 0,001" atau "p = 0,023". */
export function pLabel(p: number): string {
  const v = fmtP(p);
  return v.startsWith("<") ? `p ${v}` : `p = ${v}`;
}
