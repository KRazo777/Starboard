import { db } from './db';
import { DEFAULT_CLIP_SECONDS } from '../music';
import type { FeedPost, PostMusic, PostPhoto, SortMode } from '../types';

/**
 * How "Top" is ranked.
 *
 * A plain average would put a post with a single 5★ rating above one with
 * two hundred ratings averaging 4.9. So we use a Bayesian average: every post
 * starts as if it already had PRIOR_WEIGHT ratings at the site-wide average,
 * and real ratings pull it up or down from there. With few ratings a post sits
 * near the middle; with many, its score is basically its true average.
 */
const PRIOR_WEIGHT = 5;

type Row = {
	id: number;
	body: string;
	image: string;
	image_width: number | null;
	image_height: number | null;
	image_focus: number;
	music_track_id: number | null;
	music_title: string | null;
	music_artist: string | null;
	music_artwork: string | null;
	music_preview_url: string | null;
	music_start: number | null;
	music_length: number | null;
	created_at: number;
	rating_count: number;
	rating_sum: number;
	user_id: number;
	username: string;
	author_avatar: string | null;
	my_stars: number | null;
};

/** The feed, or only one user's posts when `authorId` is given (their profile). */
export function getFeed(
	viewerId: number | null,
	sort: SortMode,
	limit: number,
	offset: number,
	authorId: number | null = null
): FeedPost[] {
	const order =
		sort === 'new' ? 'p.created_at DESC, p.id DESC' : 'score DESC, p.created_at DESC, p.id DESC';

	const rows = db
		.prepare(
			`WITH site AS (
				SELECT COALESCE(SUM(rating_sum) * 1.0 / NULLIF(SUM(rating_count), 0), 3.0) AS mean
				FROM posts WHERE image IS NOT NULL
			)
			SELECT p.id, p.body, p.image, p.image_width, p.image_height, p.image_focus, p.created_at,
			       p.music_track_id, p.music_title, p.music_artist, p.music_artwork,
			       p.music_preview_url, p.music_start, p.music_length, p.rating_count, p.rating_sum,
			       p.user_id, u.username, u.avatar AS author_avatar, r.stars AS my_stars,
			       (p.rating_sum + ${PRIOR_WEIGHT} * site.mean) / (p.rating_count + ${PRIOR_WEIGHT}) AS score
			FROM posts p
			JOIN users u ON u.id = p.user_id
			CROSS JOIN site
			LEFT JOIN ratings r ON r.post_id = p.id AND r.user_id = @viewer
			WHERE p.image IS NOT NULL -- older text-only posts stay in the database but aren't shown
			  AND (@author IS NULL OR p.user_id = @author)
			ORDER BY ${order}
			LIMIT @limit OFFSET @offset`
		)
		.all({ viewer: viewerId ?? -1, author: authorId, limit, offset }) as Row[];

	return rows.map((row) => toFeedPost(row, viewerId));
}

/** The one place that decides whether a viewer may see a post's rating. */
function toFeedPost(row: Row, viewerId: number | null): FeedPost {
	const isMine = viewerId !== null && row.user_id === viewerId;
	const revealed = isMine || row.my_stars !== null;
	return {
		id: row.id,
		image: row.image,
		imageWidth: row.image_width,
		imageHeight: row.image_height,
		imageFocus: row.image_focus,
		caption: row.body,
		music: row.music_track_id
			? {
					trackId: row.music_track_id,
					title: row.music_title ?? '',
					artist: row.music_artist ?? '',
					artwork: row.music_artwork ?? '',
					previewUrl: row.music_preview_url ?? '',
					start: row.music_start ?? 0,
					length: row.music_length ?? DEFAULT_CLIP_SECONDS
				}
			: null,
		author: row.username,
		authorAvatar: row.author_avatar,
		createdAt: row.created_at,
		isMine,
		myStars: row.my_stars,
		stats: revealed
			? {
					average: row.rating_count ? row.rating_sum / row.rating_count : null,
					count: row.rating_count
				}
			: null
	};
}

export function createPost(
	userId: number,
	photo: PostPhoto,
	caption: string,
	music: PostMusic | null
): number {
	const res = db
		.prepare(
			`INSERT INTO posts (user_id, image, image_width, image_height, image_focus, body,
			                    music_track_id, music_title, music_artist, music_artwork,
			                    music_preview_url, music_start, music_length)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.run(
			userId,
			photo.file,
			photo.width,
			photo.height,
			photo.focus,
			caption,
			music?.trackId ?? null,
			music?.title ?? null,
			music?.artist ?? null,
			music?.artwork ?? null,
			music?.previewUrl ?? null,
			music?.start ?? null,
			music?.length ?? null
		);
	return Number(res.lastInsertRowid);
}

export type RateResult = 'ok' | 'not_found' | 'own_post' | 'already_rated' | 'bad_stars';

/**
 * Ratings are final. If you could change your rating after seeing the average,
 * people would just re-rate to match the crowd, which defeats the blind vote.
 */
export const ratePost = db.transaction((postId: number, userId: number, stars: number): RateResult => {
	if (!Number.isInteger(stars) || stars < 1 || stars > 5) return 'bad_stars';

	const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId) as
		| { user_id: number }
		| undefined;
	if (!post) return 'not_found';
	if (post.user_id === userId) return 'own_post';

	const res = db
		.prepare(
			'INSERT INTO ratings (post_id, user_id, stars) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
		)
		.run(postId, userId, stars);
	if (res.changes === 0) return 'already_rated';

	db.prepare(
		'UPDATE posts SET rating_count = rating_count + 1, rating_sum = rating_sum + ? WHERE id = ?'
	).run(stars, postId);
	return 'ok';
});
