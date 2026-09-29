import { browser } from '$app/environment';

export const player = $state({ soundOn: true, blocked: false });

let retry: (() => void) | null = null;

export function autoplayBlocked(resume: () => void) {
	player.blocked = true;
	retry = resume;
}

if (browser) {
	const unlock = () => {
		if (!player.blocked) return;
		player.blocked = false;
		const resume = retry;
		retry = null;
		resume?.();
	};
	for (const type of ['pointerup', 'keydown']) document.addEventListener(type, unlock, true);
}
