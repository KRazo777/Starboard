import { fail, redirect } from '@sveltejs/kit';
import { emailTaken, startSignup, usernameTaken } from '$lib/server/auth';
import { setSignupCookie } from '$lib/server/cookies';
import { sendCodeEmail } from '$lib/server/signup';
import { EMAIL_RE, MAX_EMAIL, passwordProblem, USERNAME_RE } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const keep = { email, username };

		if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL)
			return fail(400, { ...keep, error: 'Enter a valid email address.' });
		if (!USERNAME_RE.test(username))
			return fail(400, { ...keep, error: 'Usernames are 3–20 letters, numbers or underscores.' });
		const problem = passwordProblem(password);
		if (problem) return fail(400, { ...keep, error: problem });
		if (usernameTaken(username))
			return fail(400, { ...keep, error: `@${username} is taken. Try another username.` });
		if (emailTaken(email))
			return fail(400, { ...keep, error: 'That email already has an account. Try logging in.' });

		const { token, code } = startSignup(email, username, password);
		try {
			await sendCodeEmail(email, code);
		} catch (e) {
			console.error('Sending verification email failed:', e);
			return fail(500, { ...keep, error: "We couldn't send the verification email. Try again soon." });
		}
		setSignupCookie(cookies, token);
		redirect(303, '/signup/verify');
	}
};
