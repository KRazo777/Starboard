<script lang="ts">
	import Composer from '$lib/components/Composer.svelte';
	import PostCard from '$lib/components/PostCard.svelte';

	let { data, form } = $props();

	const pageHref = (p: number) => `?sort=${data.sort}${p > 1 ? `&page=${p}` : ''}`;
</script>

<svelte:head><title>Starboard</title></svelte:head>

{#if data.user}
	<Composer error={form?.postError ?? null} />
{:else}
	<div class="card intro">
		<h1>Rate first. Then see.</h1>
		<p>
			Every post is scored 1–5 stars, but a post's score stays hidden until you've rated it yourself.
			No bandwagons.
		</p>
		<a class="btn" href="/signup">Join Starboard</a>
	</div>
{/if}

<div class="tabs" role="tablist">
	<a href="?sort=top" role="tab" aria-selected={data.sort === 'top'} class:active={data.sort === 'top'}>
		Explore
	</a>
	<a href="?sort=new" role="tab" aria-selected={data.sort === 'new'} class:active={data.sort === 'new'}>
		Newest
	</a>
</div>

{#each data.posts as post (post.id)}
	<PostCard
		{post}
		loggedIn={!!data.user}
		error={form?.postId === post.id ? (form.rateError ?? null) : null}
	/>
{:else}
	<p class="empty">No posts yet. {data.user ? 'Be the first!' : ''}</p>
{/each}

{#if data.page > 1 || data.hasMore}
	<nav class="pager">
		{#if data.page > 1}<a class="btn ghost small" href={pageHref(data.page - 1)}>← Newer</a>{/if}
		{#if data.hasMore}<a class="btn ghost small" href={pageHref(data.page + 1)}>More →</a>{/if}
	</nav>
{/if}

<style>
	.intro h1 {
		margin: 0 0 0.4rem;
		font-size: 1.5rem;
	}
	.intro p {
		margin: 0 0 1rem;
		color: var(--muted);
		line-height: 1.5;
	}
	.tabs {
		display: flex;
		gap: 0.25rem;
		margin: 1.25rem 0 0.75rem;
		border-bottom: 1px solid var(--border);
	}
	.tabs a {
		padding: 0.6rem 1rem;
		color: var(--muted);
		text-decoration: none;
		font-weight: 600;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
	}
	.tabs a.active {
		color: var(--text);
		border-bottom-color: var(--accent);
	}
	.empty {
		text-align: center;
		color: var(--muted);
		padding: 3rem 0;
	}
	.pager {
		display: flex;
		justify-content: space-between;
		margin: 1rem 0 3rem;
	}
</style>
