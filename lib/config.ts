export function isDemoMode() {
  if (process.env.APP_MODE) {
    return process.env.APP_MODE.toLowerCase() === "demo";
  }
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) return false;
  return process.env.DEV_BYPASS_AUTH === "true";
}

export function appModeLabel() {
  return isDemoMode() ? "DEMO MODE" : "PRODUCTION";
}
