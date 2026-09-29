<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '$lib/components/Avatar.svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import { MAX_BIO } from '$lib/limits';

	let { data, form } = $props();
	const profile = $derived(data.profile);

	let editing = $state(false);
	let saving = $state(false);
	let bio = $state('');
	let preview = $state<string | null>(null);
	let removeAvatar = $state(false);

	function startEditing() {
		bio = profile.bio;
		clearPreview();
		removeAvatar = false;
		editing = true;
	}

	function clearPreview() {
		if (preview) URL.revokeObjectURL(preview);
		preview = null;
	}

	function onFile(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		clearPreview();
		if (file) {
			preview = URL.createObjectURL(file);
			removeAvatar = false;
		}
	}

	const joined = $derived(
		new Date(profile.joinedAt * 1000).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
	);
	const pageHref = (p: number) => (p > 1 ? `?page=${p}` : '?');
</script>

<svelte:head><title>@{profile.username} · Starboard</title></svelte:head>

<section class="card profile">
	<Avatar file={profile.avatar} username={profile.username} size={88} />
	<div class="info">
		<h1>@{profile.username}</h1>
		<p class="muted">
			<strong>{profile.postCount}</strong>
			{profile.postCount === 1 ? 'post' : 'posts'} · Joined {joined}
		</p>
		{#if profile.bio}<p class="bio">{profile.bio}</p>{/if}
		{#if data.isMe && !editing}
			<button type="button" class="btn ghost small" onclick={startEditing}>Edit profile</button>
		{/if}
	</div>
</section>

{#if editing}
	<form
		class="card editor"
		method="POST"
		action="?/profile"
		enctype="multipart/form-data"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				await update({ reset: false });
				saving = false;
				if (result.type === 'success') {
					clearPreview();
					editing = false;
				}
			};
		}}
	>
		<h2>Edit profile</h2>
		<div class="photo-row">
			<Avatar
				file={removeAvatar ? null : profile.avatar}
				{preview}
				username={profile.username}
				size={64}
			/>
			<label class="btn ghost small">
				{profile.avatar || preview ? 'Change photo' : 'Add photo'}
				<input
					type="file"
					name="avatar"
					accept="image/jpeg,image/png,image/webp,image/gif"
					onchange={onFile}
					hidden
				/>
			</label>
			{#if (profile.avatar && !removeAvatar) || preview}
				<button
					type="button"
					class="link"
					onclick={() => {
						clearPreview();
						removeAvatar = true;
					}}
				>
					Remove
				</button>
			{/if}
			{#if removeAvatar}<input type="hidden" name="removeAvatar" value="1" />{/if}
		</div>

		<label class="bio-field">
			Bio
			<textarea name="bio" rows="3" maxlength={MAX_BIO} bind:value={bio} placeholder="Say a little about yourself"
			></textarea>
			<span class="count">{bio.length}/{MAX_BIO}</span>
		</label>

		{#if form?.profileError}<p class="error">{form.profileError}</p>{/if}

		<div class="actions">
			<button type="button" class="btn ghost small" onclick={() => (editing = false)}>Cancel</button>
			<button class="btn small" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
		</div>
	</form>
{/if}

{#each data.posts as post (post.id)}
	<PostCard
		{post}
		loggedIn={!!data.user}
		error={form?.postId === post.id ? (form.rateError ?? null) : null}
	/>
{:else}
	<div class="card empty">
		<span class="icon" aria-hidden="true">📷</span>
		<h2>No posts yet</h2>
		{#if data.isMe}
			<p class="muted">Photos you share will show up here.</p>
			<a class="btn small" href="/">Share your first photo</a>
		{:else}
			<p class="muted">When @{profile.username} shares a photo, it'll show up here.</p>
		{/if}
	</div>
{/each}

{#if data.page > 1 || data.hasMore}
	<nav class="pager">
		{#if data.page > 1}<a class="btn ghost small" href={pageHref(data.page - 1)}>← Newer</a>{/if}
		{#if data.hasMore}<a class="btn ghost small" href={pageHref(data.page + 1)}>More →</a>{/if}
	</nav>
{/if}

<style>
	.profile {
		display: flex;
		gap: 1.25rem;
		align-items: flex-start;
		padding: 1.4rem;
	}
	.info {
		min-width: 0;
	}
	h1 {
		margin: 0.2rem 0 0.25rem;
		font-size: 1.4rem;
		overflow-wrap: anywhere;
	}
	.info p {
		margin: 0 0 0.6rem;
	}
	.bio {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		line-height: 1.45;
	}
	.editor h2,
	.empty h2 {
		margin: 0 0 0.9rem;
		font-size: 1.1rem;
	}
	.photo-row {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		margin-bottom: 1rem;
	}
	.bio-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.9rem;
		font-weight: 600;
	}
	textarea {
		font: inherit;
		font-weight: 400;
		padding: 0.6rem 0.75rem;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text);
		resize: vertical;
	}
	textarea:focus {
		outline: 2px solid var(--accent);
		outline-offset: -1px;
	}
	.count {
		align-self: flex-end;
		font-weight: 400;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
		margin-top: 0.8rem;
	}
	.empty {
		text-align: center;
		padding: 2.5rem 1rem;
	}
	.empty .icon {
		font-size: 2rem;
	}
	.empty h2 {
		margin: 0.4rem 0 0.3rem;
	}
	.empty p {
		margin: 0 0 1rem;
	}
	.pager {
		display: flex;
		justify-content: space-between;
		margin: 1rem 0 3rem;
	}
	@media (max-width: 480px) {
		.profile {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}
	}
</style>
