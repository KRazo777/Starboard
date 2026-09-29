import type { Cookies } from '@sveltejs/kit';
import { CODE_MINUTES, SESSION_COOKIE, SIGNUP_COOKIE } from './auth';

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt
		// `secure` is on by default in SvelteKit (except on http://localhost)
	});
}

export function setSignupCookie(cookies: Cookies, token: string) {
	cookies.set(SIGNUP_COOKIE, token, {
		path: '/signup',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: CODE_MINUTES * 60
	});
}
