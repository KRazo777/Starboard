import { error, fail, redirect } from '@sveltejs/kit';
import { MAX_BIO } from '$lib/limits';
import { getFeed } from '$lib/server/posts';
import { getProfile, updateProfile } from '$lib/server/profiles';
import { rateAction } from '$lib/server/rate';
import { deleteImage, saveImage } from '$lib/server/uploads';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;

export const load: PageServerLoad = ({ params, locals, url }) => {
	const found = getProfile(params.username);
	if (!found) error(404, `There's no user called @${params.username}.`);
	// Usernames are case-insensitive; send /u/KEVIN to /u/Kevin.
	if (found.username !== params.username) redirect(308, `/u/${found.username}`);

	const { id, ...profile } = found;
	const page = Math.max(1, Math.floor(Number(url.searchParams.get('page'))) || 1);
	const posts = getFeed(locals.user?.id ?? null, 'new', PAGE_SIZE + 1, (page - 1) * PAGE_SIZE, id);

	return {
		profile,
		isMe: locals.user?.id === id,
		page,
		posts: posts.slice(0, PAGE_SIZE),
		hasMore: posts.length > PAGE_SIZE
	};
};

export const actions: Actions = {
	profile: async ({ request, locals, params }) => {
		if (!locals.user) error(401, 'Log in to edit your profile.');
		if (locals.user.username !== params.username) error(403, 'You can only edit your own profile.');

		const form = await request.formData();
		const bio = String(form.get('bio') ?? '').trim();
		const file = form.get('avatar');
		if (bio.length > MAX_BIO)
			return fail(400, { profileError: `Bios are limited to ${MAX_BIO} characters.` });

		let avatar = form.get('removeAvatar') ? null : locals.user.avatar;
		if (file instanceof File && file.size > 0) {
			const saved = await saveImage(file);
			if (!saved.ok) return fail(400, { profileError: saved.error });
			avatar = saved.filename;
		}

		const replaced = updateProfile(locals.user.id, bio, avatar);
		if (replaced) await deleteImage(replaced);
		return { profileSaved: true };
	},

	rate: rateAction
};
