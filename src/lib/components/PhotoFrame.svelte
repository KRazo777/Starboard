<script lang="ts">
	/**
	 * Shows a photo the way Instagram does: anything between 4:5 portrait and
	 * 1.91:1 landscape appears whole at its own shape. Taller or wider photos are
	 * cropped to that limit, and `focus` (0–1) picks which part stays in view.
	 * With `editable`, the photo can be dragged to set `focus`.
	 */
	let {
		src,
		alt,
		width = $bindable(null),
		height = $bindable(null),
		focus = $bindable(0.5),
		editable = false,
		lazy = false
	}: {
		src: string;
		alt: string;
		width?: number | null;
		height?: number | null;
		focus?: number;
		editable?: boolean;
		lazy?: boolean;
	} = $props();

	const MIN_RATIO = 4 / 5;
	const MAX_RATIO = 1.91;

	const ratio = $derived(width && height ? width / height : null);
	const cropAxis = $derived(
		ratio === null ? null : ratio < MIN_RATIO ? 'y' : ratio > MAX_RATIO ? 'x' : null
	);
	const adjustable = $derived(editable && cropAxis !== null);

	let frame: HTMLDivElement;
	let img: HTMLImageElement;
	let drag = $state<{ from: number; focus: number; overflow: number } | null>(null);

	const clamp01 = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;

	function onLoad() {
		if (!editable) return;
		width = img.naturalWidth;
		height = img.naturalHeight;
	}

	function onPointerDown(e: PointerEvent) {
		if (!adjustable || !ratio) return;
		const r = frame.getBoundingClientRect();
		// How many pixels of photo are hidden along the cropped side.
		const overflow = cropAxis === 'y' ? r.width / ratio - r.height : r.height * ratio - r.width;
		if (overflow <= 0) return;
		frame.setPointerCapture(e.pointerId);
		drag = { from: cropAxis === 'y' ? e.clientY : e.clientX, focus, overflow };
	}

	function onPointerMove(e: PointerEvent) {
		if (!drag) return;
		const at = cropAxis === 'y' ? e.clientY : e.clientX;
		focus = clamp01(drag.focus - (at - drag.from) / drag.overflow);
	}

	function onKeyDown(e: KeyboardEvent) {
		const back = cropAxis === 'y' ? 'ArrowUp' : 'ArrowLeft';
		const forward = cropAxis === 'y' ? 'ArrowDown' : 'ArrowRight';
		if (e.key !== back && e.key !== forward) return;
		e.preventDefault();
		focus = clamp01(focus + (e.key === forward ? 0.05 : -0.05));
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="frame"
	class:adjustable
	class:dragging={drag}
	bind:this={frame}
	role={adjustable ? 'slider' : undefined}
	tabindex={adjustable ? 0 : undefined}
	aria-label={adjustable ? 'Photo position' : undefined}
	aria-valuemin={adjustable ? 0 : undefined}
	aria-valuemax={adjustable ? 100 : undefined}
	aria-valuenow={adjustable ? Math.round(focus * 100) : undefined}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={() => (drag = null)}
	onpointercancel={() => (drag = null)}
	onkeydown={adjustable ? onKeyDown : undefined}
>
	<img
		bind:this={img}
		{src}
		{alt}
		width={width ?? undefined}
		height={height ?? undefined}
		loading={lazy ? 'lazy' : undefined}
		draggable="false"
		style:object-position="{focus * 100}% {focus * 100}%"
		onload={onLoad}
	/>
	{#if adjustable}
		{#if drag}
			<div class="grid" aria-hidden="true"></div>
		{:else}
			<span class="hint" aria-hidden="true">
				{cropAxis === 'y' ? '↕' : '↔'} Drag to adjust
			</span>
		{/if}
	{/if}
</div>

<style>
	.frame {
		position: relative;
		container-type: inline-size;
		overflow: hidden;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--chip);
	}
	img {
		display: block;
		width: 100%;
		height: auto;
		/* 1.91:1 landscape … 4:5 portrait, measured against the frame's width */
		min-height: calc(100cqw / 1.91);
		max-height: 125cqw;
		object-fit: cover;
		user-select: none;
	}
	.adjustable {
		cursor: grab;
		touch-action: none;
	}
	.adjustable:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.dragging {
		cursor: grabbing;
	}
	.hint {
		position: absolute;
		top: 10px;
		right: 10px;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		background: rgb(0 0 0 / 0.6);
		color: white;
		font-size: 0.8rem;
		font-weight: 600;
		pointer-events: none;
	}
	.grid {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			linear-gradient(90deg, transparent calc(33.33% - 0.5px), rgb(255 255 255 / 0.6) 0 calc(33.33% + 0.5px), transparent 0 calc(66.66% - 0.5px), rgb(255 255 255 / 0.6) 0 calc(66.66% + 0.5px), transparent 0),
			linear-gradient(transparent calc(33.33% - 0.5px), rgb(255 255 255 / 0.6) 0 calc(33.33% + 0.5px), transparent 0 calc(66.66% - 0.5px), rgb(255 255 255 / 0.6) 0 calc(66.66% + 0.5px), transparent 0);
	}
</style>
