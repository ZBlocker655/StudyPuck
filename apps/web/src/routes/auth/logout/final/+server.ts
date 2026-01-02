import { redirect } from '@sveltejs/kit';

export function GET(event) {
  // Access environment variables through proper Cloudflare types
  const auth0Issuer = (event.platform as any)?.env?.AUTH0_ISSUER || 'https://dev-vgyf81bi1pg20awp.us.auth0.com';
  const auth0ClientId = (event.platform as any)?.env?.AUTH0_CLIENT_ID || '';
  const auth0Domain = new URL(auth0Issuer).host;
  const returnTo = event.url.origin;

  const auth0LogoutUrl = new URL(`https://${auth0Domain}/v2/logout`);
  auth0LogoutUrl.searchParams.set('client_id', auth0ClientId);
  auth0LogoutUrl.searchParams.set('returnTo', returnTo);

  throw redirect(303, auth0LogoutUrl.toString());
}

