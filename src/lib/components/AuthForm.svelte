<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';

	let {
		title,
		action = undefined,
		intro = undefined,
		submitLabel,
		error = undefined,
		fields,
		children
	}: {
		title: string;
		action?: string;
		intro?: Snippet;
		submitLabel: string;
		error?: string;
		fields: Snippet;
		children?: Snippet;
	} = $props();

	let pending = $state(false);
</script>

<form
	class="card auth"
	method="POST"
	{action}
	use:enhance={() => {
		pending = true;
		return async ({ update }) => {
			await update({ reset: false });
			pending = false;
		};
	}}
>
	<h1>{title}</h1>
	{#if intro}<p class="intro">{@render intro()}</p>{/if}

	{@render fields()}

	{#if error}<p class="error">{error}</p>{/if}

	<button class="btn" disabled={pending}>{pending ? '…' : submitLabel}</button>
	{#if children}<p class="alt">{@render children()}</p>{/if}
</form>

<style>
	.auth {
		max-width: 380px;
		margin: 3rem auto;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	h1 {
		margin: 0 0 0.25rem;
		font-size: 1.5rem;
	}
	.intro {
		margin: -0.5rem 0 0;
		color: var(--muted);
		line-height: 1.45;
	}
	.auth :global(label) {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.auth :global(input) {
		font: inherit;
		font-weight: 400;
		padding: 0.6rem 0.75rem;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text);
	}
	.auth :global(input:focus) {
		outline: 2px solid var(--accent);
		outline-offset: -1px;
	}
	.alt {
		margin: 0;
		font-size: 0.9rem;
		color: var(--muted);
		text-align: center;
	}
</style>
