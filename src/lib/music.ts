export const PREVIEW_SECONDS = 30;
export const MIN_CLIP_SECONDS = 5;
export const MAX_CLIP_SECONDS = 30;
export const DEFAULT_CLIP_SECONDS = 15;

/** A clip length in whole seconds between 5 and 30. */
export function clampClipLength(length: number): number {
	if (!Number.isFinite(length)) return DEFAULT_CLIP_SECONDS;
	return Math.min(MAX_CLIP_SECONDS, Math.max(MIN_CLIP_SECONDS, Math.round(length)));
}

/** Where a clip of `length` seconds may start*/
export function clampClipStart(start: number, length: number, previewSeconds = PREVIEW_SECONDS): number {
	const max = Math.max(0, previewSeconds - length);
	if (!Number.isFinite(start)) return 0;
	return Math.round(Math.min(Math.max(start, 0), max) * 10) / 10;
}

export function formatTime(seconds: number): string {
	const s = Math.max(0, Math.floor(seconds));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Only one clip on the page plays at a time. */
export function pauseOthers(me: HTMLMediaElement) {
	for (const el of document.querySelectorAll('audio')) if (el !== me) el.pause();
}
