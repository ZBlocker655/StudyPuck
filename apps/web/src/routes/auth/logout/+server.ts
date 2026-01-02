import { redirect } from '@sveltejs/kit';

export async function POST() {
  // POST directly to Auth.js signout
  throw redirect(
    307,
    `/auth/signout?callbackUrl=${encodeURIComponent('/auth/logout/final')}`
  );
}
