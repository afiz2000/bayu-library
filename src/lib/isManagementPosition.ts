// Pure string check with zero dependencies, so it's safe to import from
// both client components and server route handlers. Kept separate from
// permissions.ts, which pulls in session.ts's Node "crypto" usage and would
// otherwise drag a server-only dependency into client bundles.
export function isManagementPosition(position: string): boolean {
  const normalized = position.toLowerCase();
  return normalized.includes("head") || normalized.includes("senior");
}
