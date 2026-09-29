import type { Song } from '../types';

/**
 * Songs come from Apple's public iTunes Search API: free, no API key, and every
 * track has a ~30 s preview clip we can play. See
 * https://performance-partners.apple.com/search-api
 */
const API = 'https://itunes.apple.com';
const TIMEOUT_MS = 5000;

type ITunesTrack = {
	trackId?: number;
	trackName?: string;
	artistName?: string;
	artworkUrl100?: string;
	previewUrl?: string;
};

function toSong(t: ITunesTrack): Song | null {
	if (!t.trackId || !t.trackName || !t.artistName || !t.previewUrl) return null;
	return {
		trackId: t.trackId,
		title: t.trackName,
		artist: t.artistName,
		artwork: t.artworkUrl100 ?? '',
		previewUrl: t.previewUrl
	};
}

async function call(path: string, params: Record<string, string>): Promise<Song[]> {
	const res = await fetch(`${API}/${path}?${new URLSearchParams(params)}`, {
		signal: AbortSignal.timeout(TIMEOUT_MS)
	});
	if (!res.ok) throw new Error(`iTunes ${path} failed: ${res.status}`);
	const data = (await res.json()) as { results?: ITunesTrack[] };
	return (data.results ?? []).map(toSong).filter((s): s is Song => s !== null);
}

export function searchSongs(term: string): Promise<Song[]> {
	return call('search', { term, media: 'music', entity: 'song', limit: '20' });
}

/**
 * Posts only store a track id from the browser; the title, artist and audio URL
 * are looked up here so nobody can attach an arbitrary audio URL to a post.
 */
export async function lookupSong(trackId: number): Promise<Song | null> {
	try {
		const [song] = await call('lookup', { id: String(trackId), entity: 'song' });
		return song?.trackId === trackId ? song : null;
	} catch {
		return null;
	}
}
