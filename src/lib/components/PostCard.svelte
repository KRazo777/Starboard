<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly } from 'svelte/transition';
	import Avatar from './Avatar.svelte';
	import PhotoFrame from './PhotoFrame.svelte';
	import Stars from './Stars.svelte';
	import { timeAgo } from '$lib/time';
	import { pauseOthers } from '$lib/music';
	import { autoplayBlocked, player } from '$lib/player.svelte';
	import type { FeedPost } from '$lib/types';

	let {
		post,
		loggedIn,
		error = null
	}: { post: FeedPost; loggedIn: boolean; error?: string | null } = $props();

	let selected = $state(0);
	let hover = $state(0);
	let pending = $state(false);
	const lit = $derived(hover || selected);
	const LABELS = ['', 'Bad', 'Meh', 'Okay', 'Good', 'Great'];

	// Music: the post's 15 s clip loops while the post is in the middle of the screen.
	let audio = $state<HTMLAudioElement>();
	let media: HTMLDivElement;
	let paused = $state(true);
	let centered = $state(false);

	function play() {
		if (!audio || !post.music) return;
		const { start, length } = post.music;
		if (audio.currentTime < start || audio.currentTime >= start + length) audio.currentTime = start;
		audio.play().then(
			() => (player.blocked = false),
			(e: DOMException) => {
				if (e.name === 'NotAllowedError') autoplayBlocked(() => centered && player.soundOn && play());
			}
		);
	}

	/** Tapping the song turns sound off (or on) for the whole feed. */
	function toggleSound() {
		player.soundOn = paused;
		if (paused) play();
		else audio?.pause();
	}

	function loopClip() {
		if (!audio || !post.music) return;
		const { start, length } = post.music;
		if (audio.currentTime < start - 0.3 || audio.currentTime >= start + length)
			audio.currentTime = start;
	}

	// A zero-height line across the middle of the viewport: only one post can cross it at a time.
	$effect(() => {
		const el = audio;
		if (!el) return;
		const io = new IntersectionObserver(
			([entry]) => {
				centered = entry.isIntersecting;
				if (centered && player.soundOn) play();
				else el.pause();
			},
			{ rootMargin: '-50% 0px -50% 0px' }
		);
		io.observe(media);
		return () => {
			io.disconnect();
			el.pause();
		};
	});

	// Long captions are cut to a few lines with a "more" button, like Instagram.
	let expanded = $state(false);
	const longCaption = $derived(post.caption.length > 140 || post.caption.split('\n').length > 3);
</script>

