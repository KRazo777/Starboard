import { fail, redirect } from '@sveltejs/kit';
import {
	createSession,
	pendingEmail,
	resendCode,
	SIGNUP_COOKIE,
	verifySignup
} from '$lib/server/auth';
import { setSessionCookie, setSignupCookie } from '$lib/server/cookies';
import { sendCodeEmail } from '$lib/server/signup';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, cookies }) => {
	if (locals.user) redirect(303, '/');
	const token = cookies.get(SIGNUP_COOKIE);
	const email = token ? pendingEmail(token) : null;
	if (!email) redirect(303, '/signup');
	return { email };
};

const ERRORS = {
	expired: 'That code expired. Please sign up again.',
	wrong_code: "That code isn't right. Check the email and try again.",
	too_many: 'Too many wrong codes. Please sign up again.',
	username_taken: 'Someone just took that username. Please sign up again with another one.',
	email_taken: 'That email already has an account. Try logging in.'
} as const;

export const actions: Actions = {
	verify: async ({ request, cookies }) => {
		const token = cookies.get(SIGNUP_COOKIE);
		if (!token) redirect(303, '/signup');

		const code = String((await request.formData()).get('code') ?? '');
		const result = verifySignup(token, code);
		if (!result.ok) {
			if (result.reason !== 'wrong_code') cookies.delete(SIGNUP_COOKIE, { path: '/signup' });
			return fail(400, { error: ERRORS[result.reason], restart: result.reason !== 'wrong_code' });
		}

		cookies.delete(SIGNUP_COOKIE, { path: '/signup' });
		const { token: session, expiresAt } = createSession(result.user.id);
		setSessionCookie(cookies, session, expiresAt);
		redirect(303, `/u/${result.user.username}`);
	},

	resend: async ({ cookies }) => {
		const token = cookies.get(SIGNUP_COOKIE);
		const result = token ? resendCode(token) : null;
		if (!result) redirect(303, '/signup');
		if (!result.ok) return fail(429, { error: `Wait ${result.wait}s before asking for another code.` });

		try {
			await sendCodeEmail(result.email, result.code);
		} catch (e) {
			console.error('Sending verification email failed:', e);
			return fail(500, { error: "We couldn't send the email. Try again soon." });
		}
		setSignupCookie(cookies, token!);
		return { resent: true };
	}
};
