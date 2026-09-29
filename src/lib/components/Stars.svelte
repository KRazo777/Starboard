<script lang="ts">
	// Read-only star display that supports fractions, e.g. 3.6 stars.
	let { value, size = '1.1rem' }: { value: number; size?: string } = $props();
	const pct = $derived(Math.max(0, Math.min(5, value)) * 20);
</script>

<span class="stars" style:font-size={size} aria-label="{value.toFixed(1)} out of 5 stars">
	<span class="empty" aria-hidden="true">★★★★★</span>
	<span class="full" aria-hidden="true" style:width="{pct}%">★★★★★</span>
</span>

<style>
	.stars {
		position: relative;
		display: inline-block;
		line-height: 1;
		letter-spacing: 1px;
	}
	.empty {
		color: var(--star-off);
	}
	.full {
		position: absolute;
		inset: 0 auto 0 0;
		overflow: hidden;
		white-space: nowrap;
		color: var(--star);
	}
</style>
