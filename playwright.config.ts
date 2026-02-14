import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:3001",
  },
  webServer: {
    command:
      "APP_MODE=demo DEV_BYPASS_AUTH=true NEXTAUTH_URL=http://127.0.0.1:3001 npm run dev -- -p 3001 -H 127.0.0.1",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: true,
  },
});
