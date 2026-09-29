<script lang="ts">
	import AuthForm from '$lib/components/AuthForm.svelte';
	let { form } = $props();
</script>

<svelte:head><title>Log in · Starboard</title></svelte:head>

<AuthForm title="Welcome back" submitLabel="Log in" error={form?.error}>
	{#snippet fields()}
		<label>
			Username or email
			<input name="login" value={form?.login ?? ''} autocomplete="username" required />
		</label>
		<label>
			Password
			<input name="password" type="password" autocomplete="current-password" required />
		</label>
	{/snippet}
	New here? <a href="/signup">Create an account</a>
</AuthForm>
