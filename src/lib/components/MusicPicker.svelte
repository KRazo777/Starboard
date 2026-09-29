<script lang="ts">
	import { tick } from 'svelte';
	import {
		DEFAULT_CLIP_SECONDS,
		MAX_CLIP_SECONDS,
		MIN_CLIP_SECONDS,
		PREVIEW_SECONDS,
		clampClipStart,
		formatTime,
		pauseOthers
	} from '$lib/music';
	import type { Song } from '$lib/types';

	let {
		song = $bindable(null),
		start = $bindable(0),
		length = $bindable(DEFAULT_CLIP_SECONDS)
	}: { song?: Song | null; start?: number; length?: number } = $props();

	let searching = $state(false); // is the search panel open?
	let query = $state('');
	let results = $state<Song[]>([]);
	let loading = $state(false);
	let searchError = $state<string | null>(null);

	let audio: HTMLAudioElement;
	let src = $state<string | null>(null);
	let paused = $state(true);
	let currentTime = $state(0);
	let duration = $state(PREVIEW_SECONDS);
	const maxStart = $derived(Math.max(0, duration - length));

	// Debounced search; a newer query cancels the older request.
	$effect(() => {
		const q = query.trim();
		if (!searching || !q) {
			results = [];
			loading = false;
			return;
		}
		loading = true;
		const ctrl = new AbortController();
		const timer = setTimeout(async () => {
			try {
				const res = await fetch(`/api/music?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
				if (!res.ok) throw new Error();
				results = await res.json();
				searchError = null;
			} catch {
				if (ctrl.signal.aborted) return;
				results = [];
				searchError = "Couldn't search music right now.";
			}
			loading = false;
		}, 300);
		return () => {
			clearTimeout(timer);
			ctrl.abort();
		};
	});

	// A detached <audio> keeps playing, so stop it when the picker goes away.
	$effect(() => {
		const el = audio;
		return () => el?.pause();
	});

	async function playFrom(url: string, at: number) {
		if (src !== url) {
			src = url;
			await tick();
		}
		audio.currentTime = at;
		audio.play().catch(() => {});
	}

	function togglePreview(r: Song) {
		if (src === r.previewUrl && !paused) audio.pause();
		else playFrom(r.previewUrl, 0);
	}

	function choose(r: Song) {
		song = r;
		start = 0;
		searching = false;
		playFrom(r.previewUrl, 0);
	}

	function openSearch() {
		audio?.pause();
		searching = true;
	}

	function cancelSearch() {
		audio?.pause();
		searching = false;
	}

	function remove() {
		audio?.pause();
		song = null;
		start = 0;
		length = DEFAULT_CLIP_SECONDS;
	}

	function toggleClip() {
		if (!song) return;
		if (!paused && src === song.previewUrl) audio.pause();
		else playFrom(song.previewUrl, start);
	}

	// Keep the selected clip looping inside its window.
	function onTimeUpdate() {
		if (!song || searching || src !== song.previewUrl) return;
		if (currentTime < start - 0.3 || currentTime >= start + length) audio.currentTime = start;
	}

	/** A longer clip may no longer fit where it starts, so slide it back if needed. */
	function onLengthInput() {
		start = clampClipStart(start, length, duration);
		if (song && paused) playFrom(song.previewUrl, start);
	}

	function onMetadata() {
		if (Number.isFinite(audio.duration) && audio.duration > 0) duration = audio.duration;
		if (song && !searching) start = clampClipStart(start, length, duration);
	}

	// Dragging the clip window along the timeline.
	let track = $state<HTMLDivElement>();
	let grab: number | null = null; // where in the window (seconds) the pointer grabbed it

	function timeAt(e: PointerEvent) {
		const r = track!.getBoundingClientRect();
		return ((e.clientX - r.left) / r.width) * duration;
	}

	function moveTo(s: number) {
		start = clampClipStart(s, length, duration);
		if (song) playFrom(song.previewUrl, start);
	}

	function onPointerDown(e: PointerEvent) {
		track!.setPointerCapture(e.pointerId);
		const t = timeAt(e);
		grab = t >= start && t <= start + length ? t - start : Math.min(length, duration) / 2;
		moveTo(t - grab);
	}

	function onPointerMove(e: PointerEvent) {
		if (grab !== null) moveTo(timeAt(e) - grab);
	}

	function onKeyDown(e: KeyboardEvent) {
		const step = e.shiftKey ? 5 : 1;
		const next = {
			ArrowLeft: start - step,
			ArrowDown: start - step,
			ArrowRight: start + step,
			ArrowUp: start + step,
			Home: 0,
			End: maxStart
		}[e.key];
		if (next === undefined) return;
		e.preventDefault();
		moveTo(next);
	}

	const pct = (s: number) => `${(s / duration) * 100}%`;
</script>

<audio
	bind:this={audio}
	src={src ?? undefined}
	preload="none"
	loop={!!song && !searching}
	bind:paused
	bind:currentTime
	onplay={() => pauseOthers(audio)}
	ontimeupdate={onTimeUpdate}
	onloadedmetadata={onMetadata}
></audio>

{#if searching}
	<div class="search">
		<div class="search-bar">
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="search"
				placeholder="Search songs or artists"
				bind:value={query}
				autofocus
				onkeydown={(e) => e.key === 'Enter' && e.preventDefault()}
			/>
			<button type="button" class="link" onclick={cancelSearch}>Cancel</button>
		</div>

		{#if searchError}
			<p class="error">{searchError}</p>
		{:else if loading && !results.length}
			<p class="muted status">Searching…</p>
		{:else if query.trim() && !results.length}
			<p class="muted status">No songs found.</p>
		{/if}

		<ul class="results">
			{#each results as r (r.trackId)}
				{@const playing = src === r.previewUrl && !paused}
				<li>
					<button type="button" class="pick" onclick={() => choose(r)}>
						<img src={r.artwork} alt="" width="44" height="44" loading="lazy" />
						<span class="meta">
							<span class="title">{r.title}</span>
							<span class="artist">{r.artist}</span>
						</span>
					</button>
					<button
						type="button"
						class="play"
						onclick={() => togglePreview(r)}
						aria-label={playing ? 'Pause preview' : `Preview ${r.title}`}
					>
						{@render icon(playing)}
					</button>
				</li>
			{/each}
		</ul>
	</div>
{:else if song}
	{@const playing = src === song.previewUrl && !paused}
	<div class="chosen">
		<div class="song-row">
			<img src={song.artwork} alt="" width="44" height="44" />
			<span class="meta">
				<span class="title">{song.title}</span>
				<span class="artist">{song.artist}</span>
			</span>
			<button type="button" class="btn ghost small" onclick={openSearch}>Change</button>
			<button type="button" class="play" onclick={remove} aria-label="Remove music">✕</button>
		</div>

		<div class="clip">
			<button
				type="button"
				class="play"
				onclick={toggleClip}
				aria-label={playing ? 'Pause clip' : 'Play clip'}
			>
				{@render icon(playing)}
			</button>
			<div
				class="timeline"
				bind:this={track}
				role="slider"
				tabindex="0"
				aria-label="Choose which part of the song to use"
				aria-valuemin={0}
				aria-valuemax={maxStart}
				aria-valuenow={start}
				aria-valuetext="{formatTime(start)} to {formatTime(Math.min(start + length, duration))}"
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={() => (grab = null)}
				onpointercancel={() => (grab = null)}
				onkeydown={onKeyDown}
			>
				<div class="window" style:left={pct(start)} style:width={pct(Math.min(length, duration - start))}></div>
				{#if playing}<div class="playhead" style:left={pct(currentTime)}></div>{/if}
			</div>
		</div>
		<p class="muted hint">
			 ·{formatTime(start)}–{formatTime(Math.min(start + length, duration))}
		</p>
		<label class="length">
			<span>Length</span>
			<input
				type="range"
				min={MIN_CLIP_SECONDS}
				max={MAX_CLIP_SECONDS}
				step="1"
				bind:value={length}
				oninput={onLengthInput}
			/>
			<span class="length-value">{length}s</span>
		</label>
	</div>
{:else}
	<button type="button" class="btn ghost small" onclick={openSearch}>♪ Add music</button>
{/if}

{#snippet icon(playing: boolean)}
	<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
		{#if playing}
			<path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" />
		{:else}
			<path d="M7 4.5v15l13-7.5z" fill="currentColor" />
		{/if}
	</svg>
{/snippet}

<style>
	.search-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.search-bar input {
		flex: 1;
		min-width: 0;
		font: inherit;
		padding: 0.5rem 0.85rem;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text);
		outline: none;
	}
	.search-bar input:focus {
		border-color: var(--accent);
	}
	.status {
		margin: 0.75rem 0.25rem 0;
	}
	.results {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0;
		max-height: 300px;
		overflow-y: auto;
	}
	.results li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.pick {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.4rem;
		border: none;
		border-radius: 10px;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.pick:hover {
		background: var(--chip);
	}
	img {
		flex: none;
		border-radius: 6px;
		background: var(--chip);
	}
	.meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.title,
	.artist {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.title {
		font-weight: 600;
	}
	.artist {
		font-size: 0.85rem;
		color: var(--muted);
	}
	.play {
		flex: none;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--card);
		color: var(--text);
		cursor: pointer;
	}
	.song-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.clip {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
	.timeline {
		position: relative;
		flex: 1;
		height: 40px;
		border-radius: 8px;
		/* A stand-in waveform */
		background: repeating-linear-gradient(90deg, var(--star-off) 0 3px, transparent 3px 6px) center / 100% 55%
			no-repeat;
		cursor: grab;
		touch-action: none;
		outline: none;
	}
	.timeline:active {
		cursor: grabbing;
	}
	.timeline:focus-visible .window {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent);
	}
	.window {
		position: absolute;
		top: 0;
		bottom: 0;
		border: 2px solid var(--accent);
		border-radius: 8px;
		background: color-mix(in srgb, var(--accent) 18%, transparent);
	}
	.playhead {
		position: absolute;
		top: 4px;
		bottom: 4px;
		width: 2px;
		background: var(--text);
		pointer-events: none;
	}
	.length {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0.5rem 0 0 calc(34px + 0.75rem);
		font-size: 0.85rem;
		font-weight: 600;
	}
	.length input {
		flex: 1;
		min-width: 0;
		accent-color: var(--accent);
	}
	.length-value {
		min-width: 2.2em;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.hint {
		margin: 0.4rem 0 0 calc(34px + 0.75rem);
		font-size: 0.8rem;
	}
</style>
