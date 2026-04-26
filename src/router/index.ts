import type { App } from "@slack/bolt";

export type RouteRegistrar = (app: App) => void;

/**
 * Compose multiple registrars into one. Use this to keep events / actions /
 * messages handlers in separate files while wiring them up at boot:
 *
 * ```ts
 * registerRoutes: composeRoutes(events, actions, messages),
 * ```
 */
export function composeRoutes(...registrars: RouteRegistrar[]): RouteRegistrar {
  return (app) => {
    for (const r of registrars) r(app);
  };
}
