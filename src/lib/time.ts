export function timeAgo(unixSeconds: number): string {
	const s = Math.max(0, Math.floor(Date.now() / 1000 - unixSeconds));
	if (s < 60) return 'just now';
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h`;
	const d = Math.floor(h / 24);
	if (d < 7) return `${d}d`;
	return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: d > 300 ? 'numeric' : undefined
	});
}
