/** A song from the music catalog. `previewUrl` is a ~30 s audio clip. */
export type Song = {
	trackId: number;
	title: string;
	artist: string;
	artwork: string;
	previewUrl: string;
};

export type PostMusic = Song & { start: number; length: number };

/** What the browser receives for each post. */
export type FeedPost = {
	id: number;
	image: string;
	imageWidth: number | null; // null on older posts
	imageHeight: number | null;
	imageFocus: number;
	caption: string; // may be empty
	music: PostMusic | null;
	author: string;
	authorAvatar: string | null;
	createdAt: number; // unix seconds
	isMine: boolean;
	myStars: number | null; // what *you* rated it, if you did
	/**
	 * The post's rating. `null` until you've rated it (or if it's your own post).
	 * The server never sends these numbers before that, so they can't be peeked
	 * at in dev tools either.
	 */
	stats: { average: number | null; count: number } | null;
};

export type SortMode = 'top' | 'new';

export type Profile = {
	username: string;
	avatar: string | null;
	bio: string;
	joinedAt: number; // unix seconds
	postCount: number;
};

/** A newly uploaded photo, as stored with its post. */
export type PostPhoto = {
	file: string;
	width: number | null;
	height: number | null;
	focus: number;
};
