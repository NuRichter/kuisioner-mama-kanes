import { defineConfig, devices } from "@playwright/test";

/**
 * Lokal: menjalankan build produksi pada port 3100 (jalankan `npm run build` dulu).
 * Produksi: set BASE_URL=https://... untuk smoke test tanpa server lokal.
 */
const baseURL = process.env.BASE_URL ?? "http://localhost:3100";
const isRemote = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: isRemote ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: isRemote
    ? undefined
    : {
        command: "npx next start -p 3100",
        url: baseURL,
        reuseExistingServer: true,
        env: {
          LOCAL_RESPONSE_STORE: "1",
          RESEARCHER_PASSWORD: "uji-lokal-kata-sandi",
          SESSION_SECRET: "sesi-lokal-hanya-untuk-pengujian-0123456789",
        },
      },
});
