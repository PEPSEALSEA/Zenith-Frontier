/**
 * Same Google OAuth Web Client as kanban (`e:/Github2/kanban/lib/googleClientId.ts`).
 * Google Cloud Console → OAuth client → Authorized JavaScript origins must include
 * every frontend host (see root README).
 */
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '787988651964-gf258mnif89bu6g0jao2mpdsm72j96da.apps.googleusercontent.com';
