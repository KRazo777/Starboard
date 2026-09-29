import { error, json } from '@sveltejs/kit';
import { searchSongs } from '$lib/server/music';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) error(401, 'Log in to search music.');

	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	if (!q) return json([]);

	let songs;
	try {
		songs = await searchSongs(q);
	} catch {
		error(502, "Couldn't reach the music catalog. Try again in a moment.");
	}
	return json(songs, { headers: { 'Cache-Control': 'private, max-age=300' } });
};
