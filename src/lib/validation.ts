// Account rules, shared by the server (which enforces them) and the signup form (which shows them live).

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 6;
export const MAX_EMAIL = 254;

export const PASSWORD_RULES = [
	{ label: `At least ${MIN_PASSWORD} characters`, test: (p: string) => p.length >= MIN_PASSWORD },
	{ label: 'At least one symbol, like ! @ # $ %', test: (p: string) => /[^A-Za-z0-9\s]/.test(p) }
];

export function passwordProblem(password: string): string | null {
	if (password.length > 200) return 'Passwords can be at most 200 characters.';
	const failed = PASSWORD_RULES.find((r) => !r.test(password));
	return failed ? `Password needs: ${failed.label.toLowerCase()}.` : null;
}
