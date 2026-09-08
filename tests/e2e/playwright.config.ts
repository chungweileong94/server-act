import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const repositoryRoot = path.resolve(__dirname, "../..");
const reuseExistingServer = !process.env.CI;

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "nextjs",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3100" },
    },
    {
      name: "react-router",
      use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:3200" },
    },
  ],
  webServer: [
    {
      command: "vp run @examples/nextjs#start",
      cwd: repositoryRoot,
      env: { PORT: "3100" },
      url: "http://127.0.0.1:3100",
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: "vp run @examples/react-router#start",
      cwd: repositoryRoot,
      env: { PORT: "3200" },
      url: "http://127.0.0.1:3200",
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
});
