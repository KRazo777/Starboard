import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DATABASE_PATH ?? 'data/app.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
	id            INTEGER PRIMARY KEY,
	username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
	password_hash TEXT    NOT NULL,
	created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sessions (
	id         TEXT    PRIMARY KEY,            -- sha256 of the cookie token
	user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
	id           INTEGER PRIMARY KEY,
	user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	body         TEXT    NOT NULL DEFAULT '',   -- the caption (old posts may be text-only; the feed hides those)
	image        TEXT,                          -- filename inside /uploads (NULL only on old text posts)
	rating_count INTEGER NOT NULL DEFAULT 0,    -- kept in sync with the ratings table
	rating_sum   INTEGER NOT NULL DEFAULT 0,
	created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
	CHECK (length(body) > 0 OR image IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

CREATE TABLE IF NOT EXISTS ratings (
	post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
	user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	stars      INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	PRIMARY KEY (post_id, user_id)
);

-- Sign-ups waiting for their email code. The account is only created once the code checks out.
CREATE TABLE IF NOT EXISTS pending_signups (
	id            TEXT    PRIMARY KEY,         -- sha256 of the token in the signup cookie
	email         TEXT    NOT NULL,
	username      TEXT    NOT NULL,
	password_hash TEXT    NOT NULL,
	code_hash     TEXT    NOT NULL,
	attempts      INTEGER NOT NULL DEFAULT 0,
	sent_at       INTEGER NOT NULL,
	expires_at    INTEGER NOT NULL
);
`);

// Columns added after the first release. SQLite has no ADD COLUMN IF NOT EXISTS, so check first.
function addColumns(table: string, columns: Record<string, string>) {
	const existing = new Set(
		(db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
	);
	for (const [name, type] of Object.entries(columns)) {
		if (!existing.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
	}
}

addColumns('posts', {
	music_track_id: 'INTEGER', // iTunes track id, or NULL for no music
	music_title: 'TEXT',
	music_artist: 'TEXT',
	music_artwork: 'TEXT',
	music_preview_url: 'TEXT',
	music_start: 'REAL', // seconds into the preview where the clip starts
	music_length: 'REAL', // clip length in seconds (5–30); NULL on older posts, which used 15
	image_width: 'INTEGER', // the photo's pixel size, so the feed can size it before it loads
	image_height: 'INTEGER',
	image_focus: 'REAL NOT NULL DEFAULT 0.5' // which part stays in view when a very tall/wide photo is cropped (0–1)
});

addColumns('users', {
	email: 'TEXT', // lowercased; NULL only for accounts made before email was required
	avatar: 'TEXT', // filename inside /uploads, or NULL
	bio: "TEXT NOT NULL DEFAULT ''"
});
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)');
