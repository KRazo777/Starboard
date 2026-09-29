import { error } from '@sveltejs/kit';
import { CONTENT_TYPES, readImage } from '$lib/server/uploads';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const data = await readImage(params.file);
	if (!data) error(404, 'Not found');

	const ext = params.file.split('.').pop()!;
	return new Response(new Uint8Array(data), {
		headers: {
			'Content-Type': CONTENT_TYPES[ext],
			'Cache-Control': 'public, max-age=31536000, immutable', // filenames are random and never reused
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