<article class="card post">
	<header>
		<a class="author" href="/u/{post.author}">
			<Avatar file={post.authorAvatar} username={post.author} size={28} />
			@{post.author}
		</a>
		<span class="dot">·</span>
		<time datetime={new Date(post.createdAt * 1000).toISOString()}>{timeAgo(post.createdAt)}</time>
	</header>

	<div class="media" bind:this={media}>
		<PhotoFrame
			src="/uploads/{post.image}"
			alt="Photo posted by @{post.author}"
			width={post.imageWidth}
			height={post.imageHeight}
			focus={post.imageFocus}
			lazy
		/>
		{#if post.music}
			<audio
				bind:this={audio}
				src={post.music.previewUrl}
				preload="none"
				loop
				bind:paused
				onplay={() => audio && pauseOthers(audio)}
				ontimeupdate={loopClip}
			></audio>
			<button
				type="button"
				class="song"
				class:playing={!paused}
				onclick={toggleSound}
				aria-label="{paused ? 'Turn sound on' : 'Turn sound off'}: {post.music.title} by {post.music.artist}"
			>
				<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
					<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
					{#if paused}
						<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					{:else}
						<path
							d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					{/if}
				</svg>
				<span class="song-name">
					{#if paused && centered && player.blocked}Tap for sound · {/if}♪ {post.music.title} · {post.music.artist}
				</span>
			</button>
		{/if}
	</div>

	{#if post.caption}
		<p class="caption" class:clamped={longCaption && !expanded}>
			<a class="author" href="/u/{post.author}">@{post.author}</a>
			{post.caption}
		</p>
		{#if longCaption && !expanded}
			<button type="button" class="link more" onclick={() => (expanded = true)}>more</button>
		{/if}
	{/if}

	<footer>
		{#if post.stats}
			<div class="revealed" in:fly={{ y: 6, duration: 250 }}>
				{#if post.stats.average !== null}
					<span class="avg">{post.stats.average.toFixed(1)}</span>
					<Stars value={post.stats.average} />
					<span class="muted">
						{post.stats.count}
						{post.stats.count === 1 ? 'rating' : 'ratings'}
					</span>
				{:else}
					<span class="muted">No ratings yet</span>
				{/if}
				<span class="tag">
					{#if post.isMine}Your post{:else}You gave {post.myStars}★{/if}
				</span>
			</div>
		{:else if loggedIn}
			<form
				class="rate"
				method="POST"
				action="?/rate"
				use:enhance={() => {
					pending = true;
					return async ({ update }) => {
						await update();
						pending = false;
					};
				}}
			>
				<input type="hidden" name="postId" value={post.id} />
				<fieldset class="picker" onmouseleave={() => (hover = 0)}>
					<legend class="sr-only">Your rating</legend>
					{#each [1, 2, 3, 4, 5] as n (n)}
						<label class:lit={n <= lit} onmouseenter={() => (hover = n)}>
							<input class="sr-only" type="radio" name="stars" value={n} bind:group={selected} />
							<span aria-hidden="true">★</span>
							<span class="sr-only">{n} {n === 1 ? 'star' : 'stars'}</span>
						</label>
					{/each}
				</fieldset>
				<span class="hint">{lit ? LABELS[lit] : 'Rate to reveal the score'}</span>
				<button class="btn small" disabled={!selected || pending}>
					{pending ? '…' : 'Rate & reveal'}
				</button>
			</form>
		{:else}
			<span class="muted">🔒 <a href="/login">Log in</a> and rate this post to see its score</span>
		{/if}

		{#if error}<p class="error">{error}</p>{/if}
	</footer>
</article>

<style>
	header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.9rem;
		color: var(--muted);
	}
	.author {
		font-weight: 600;
		color: var(--text);
		text-decoration: none;
	}
	header .author {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.author:hover {
		text-decoration: underline;
	}
	.caption {
		margin: 0.7rem 0 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		line-height: 1.45;
	}
	.caption .author {
		margin-right: 0.3rem;
	}
	.caption.clamped {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
	}
	.more {
		font-size: 0.9rem;
	}
	.media {
		position: relative;
		margin-top: 0.6rem;
	}
	.song {
		position: absolute;
		left: 10px;
		bottom: 10px;
		max-width: calc(100% - 20px);
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.75rem 0.35rem 0.6rem;
		border: none;
		border-radius: 999px;
		background: rgb(0 0 0 / 0.6);
		backdrop-filter: blur(6px);
		color: white;
		font: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
	}
	.song:hover,
	.song.playing {
		background: rgb(0 0 0 / 0.78);
	}
	.song svg {
		flex: none;
	}
	.song-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	footer {
		margin-top: 0.8rem;
		padding-top: 0.7rem;
		border-top: 1px solid var(--border);
		min-height: 2.2rem;
	}
	.revealed {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.avg {
		font-weight: 700;
		font-size: 1.15rem;
	}
	.tag {
		margin-left: auto;
		font-size: 0.8rem;
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
		background: var(--chip);
		color: var(--muted);
	}
	.rate {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.picker {
		border: none;
		margin: 0;
		padding: 0;
		display: flex;
	}
	.picker label {
		cursor: pointer;
		font-size: 1.6rem;
		line-height: 1;
		padding: 0 2px;
		color: var(--star-off);
		transition:
			color 0.1s,
			transform 0.1s;
	}
	.picker label.lit {
		color: var(--star);
	}
	.picker label:hover {
		transform: scale(1.15);
	}
	.picker label:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		border-radius: 4px;
	}
	.hint {
		font-size: 0.9rem;
		color: var(--muted);
		min-width: 9.5rem;
	}
	.rate .btn {
		margin-left: auto;
	}
</style>
