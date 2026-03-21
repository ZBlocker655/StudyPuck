import { env } from '$env/dynamic/private';
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { getEnvVar, getPublicOrigin } from '$lib/server/public-origin';

export const GET: RequestHandler = (event) => {
	const auth0Issuer = getEnvVar('AUTH0_ISSUER', env, event);
	const auth0ClientId = getEnvVar('AUTH0_CLIENT_ID', env, event);
	const auth0Domain = new URL(auth0Issuer).host;
	const returnTo = getPublicOrigin(event, env);

	const auth0LogoutUrl = new URL(`https://${auth0Domain}/v2/logout`);
	auth0LogoutUrl.searchParams.set('client_id', auth0ClientId);
	auth0LogoutUrl.searchParams.set('returnTo', returnTo);

	throw redirect(303, auth0LogoutUrl.toString());
};
