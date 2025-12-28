import { signOut } from '$lib/auth';
import { AUTH0_ISSUER, AUTH0_CLIENT_ID } from '$env/static/private';
import { redirect } from '@sveltejs/kit'; // Need redirect helper again

export async function POST(event) {
  const session = await event.locals.auth();

  // Construct the Auth0 logout URL
  const auth0Domain = new URL(AUTH0_ISSUER).host;
  const postLogoutRedirectUri = event.url.origin;
  const auth0LogoutUrl = new URL(`https://${auth0Domain}/v2/logout`);
  auth0LogoutUrl.searchParams.set('returnTo', postLogoutRedirectUri);
  auth0LogoutUrl.searchParams.set('client_id', AUTH0_CLIENT_ID);

  // Add id_token_hint if available in the session
  if (session?.id_token) {
    auth0LogoutUrl.searchParams.set('id_token_hint', session.id_token);
  }

  // Rely on SvelteKitAuth's signOut to perform the redirect to Auth0.
  // This should clear local cookies and redirect the browser directly.
  return await signOut(event, { redirectTo: auth0LogoutUrl.toString(), redirect: true });
}
