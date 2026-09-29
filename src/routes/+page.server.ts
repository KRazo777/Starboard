import { error, fail } from '@sveltejs/kit';
import { MAX_CAPTION } from '$lib/limits';
import { clampClipLength, clampClipStart } from '$lib/music';
import { lookupSong } from '$lib/server/music';
import { createPost, getFeed } from '$lib/server/posts';
import { rateAction } from '$lib/server/rate';
import { saveImage } from '$lib/server/uploads';
import type { PostMusic, SortMode } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;

export const load: PageServerLoad = ({ locals, url }) => {
	const sort: SortMode = url.searchParams.get('sort') === 'new' ? 'new' : 'top';
	const page = Math.max(1, Math.floor(Number(url.searchParams.get('page'))) || 1);

	// Fetch one extra row to know whether there's a next page.
	const posts = getFeed(locals.user?.id ?? null, sort, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE);

	return {
		sort,
		page,
		posts: posts.slice(0, PAGE_SIZE),
		hasMore: posts.length > PAGE_SIZE
	};
};

export const actions: Actions = {
	post: async ({ request, locals }) => {
		if (!locals.user) error(401, 'Log in to post.');

		const form = await request.formData();
		const file = form.get('image');
		const caption = String(form.get('caption') ?? '').trim();
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { postError: 'Choose a photo to post.' });
		if (caption.length > MAX_CAPTION)
			return fail(400, { postError: `Captions are limited to ${MAX_CAPTION.toLocaleString()} characters.` });

		// Music is optional. Check it before saving the photo so a bad song doesn't leave a stray file.
		let music: PostMusic | null = null;
		const trackId = Number(form.get('musicTrackId'));
		if (form.get('musicTrackId')) {
			const song = Number.isSafeInteger(trackId) && trackId > 0 ? await lookupSong(trackId) : null;
			if (!song)
				return fail(400, {
					postError: "Couldn't load that song. Pick it again, or post without music."
				});
			const length = clampClipLength(Number(form.get('musicLength')));
			music = { ...song, start: clampClipStart(Number(form.get('musicStart')), length), length };
		}

		const saved = await saveImage(file);
		if (!saved.ok) return fail(400, { postError: saved.error });

		// Size and position come from the browser; they only affect how this post is framed.
		const size = (v: FormDataEntryValue | null) => {
			const n = Number(v);
			return Number.isInteger(n) && n > 0 && n <= 50_000 ? n : null;
		};
		const width = size(form.get('imageWidth'));
		const height = size(form.get('imageHeight'));
		const focus = Number(form.get('imageFocus'));
		const photo = {
			file: saved.filename,
			width: width && height ? width : null,
			height: width && height ? height : null,
			focus: Number.isFinite(focus) ? Math.min(1, Math.max(0, focus)) : 0.5
		};

		createPost(locals.user.id, photo, caption, music);
		return { posted: true };
	},

	rate: rateAction
};
