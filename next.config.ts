import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pptxgenjs sengaja dibundel: build ESM-nya tidak dapat dimuat langsung oleh Node 24 di Vercel.
  serverExternalPackages: ["@react-pdf/renderer", "exceljs"],
  // Font PDF dibaca dari disk saat runtime; sertakan dalam bundle fungsi.
  outputFileTracingIncludes: { "/api/laporan/[format]": ["./assets/fonts/*.ttf"] },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    // Next.js menyisipkan skrip inline untuk hidrasi; tanpa nonce, 'unsafe-inline' diperlukan,
    // tetapi eval, sumber eksternal, plugin, <base>, dan framing tetap diblokir.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: isProd ? csp : "frame-ancestors 'none'" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Origin-Agent-Cluster", value: "?1" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()" },
        ],
      },
      {
        // Area peneliti dan API: tidak disimpan cache, tidak diindeks, tanpa Referer (token unduhan ada di URL).
        source: "/(peneliti|api)/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, private" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/peneliti",
        headers: [
          { key: "Cache-Control", value: "no-store, private" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
