import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { db } from './db';

export type SessionUser = { id: number; username: string; avatar: string | null };

export const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;

// ---------- passwords (scrypt, built into Node — no extra dependency) ----------

export function hashPassword(password: string): string {
	const salt = randomBytes(16);
	const hash = scryptSync(password, salt, 64);
	return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [saltHex, hashHex] = stored.split(':');
	if (!saltHex || !hashHex) return false;
	const expected = Buffer.from(hashHex, 'hex');
	const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
	return timingSafeEqual(actual, expected);
}

// Used when the username doesn't exist, so login takes the same time either way.
const DUMMY_HASH = hashPassword('not-a-real-password');

// ---------- users ----------

export function usernameTaken(username: string): boolean {
	return !!db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
}

export function emailTaken(email: string): boolean {
	return !!db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
}

/** Log in with either a username or an email address. */
export function checkLogin(login: string, password: string): SessionUser | null {
	const row = db
		.prepare(
			'SELECT id, username, avatar, password_hash FROM users WHERE username = ? OR email = ?'
		)
		.get(login, login.toLowerCase()) as (SessionUser & { password_hash: string }) | undefined;
	if (!row) {
		verifyPassword(password, DUMMY_HASH);
		return null;
	}
	return verifyPassword(password, row.password_hash)
		? { id: row.id, username: row.username, avatar: row.avatar }
		: null;
}

// ---------- email verification ----------
// Sign-up stores the details in pending_signups and emails a 6-digit code.
// The browser gets a random token (cookie) pointing at that row; the user row
// is only created once the right code is entered.

export const SIGNUP_COOKIE = 'signup';
export const CODE_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 60;

const now = () => Math.floor(Date.now() / 1000);
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
const hashCode = (id: string, code: string) =>
	createHash('sha256').update(`${id}:${code}`).digest('hex');

type Pending = {
	id: string;
	email: string;
	username: string;
	password_hash: string;
	code_hash: string;
	attempts: number;
	sent_at: number;
	expires_at: number;
};

/** Starts a sign-up. Returns the cookie token and the code to email. */
export function startSignup(email: string, username: string, password: string) {
	db.prepare('DELETE FROM pending_signups WHERE expires_at < ? OR email = ?').run(now(), email);
	const token = randomBytes(32).toString('base64url');
	const id = hashToken(token);
	const code = newCode();
	db.prepare(
		`INSERT INTO pending_signups (id, email, username, password_hash, code_hash, sent_at, expires_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(id, email, username, hashPassword(password), hashCode(id, code), now(), now() + CODE_MINUTES * 60);
	return { token, code };
}

function getPending(token: string): Pending | null {
	const row = db.prepare('SELECT * FROM pending_signups WHERE id = ?').get(hashToken(token)) as
		| Pending
		| undefined;
	return row && row.expires_at >= now() ? row : null;
}

export function pendingEmail(token: string): string | null {
	return getPending(token)?.email ?? null;
}

export type ResendResult = { ok: true; email: string; code: string } | { ok: false; wait: number } | null;

/** A fresh code (the old one stops working). `null` if the sign-up has expired. */
export function resendCode(token: string): ResendResult {
	const p = getPending(token);
	if (!p) return null;
	const wait = p.sent_at + RESEND_SECONDS - now();
	if (wait > 0) return { ok: false, wait };
	const code = newCode();
	db.prepare(
		'UPDATE pending_signups SET code_hash = ?, attempts = 0, sent_at = ?, expires_at = ? WHERE id = ?'
	).run(hashCode(p.id, code), now(), now() + CODE_MINUTES * 60, p.id);
	return { ok: true, email: p.email, code };
}

export type VerifyResult =
	| { ok: true; user: SessionUser }
	| { ok: false; reason: 'expired' | 'wrong_code' | 'too_many' | 'username_taken' | 'email_taken' };

export const verifySignup = db.transaction((token: string, code: string): VerifyResult => {
	const p = getPending(token);
	if (!p) return { ok: false, reason: 'expired' };

	const expected = Buffer.from(p.code_hash, 'hex');
	const actual = Buffer.from(hashCode(p.id, code.replace(/\D/g, '')), 'hex');
	if (!timingSafeEqual(actual, expected)) {
		if (p.attempts + 1 >= MAX_ATTEMPTS) {
			db.prepare('DELETE FROM pending_signups WHERE id = ?').run(p.id);
			return { ok: false, reason: 'too_many' };
		}
		db.prepare('UPDATE pending_signups SET attempts = attempts + 1 WHERE id = ?').run(p.id);
		return { ok: false, reason: 'wrong_code' };
	}

	db.prepare('DELETE FROM pending_signups WHERE id = ?').run(p.id);
	// Someone may have claimed the name or email while this code was in the inbox.
	if (usernameTaken(p.username)) return { ok: false, reason: 'username_taken' };
	if (emailTaken(p.email)) return { ok: false, reason: 'email_taken' };

	const res = db
		.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
		.run(p.username, p.email, p.password_hash);
	return { ok: true, user: { id: Number(res.lastInsertRowid), username: p.username, avatar: null } };
});

// ---------- sessions ----------
// The cookie holds a random token; the database only stores its sha256,
// so a leaked database can't be used to log in as anyone.

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function createSession(userId: number): { token: string; expiresAt: Date } {
	const token = randomBytes(32).toString('base64url');
	const expires = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
	db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
		hashToken(token),
		userId,
		expires
	);
	return { token, expiresAt: new Date(expires * 1000) };
}

export function getSessionUser(token: string): SessionUser | null {
	const row = db
		.prepare(
			`SELECT u.id, u.username, u.avatar, s.expires_at
			 FROM sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.id = ?`
		)
		.get(hashToken(token)) as (SessionUser & { expires_at: number }) | undefined;
	if (!row) return null;
	if (row.expires_at < Date.now() / 1000) {
		deleteSession(token);
		return null;
	}
	return { id: row.id, username: row.username, avatar: row.avatar };
}

export function deleteSession(token: string): void {
	db.prepare('DELETE FROM sessions WHERE id = ?').run(hashToken(token));
}
