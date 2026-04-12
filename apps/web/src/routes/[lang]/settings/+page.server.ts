import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
  throw redirect(303, `/${event.params.lang}/settings/account`);
};
