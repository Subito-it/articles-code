import config from "../config.js";

// First-match-wins, same mental model as nginx location blocks.
// Add your app's routes here in the right priority order.
const rules = [
  { pattern: /^\/ads/,     app: "app-ads" },
  { pattern: /^\/profile/, app: "app-profile" },
  { pattern: /.*/,         app: "app-search" }, // catch-all
];

export function resolve(req) {
  const pathname = (req.url || "/").split("?")[0];

  for (const rule of rules) {
    if (rule.pattern.test(pathname)) {
      const port = config.apps[rule.app];
      return { app: rule.app, target: `http://127.0.0.1:${port}` };
    }
  }

  return null;
}
