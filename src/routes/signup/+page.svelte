<script lang="ts">
	import AuthForm from '$lib/components/AuthForm.svelte';
	import { PASSWORD_RULES } from '$lib/validation';

	let { form } = $props();
	let password = $state('');
</script>

<svelte:head><title>Sign up · Starboard</title></svelte:head>

<AuthForm title="Join Starboard" submitLabel="Continue" error={form?.error}>
	{#snippet fields()}
		<label>
			Email
			<input name="email" type="email" value={form?.email ?? ''} autocomplete="email" required />
		</label>
		<label>
			Username
			<input
				name="username"
				value={form?.username ?? ''}
				autocomplete="username"
				pattern="[a-zA-Z0-9_]{'{'}3,20{'}'}"
				title="3–20 letters, numbers or underscores"
				required
			/>
		</label>
		<label>
			Password
			<input name="password" type="password" autocomplete="new-password" bind:value={password} required />
		</label>
		<ul class="rules">
			{#each PASSWORD_RULES as rule (rule.label)}
				<li class:ok={rule.test(password)}>{rule.label}</li>
			{/each}
		</ul>
	{/snippet}
	Already have an account? <a href="/login">Log in</a>
</AuthForm>

<style>
	.rules {
		list-style: none;
		margin: -0.4rem 0 0;
		padding: 0;
		font-size: 0.85rem;
		color: var(--muted);
	}
	.rules li::before {
		content: '○ ';
	}
	.rules li.ok {
		color: #1f9d55;
	}
	.rules li.ok::before {
		content: '✓ ';
	}
</style>
