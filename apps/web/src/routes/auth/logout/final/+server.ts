import { redirect } from '@sveltejs/kit';

export function GET(event) {
  const { env } = event.platform;
  const auth0Domain = new URL(env.AUTH0_ISSUER).host;
  const returnTo = event.url.origin;

  const auth0LogoutUrl = new URL(`https://${auth0Domain}/v2/logout`);
  auth0LogoutUrl.searchParams.set('client_id', env.AUTH0_CLIENT_ID);
  auth0LogoutUrl.searchParams.set('returnTo', returnTo);

  throw redirect(303, auth0LogoutUrl.toString());
}

