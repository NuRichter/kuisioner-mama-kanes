import type { ReactNode } from "react";
import { fmt } from "@/lib/analytics/stats";

/**
 * Grafik server-rendered (SVG/HTML), tanpa pustaka grafik dan tanpa JS klien.
 * Warna memakai token --viz-* dan --lk-* yang sudah divalidasi (DESIGN.md).
 * Tooltip memakai <title> bawaan; nilai selalu juga tersedia sebagai label/tabel.
 */

export function ChartFrame({ title, note, children, table }: { title: string; note?: ReactNode; children: ReactNode; table?: ReactNode }) {
  return (
    <figure className="grid min-w-0 grid-cols-1 content-start gap-3">
      <figcaption className="grid gap-1">
        <span className="text-[0.9375rem] font-semibold text-ink">{title}</span>
        {note && <span className="text-sm leading-relaxed text-muted">{note}</span>}
      </figcaption>
      {children}
      {table && (
        <details className="group min-w-0 text-sm">
          <summary className="cursor-pointer text-ink-soft underline-offset-4 hover:text-ink hover:underline">Lihat tabel</summary>
          <div className="mt-3 overflow-x-auto">{table}</div>
        </details>
      )}
    </figure>
  );
}

/** Daftar batang horizontal: label, batang, nilai. Satu seri, satu warna. */
export function BarList({ rows, total, max }: { rows: { label: string; count: number }[]; total: number; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="grid gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1">
          <span className="min-w-0 text-sm leading-snug text-ink-soft">{r.label}</span>
          <span className="text-sm text-ink tabular-nums">
            {r.count}
            <span className="ml-1.5 text-muted">{total ? `${fmt((r.count / total) * 100, 0)}%` : ""}</span>
          </span>
          <span className="col-span-2 h-2 overflow-hidden rounded-[2px]" aria-hidden="true">
            <span className="block h-full rounded-r-[4px] bg-viz-1" style={{ width: `${(r.count / top) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

interface HistogramProps {
  bins: { label: string; value: number; highlight?: boolean }[];
  height?: number;
  /** Indeks bin awal dan akhir yang diarsir sebagai rentang acuan. */
  band?: { from: number; to: number; label: string };
  marker?: { at: number; label: string };
  labelEvery?: number;
  unit?: string;
}

export function Histogram({ bins, height = 140, band, marker, labelEvery = 1, unit = "" }: HistogramProps) {
  const w = 600;
  const pad = { top: 18, bottom: 24, left: 4, right: 4 };
  const max = Math.max(1, ...bins.map((b) => b.value));
  const bw = (w - pad.left - pad.right) / Math.max(1, bins.length);
  const ih = height - pad.top - pad.bottom;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" role="img" aria-label="Histogram">
      {band && (
        <g>
          <rect x={pad.left + band.from * bw} y={pad.top - 14} width={(band.to - band.from + 1) * bw} height={ih + 14} className="fill-accent-wash" />
          <text x={pad.left + band.from * bw + 4} y={pad.top - 4} className="fill-ink-soft text-[11px]">{band.label}</text>
        </g>
      )}
      <line x1={pad.left} x2={w - pad.right} y1={pad.top + ih} y2={pad.top + ih} className="stroke-viz-axis" strokeWidth={1} />
      {bins.map((b, i) => {
        const h = (b.value / max) * ih;
        const x = pad.left + i * bw + 1;
        return (
          <g key={b.label}>
            <title>{`${b.label}${unit}: ${b.value}`}</title>
            {h > 0 && <rect x={x} y={pad.top + ih - h} width={Math.max(1, bw - 2)} height={h} rx={Math.min(3, bw / 4)} className={b.highlight ? "fill-viz-2" : "fill-viz-1"} />}
            <rect x={x} y={pad.top} width={Math.max(1, bw - 2)} height={ih} fill="transparent" />
            {i % labelEvery === 0 && (
              <text x={x + bw / 2 - 1} y={height - 8} textAnchor="middle" className="fill-muted text-[11px] tabular-nums">{b.label}</text>
            )}
          </g>
        );
      })}
      {marker && (
        <g>
          <line x1={pad.left + marker.at * bw} x2={pad.left + marker.at * bw} y1={pad.top - 10} y2={pad.top + ih} className="stroke-ink" strokeWidth={1.5} />
          <text x={pad.left + marker.at * bw + 5} y={pad.top - 2} className="fill-ink text-[11px] font-semibold">{marker.label}</text>
        </g>
      )}
    </svg>
  );
}

/** Garis kumulatif dengan garis acuan target (satu sumbu). */
export function CumulativeLine({ points, refs, height = 180 }: { points: { label: string; value: number }[]; refs: { value: number; label: string }[]; height?: number }) {
  const w = 600;
  const pad = { top: 14, bottom: 24, left: 36, right: 12 };
  const max = Math.max(10, ...points.map((p) => p.value), ...refs.map((r) => r.value)) * 1.05;
  const ih = height - pad.top - pad.bottom;
  const iw = w - pad.left - pad.right;
  const x = (i: number) => pad.left + (points.length <= 1 ? iw : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.top + ih - (v / max) * ih;
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points.at(-1);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" role="img" aria-label="Jumlah jawaban kumulatif">
      {refs.map((r) => (
        <g key={r.label}>
          <line x1={pad.left} x2={w - pad.right} y1={y(r.value)} y2={y(r.value)} className="stroke-viz-grid" strokeWidth={1} />
          <text x={pad.left - 6} y={y(r.value) + 4} textAnchor="end" className="fill-muted text-[11px] tabular-nums">{r.value}</text>
          <text x={w - pad.right} y={y(r.value) - 4} textAnchor="end" className="fill-muted text-[11px]">{r.label}</text>
        </g>
      ))}
      <line x1={pad.left} x2={w - pad.right} y1={pad.top + ih} y2={pad.top + ih} className="stroke-viz-axis" />
      {points.length > 0 && <path d={d} fill="none" className="stroke-viz-1" strokeWidth={2} strokeLinejoin="round" />}
      {points.map((p, i) => (
        <g key={p.label}>
          <title>{`${p.label}: ${p.value} jawaban`}</title>
          <circle cx={x(i)} cy={y(p.value)} r={10} fill="transparent" />
        </g>
      ))}
      {last && (
        <g>
          <circle cx={x(points.length - 1)} cy={y(last.value)} r={4.5} className="fill-viz-1 stroke-surface" strokeWidth={2} />
          <text x={x(points.length - 1) - 8} y={y(last.value) - 10} textAnchor="end" className="fill-ink text-[12px] font-semibold tabular-nums">{last.value}</text>
        </g>
      )}
      {points.length > 0 && (
        <>
          <text x={pad.left} y={height - 8} className="fill-muted text-[11px] tabular-nums">{points[0].label}</text>
          <text x={w - pad.right} y={height - 8} textAnchor="end" className="fill-muted text-[11px] tabular-nums">{last!.label}</text>
        </>
      )}
    </svg>
  );
}

/** Batang Likert 1 sampai 5 bertumpuk (skala divergen), dengan celah 2px. */
export function LikertBar({ dist, label }: { dist: number[]; label: string }) {
  const total = dist.reduce((a, b) => a + b, 0) || 1;
  return (
    <span className="flex h-3 w-full gap-[2px]" role="img" aria-label={`${label}: ${dist.map((v, i) => `${i + 1}=${v}`).join(", ")}`}>
      {dist.map((v, i) =>
        v > 0 ? (
          <span
            key={i}
            title={`Skor ${i + 1}: ${v} (${fmt((v / total) * 100, 0)}%)`}
            className={`h-full ${i === 0 ? "rounded-l-[3px]" : ""} ${i === 4 ? "rounded-r-[3px]" : ""}`}
            style={{ width: `${(v / total) * 100}%`, background: `var(--lk-${i + 1})` }}
          />
        ) : null,
      )}
    </span>
  );
}

export function LikertLegend() {
  const labels = ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-soft">
      {labels.map((l, i) => (
        <li key={l} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ background: `var(--lk-${i + 1})` }} />
          {i + 1} {l}
        </li>
      ))}
    </ul>
  );
}

/** Rata-rata pada penggaris 1 sampai 5 dengan kumis ±1 SD. */
export function MeanRuler({ mean, sd }: { mean: number; sd: number }) {
  if (!Number.isFinite(mean)) return <span className="text-sm text-muted">-</span>;
  const pos = (v: number) => `${((Math.min(5, Math.max(1, v)) - 1) / 4) * 100}%`;
  const lo = Number.isFinite(sd) ? mean - sd : mean;
  const hi = Number.isFinite(sd) ? mean + sd : mean;
  return (
    <span className="relative block h-5 w-full" role="img" aria-label={`Rata-rata ${fmt(mean)}, SD ${fmt(sd)}`} title={`Rata-rata ${fmt(mean)} · SD ${fmt(sd)}`}>
      <span className="absolute inset-x-0 top-1/2 h-px bg-viz-axis" aria-hidden="true" />
      {[1, 2, 3, 4, 5].map((t) => (
        <span key={t} className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-viz-axis" style={{ left: pos(t) }} aria-hidden="true" />
      ))}
      <span className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-viz-1/35" style={{ left: pos(lo), right: `calc(100% - ${pos(hi)})` }} aria-hidden="true" />
      <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-viz-1" style={{ left: pos(mean) }} aria-hidden="true" />
    </span>
  );
}

/** Jitter deterministik agar titik pada skala diskret tidak menumpuk. */
function jitter(i: number, salt: number) {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return (s - Math.floor(s) - 0.5) * 0.12;
}

interface ScatterProps {
  points: { x: number; y: number }[];
  xLabel: string;
  yLabel: string;
  diagonal?: boolean;
  quadrantAt?: number;
  quadrantLabels?: { tl: string; tr: string; bl: string; br: string };
}

/** Sebar 1 sampai 5 pada kedua sumbu. */
export function Scatter({ points, xLabel, yLabel, diagonal, quadrantAt, quadrantLabels }: ScatterProps) {
  const size = 420;
  const pad = { top: 16, right: 16, bottom: 40, left: 44 };
  const iw = size - pad.left - pad.right;
  const ih = size - pad.top - pad.bottom;
  const sx = (v: number) => pad.left + ((v - 1) / 4) * iw;
  const sy = (v: number) => pad.top + ih - ((v - 1) / 4) * ih;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[30rem]" role="img" aria-label={`${xLabel} terhadap ${yLabel}`}>
      {[1, 2, 3, 4, 5].map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={pad.top} y2={pad.top + ih} className="stroke-viz-grid" />
          <line x1={pad.left} x2={pad.left + iw} y1={sy(t)} y2={sy(t)} className="stroke-viz-grid" />
          <text x={sx(t)} y={pad.top + ih + 16} textAnchor="middle" className="fill-muted text-[11px] tabular-nums">{t}</text>
          <text x={pad.left - 10} y={sy(t) + 4} textAnchor="end" className="fill-muted text-[11px] tabular-nums">{t}</text>
        </g>
      ))}
      {quadrantAt !== undefined && (
        <g>
          <line x1={sx(quadrantAt)} x2={sx(quadrantAt)} y1={pad.top} y2={pad.top + ih} className="stroke-ink-soft" strokeWidth={1} />
          <line x1={pad.left} x2={pad.left + iw} y1={sy(quadrantAt)} y2={sy(quadrantAt)} className="stroke-ink-soft" strokeWidth={1} />
          {quadrantLabels && (
            <g className="fill-ink-soft text-[11px] font-medium">
              <text x={pad.left + 6} y={pad.top + 14}>{quadrantLabels.tl}</text>
              <text x={pad.left + iw - 6} y={pad.top + 14} textAnchor="end">{quadrantLabels.tr}</text>
              <text x={pad.left + 6} y={pad.top + ih - 8}>{quadrantLabels.bl}</text>
              <text x={pad.left + iw - 6} y={pad.top + ih - 8} textAnchor="end">{quadrantLabels.br}</text>
            </g>
          )}
        </g>
      )}
      {diagonal && <line x1={sx(1)} y1={sy(1)} x2={sx(5)} y2={sy(5)} className="stroke-ink-soft" strokeWidth={1} />}
      <g className="fill-viz-1" fillOpacity={0.55}>
        {points.map((p, i) => (
          <circle key={i} cx={sx(p.x + jitter(i, 1))} cy={sy(p.y + jitter(i, 2))} r={3.2}>
            <title>{`${xLabel} ${fmt(p.x)}, ${yLabel} ${fmt(p.y)}`}</title>
          </circle>
        ))}
      </g>
      <text x={pad.left + iw / 2} y={size - 6} textAnchor="middle" className="fill-ink-soft text-[12px] font-medium">{xLabel}</text>
      <text transform={`translate(12 ${pad.top + ih / 2}) rotate(-90)`} textAnchor="middle" className="fill-ink-soft text-[12px] font-medium">{yLabel}</text>
    </svg>
  );
}

/** Matriks panas: divergen untuk korelasi, satu arah untuk HTMT dengan ambang. */
export function Heatmap({
  labels,
  values,
  mode,
  threshold,
}: {
  labels: string[];
  values: number[][];
  mode: "diverging" | "sequential";
  threshold?: number;
}) {
  const cell = (v: number) => {
    if (!Number.isFinite(v)) return { background: "transparent" };
    const strength = Math.min(1, Math.abs(v));
    const tone = mode === "diverging" && v < 0 ? "var(--lk-1)" : "var(--lk-5)";
    return {
      background: `color-mix(in oklab, ${tone} ${Math.round(strength * 85)}%, var(--surface))`,
      color: strength > 0.55 ? "var(--accent-ink)" : "var(--ink)",
    };
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-separate border-spacing-[2px] text-[0.8125rem]">
        <thead>
          <tr>
            <th className="w-[9.5rem]"><span className="sr-only">Konstruk</span></th>
            {labels.map((l) => (
              <th key={l} scope="col" className="relative h-28 w-[3.25rem] min-w-[2.75rem] p-0 font-medium text-muted">
                {/* Label diputar diposisikan absolut agar tidak melebarkan kolom. */}
                <span className="absolute bottom-1.5 left-1/2 origin-bottom-left -rotate-45 text-xs whitespace-nowrap">{l}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((row, i) => (
            <tr key={row}>
              <th scope="row" className="truncate pr-2 text-left font-medium text-ink-soft">{row}</th>
              {labels.map((col, j) => {
                const v = values[i][j];
                const lower = j < i;
                const over = lower && threshold !== undefined && Number.isFinite(v) && v >= threshold;
                return (
                  <td
                    key={col}
                    title={`${row} × ${col}: ${fmt(v)}`}
                    className={`h-9 rounded-[3px] text-center tabular-nums ${over ? "outline-2 -outline-offset-2 outline-danger" : ""}`}
                    style={lower ? cell(v) : undefined}
                  >
                    {lower ? fmt(v) : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
