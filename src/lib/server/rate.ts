import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { ratePost } from './posts';

const RATE_ERRORS = {
	not_found: 'That post no longer exists.',
	own_post: "You can't rate your own post.",
	already_rated: "You've already rated this post.",
	bad_stars: 'Pick between 1 and 5 stars.'
} as const;

/** The `rate` form action, shared by every page that shows posts. */
export async function rateAction({ request, locals }: RequestEvent) {
	if (!locals.user) error(401, 'Log in to rate posts.');

	const form = await request.formData();
	const postId = Number(form.get('postId'));
	const stars = Number(form.get('stars'));

	const result = ratePost(postId, locals.user.id, stars);
	if (result !== 'ok') return fail(400, { rateError: RATE_ERRORS[result], postId });

	// The page's load() re-runs after this and now includes the revealed rating.
	return { rated: postId };
}
