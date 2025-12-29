import { redirect } from '@sveltejs/kit';
import { AUTH0_ISSUER, AUTH0_CLIENT_ID } from '$env/static/private';

export function GET(event) {
  const auth0Domain = new URL(AUTH0_ISSUER).host;
  const returnTo = event.url.origin;

  const auth0LogoutUrl = new URL(`https://${auth0Domain}/v2/logout`);
  auth0LogoutUrl.searchParams.set('client_id', AUTH0_CLIENT_ID);
  auth0LogoutUrl.searchParams.set('returnTo', returnTo);

  throw redirect(303, auth0LogoutUrl.toString());
}
