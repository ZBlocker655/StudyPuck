import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: "http://localhost:5173", // Will be updated for production
});

export { authClient as auth };