import type { RequestEvent } from '@sveltejs/kit';

type EnvSource = Partial<Record<string, string | undefined>>;
type PlatformWithEnv = { env?: Record<string, string | undefined> };

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
const REMOTE_DEV_HOST_SUFFIXES = ['.app.github.dev', '.githubpreview.dev'];
const INTERNAL_DEV_PORTS = new Set(['4173', '5173', '8788']);

const getPlatformEnv = (event: Pick<RequestEvent, 'platform'>): Record<string, string | undefined> | undefined => {
	const platform = event.platform as PlatformWithEnv | null | undefined;
	return platform?.env;
};

export const isRemoteDevHostname = (hostname: string): boolean =>
	REMOTE_DEV_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));

export const isLocalOrRemoteDevHostname = (hostname: string): boolean =>
	LOCAL_HOSTNAMES.has(hostname) || isRemoteDevHostname(hostname);

const shouldStripPort = (url: URL): boolean =>
	!LOCAL_HOSTNAMES.has(url.hostname) &&
	(url.protocol === 'https:' || isRemoteDevHostname(url.hostname)) &&
	INTERNAL_DEV_PORTS.has(url.port);

const normalizeOrigin = (value: string): string => {
	const url = new URL(value);
	if (shouldStripPort(url)) {
		url.port = '';
	}
	url.pathname = '';
	url.search = '';
	url.hash = '';
	return url.origin;
};

export const getOptionalEnvVar = (
	name: string,
	envSource: EnvSource,
	event?: Pick<RequestEvent, 'platform'>
): string | undefined => {
	const dynamicValue = envSource[name];
	if (dynamicValue) {
		return dynamicValue;
	}

	const platformEnv = event ? getPlatformEnv(event) : undefined;
	return platformEnv?.[name];
};

export const getEnvVar = (
	name: string,
	envSource: EnvSource,
	event?: Pick<RequestEvent, 'platform'>
): string => {
	const value = getOptionalEnvVar(name, envSource, event);
	if (value) {
		return value;
	}

	throw new Error(`Required environment variable ${name} not found`);
};

export const getPublicOrigin = (
	event: Pick<RequestEvent, 'platform' | 'request' | 'url'>,
	envSource: EnvSource
): string => {
	const configuredOrigin =
		getOptionalEnvVar('AUTH_URL', envSource, event) ?? getOptionalEnvVar('ORIGIN', envSource, event);
	if (configuredOrigin) {
		return normalizeOrigin(configuredOrigin);
	}

	const forwardedHost = event.request.headers.get('x-forwarded-host') ?? event.request.headers.get('host');
	const forwardedProto = event.request.headers.get('x-forwarded-proto');

	if (forwardedHost) {
		const protocol = forwardedProto ?? event.url.protocol.replace(/:$/, '');
		return normalizeOrigin(`${protocol}://${forwardedHost}`);
	}

	return normalizeOrigin(event.url.origin);
};

export const getRedirectProxyUrl = (
	event: Pick<RequestEvent, 'platform' | 'request' | 'url'>,
	envSource: EnvSource
): string | undefined => {
	const configuredProxyUrl = getOptionalEnvVar('AUTH_REDIRECT_PROXY_URL', envSource, event);
	if (configuredProxyUrl) {
		return configuredProxyUrl.replace(/\/$/, '');
	}

	const publicOrigin = getPublicOrigin(event, envSource);
	const { hostname } = new URL(publicOrigin);
	if (isRemoteDevHostname(hostname)) {
		return `${publicOrigin}/auth`;
	}

	return undefined;
};

export const normalizeRedirectTarget = ({
	url,
	baseUrl,
	publicOrigin,
}: {
	url: string;
	baseUrl: string;
	publicOrigin: string;
}): string => {
	const normalizedPublicOrigin = normalizeOrigin(publicOrigin);
	const normalizedBaseUrl = normalizeOrigin(baseUrl);

	if (url.startsWith('/')) {
		return `${normalizedPublicOrigin}${url}`;
	}

	try {
		const target = new URL(url);
		const normalizedTargetOrigin = normalizeOrigin(target.origin);
		if (
			normalizedTargetOrigin === normalizedBaseUrl ||
			normalizedTargetOrigin === normalizedPublicOrigin
		) {
			const canonicalOrigin = new URL(normalizedPublicOrigin);
			target.protocol = canonicalOrigin.protocol;
			target.host = canonicalOrigin.host;
			return target.toString();
		}
	} catch {
		return normalizedPublicOrigin;
	}

	return normalizedPublicOrigin;
};
