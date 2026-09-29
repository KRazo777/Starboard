<script lang="ts">
	import { enhance } from '$app/forms';
	import MusicPicker from './MusicPicker.svelte';
	import PhotoFrame from './PhotoFrame.svelte';
	import { MAX_CAPTION } from '$lib/limits';
	import { DEFAULT_CLIP_SECONDS } from '$lib/music';
	import type { Song } from '$lib/types';

	let { error = null }: { error?: string | null } = $props();

	let preview = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let pending = $state(false);
	let song = $state<Song | null>(null);
	let start = $state(0);
	let length = $state(DEFAULT_CLIP_SECONDS);
	let caption = $state('');
	let width = $state<number | null>(null);
	let height = $state<number | null>(null);
	let focus = $state(0.5);

	function onFile(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (preview) URL.revokeObjectURL(preview);
		preview = file ? URL.createObjectURL(file) : null;
		width = height = null;
		focus = 0.5;
	}

	function clearImage() {
		if (preview) URL.revokeObjectURL(preview);
		preview = null;
		fileInput.value = '';
	}
</script>

<form
	class="card composer"
	method="POST"
	action="?/post"
	enctype="multipart/form-data"
	use:enhance={() => {
		pending = true;
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success') {
				clearImage();
				caption = '';
				song = null;
				start = 0;
				length = DEFAULT_CLIP_SECONDS;
			}
			pending = false;
		};
	}}
>
	<input
		bind:this={fileInput}
		id="composer-photo"
		type="file"
		name="image"
		accept="image/jpeg,image/png,image/webp,image/gif"
		onchange={onFile}
		hidden
	/>
	{#if preview && width && height}
		<input type="hidden" name="imageWidth" value={width} />
		<input type="hidden" name="imageHeight" value={height} />
		<input type="hidden" name="imageFocus" value={focus} />
	{/if}
	{#if song}
		<input type="hidden" name="musicTrackId" value={song.trackId} />
		<input type="hidden" name="musicStart" value={start} />
		<input type="hidden" name="musicLength" value={length} />
	{/if}

	{#if preview}
		<div class="preview">
			{#key preview}
				<PhotoFrame src={preview} alt="Preview of your photo" bind:width bind:height bind:focus editable />
			{/key}
			<button type="button" class="remove" onclick={clearImage} aria-label="Remove photo">✕</button>
		</div>
		<textarea
			name="caption"
			placeholder="Write a caption…"
			rows="2"
			maxlength={MAX_CAPTION}
			bind:value={caption}
		></textarea>
		{#if caption.length > MAX_CAPTION - 200}
			<p class="count" class:warn={caption.length >= MAX_CAPTION}>
				{caption.length.toLocaleString()}/{MAX_CAPTION.toLocaleString()}
			</p>
		{/if}
		<div class="music">
			<MusicPicker bind:song bind:start bind:length />
		</div>
	{:else}
		<label class="choose" for="composer-photo">
			<span class="icon" aria-hidden="true">📷</span>
			<strong>Post a photo</strong>
			<span class="muted">up to 5 MB</span>
		</label>
	{/if}

	{#if error}<p class="error">{error}</p>{/if}

	{#if preview}
		<div class="row">
			<label class="btn ghost small" for="composer-photo">Change photo</label>
			<button class="btn" disabled={pending}>{pending ? 'Posting…' : 'Post'}</button>
		</div>
	{/if}
</form>

<style>
	.choose {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 2rem 1rem;
		border: 2px dashed var(--border);
		border-radius: 12px;
		cursor: pointer;
		text-align: center;
	}
	.choose:hover {
		border-color: var(--accent);
	}
	.choose .icon {
		font-size: 1.8rem;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border-top: 1px solid var(--border);
		padding-top: 0.75rem;
		margin-top: 0.75rem;
	}
	.preview {
		position: relative;
	}
	textarea {
		display: block;
		width: 100%;
		margin-top: 0.75rem;
		border: none;
		resize: vertical;
		font: inherit;
		font-size: 1rem;
		background: transparent;
		color: var(--text);
		outline: none;
	}
	.count {
		margin: 0;
		text-align: right;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.count.warn {
		color: var(--danger);
	}
	.music {
		margin-top: 0.75rem;
	}
	.remove {
		position: absolute;
		top: 8px;
		left: 8px;
		border: none;
		border-radius: 999px;
		width: 28px;
		height: 28px;
		background: rgb(0 0 0 / 0.65);
		color: white;
		cursor: pointer;
	}
</style>
