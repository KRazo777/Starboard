<script lang="ts">
	import '../app.css';
	import { enhance } from '$app/forms';
	import Avatar from '$lib/components/Avatar.svelte';

	let { data, children } = $props();
</script>

<header class="topbar">
	<div class="inner">
		<a href="/" class="brand"><span class="brand-star">★</span> Starboard</a>
		<nav>
			{#if data.user}
				<a class="me" href="/u/{data.user.username}">
					<Avatar file={data.user.avatar} username={data.user.username} size={26} />
					@{data.user.username}
				</a>
				<form method="POST" action="/logout" use:enhance>
					<button class="link">Log out</button>
				</form>
			{:else}
				<a href="/login">Log in</a>
				<a href="/signup" class="btn small">Sign up</a>
			{/if}
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>
