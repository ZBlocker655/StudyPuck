import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from '$lib/auth.js';

export const handle = sequence(authHandle);