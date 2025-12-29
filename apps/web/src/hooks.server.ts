import { createAuth } from '$lib/auth';
import { PrivateEnv } from '$lib/schemas/auth';

export const handle = async ({ event, resolve }) => {
  const env = PrivateEnv.parse(event.platform?.env);
  const { handle } = createAuth(env);
  return handle({ event, resolve });
};