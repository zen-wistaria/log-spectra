export function getRuntimeConfig() {
  return {
    appName: process.env.APP_NAME ?? "LogSpectra",
    appAuthor: process.env.APP_AUTHOR ?? "Anri",
    appCopyright: process.env.APP_COPYRIGHT ?? "Zen",
    appCopyrightYear: process.env.APP_COPYRIGHT_YEAR ?? "2026",
    appVersion: process.env.APP_VERSION ?? "1.0.0",
    baseUrl: process.env.BASE_URL ?? "http://localhost:3000/",
  };
}

export type RuntimeConfig = ReturnType<typeof getRuntimeConfig>;
