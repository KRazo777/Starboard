import { db } from './db';
import type { Profile } from '../types';

export function getProfile(username: string): (Profile & { id: number }) | null {
	const row = db
		.prepare(
			`SELECT u.id, u.username, u.avatar, u.bio, u.created_at,
			        (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id AND p.image IS NOT NULL) AS post_count
			 FROM users u WHERE u.username = ?`
		)
		.get(username) as
		| { id: number; username: string; avatar: string | null; bio: string; created_at: number; post_count: number }
		| undefined;
	if (!row) return null;
	return {
		id: row.id,
		username: row.username,
		avatar: row.avatar,
		bio: row.bio,
		joinedAt: row.created_at,
		postCount: row.post_count
	};
}

/** Returns the previous avatar filename so the caller can delete it. */
export function updateProfile(userId: number, bio: string, avatar: string | null): string | null {
	const old = db.prepare('SELECT avatar FROM users WHERE id = ?').get(userId) as { avatar: string | null };
	db.prepare('UPDATE users SET bio = ?, avatar = ? WHERE id = ?').run(bio, avatar, userId);
	return old.avatar !== avatar ? old.avatar : null;
}
