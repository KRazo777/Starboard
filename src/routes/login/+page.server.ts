import { fail, redirect } from '@sveltejs/kit';
import { checkLogin, createSession } from '$lib/server/auth';
import { setSessionCookie } from '$lib/server/cookies';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const login = String(form.get('login') ?? '').trim();
		const password = String(form.get('password') ?? '');

		const user = checkLogin(login, password);
		if (!user) return fail(400, { login, error: 'Wrong username, email or password.' });

		const { token, expiresAt } = createSession(user.id);
		setSessionCookie(cookies, token, expiresAt);
		redirect(303, '/');
	}
};
