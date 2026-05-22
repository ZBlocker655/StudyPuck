import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ data }) => {
  // Pass session data from the server to the client
  return {
    session: data.session,
    isE2ETestMode: data.isE2ETestMode,
    authError: data.authError,
  };
};
