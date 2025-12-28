import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ data }) => {
  // Pass session data from the server to the client
  return {
    session: data.session,
  };
};