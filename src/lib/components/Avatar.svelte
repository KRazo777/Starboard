<script lang="ts">
	let {
		file = null,
		preview = null,
		username,
		size = 32
	}: { file?: string | null; preview?: string | null; username: string; size?: number } = $props();

	const src = $derived(preview ?? (file ? `/uploads/${file}` : null));
	// No photo: the first letter on a colour that's stable for each username.
	const hue = $derived([...username.toLowerCase()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7));
</script>

{#if src}
	<img class="avatar" {src} alt="" width={size} height={size} style:--size="{size}px" />
{:else}
	<span class="avatar initial" style:--size="{size}px" style:--hue={hue} aria-hidden="true">
		{username[0]?.toUpperCase()}
	</span>
{/if}

<style>
	.avatar {
		flex: none;
		width: var(--size);
		height: var(--size);
		border-radius: 999px;
		object-fit: cover;
		background: var(--chip);
	}
	.initial {
		display: inline-grid;
		place-items: center;
		font-weight: 700;
		font-size: calc(var(--size) * 0.45);
		color: white;
		background: hsl(var(--hue) 45% 50%);
	}
</style>
