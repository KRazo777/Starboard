<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthForm from '$lib/components/AuthForm.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Verify your email · Starboard</title></svelte:head>

{#if form?.restart}
	<div class="card done">
		<h1>Let's try that again</h1>
		<p class="error">{form.error}</p>
		<a class="btn" href="/signup">Back to sign up</a>
	</div>
{:else}
	<form id="resend" method="POST" action="?/resend" use:enhance hidden></form>
	<AuthForm
		title="Check your email"
		action="?/verify" submitLabel="Verify & create account" error={form?.error}>
		{#snippet intro()}
			We sent a 6-digit code to <strong>{data.email}</strong>.
		{/snippet}
		{#snippet fields()}
			<label>
				Verification code
				<input
					name="code"
					inputmode="numeric"
					autocomplete="one-time-code"
					pattern="\d{'{'}6{'}'}"
					maxlength="6"
					placeholder="123456"
					class="code"
					required
				/>
			</label>
			{#if form?.resent}<p class="muted">New code sent.</p>{/if}
		{/snippet}
		Didn't get it? Check spam, or <button class="resend" form="resend">send a new code</button>
	</AuthForm>
{/if}

<style>
	.code {
		font-size: 1.4rem !important;
		letter-spacing: 0.4em;
		text-align: center;
	}
	.resend {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: var(--accent);
		text-decoration: underline;
		cursor: pointer;
	}
	.done {
		max-width: 380px;
		margin: 3rem auto;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		align-items: flex-start;
	}
	.done h1 {
		margin: 0;
		font-size: 1.5rem;
	}
</style>
