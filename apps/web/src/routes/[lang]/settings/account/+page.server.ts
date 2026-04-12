import { fail, redirect } from '@sveltejs/kit';
import { getDb, updateUser } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import type { Actions } from './$types.js';

export const actions: Actions = {
  default: async (event) => {
    const session = await event.locals.auth();

    if (!session?.user?.id) {
      throw redirect(303, '/');
    }

    const formData = await event.request.formData();
    const displayName = formData.get('displayName')?.toString().trim() ?? '';

    if (displayName.length === 0) {
      return fail(400, {
        displayName,
        errorMessage: 'Display name cannot be empty.',
      });
    }

    if (displayName.length > 80) {
      return fail(400, {
        displayName,
        errorMessage: 'Display name must be 80 characters or fewer.',
      });
    }

    try {
      const database = getDb(env.DATABASE_URL);
      await updateUser(session.user.id, { name: displayName }, database as never);

      return {
        displayName,
        savedDisplayName: displayName,
        successMessage: 'Display name saved.',
      };
    } catch (error) {
      console.error('Failed to update display name:', error);

      return fail(500, {
        displayName,
        errorMessage: 'Display name could not be saved right now.',
      });
    }
  },
};
