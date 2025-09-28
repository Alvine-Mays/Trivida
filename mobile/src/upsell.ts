let handler: ((ctx: { screen?: string }) => void) | null = null;

export function registerPremiumRequiredHandler(fn: (ctx: { screen?: string }) => void) {
  handler = fn;
}

export function premiumRequired(ctx: { screen?: string }) {
  try { handler && handler(ctx); } catch {}
}
