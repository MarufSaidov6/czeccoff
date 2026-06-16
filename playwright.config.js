// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Сервим реальный апп из корня репо (тот же код, что на проде).
const PORT = 8137;

module.exports = defineConfig({
  testDir: './tests-e2e',
  fullyParallel: false, // делят localStorage/Supabase — гоняем последовательно
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: `python3 -m http.server ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
