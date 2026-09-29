import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const FILENAME_RE = /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/;

mkdirSync(UPLOAD_DIR, { recursive: true });

export const CONTENT_TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	gif: 'image/gif'
};

/** Work out the real image type from the file's first bytes (don't trust the browser's label). */
function sniff(buf: Buffer): keyof typeof CONTENT_TYPES | null {
	if (buf.length < 12) return null;
	if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
	if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
		return 'png';
	if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP')
		return 'webp';
	if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'gif';
	return null;
}

export type SaveResult = { ok: true; filename: string } | { ok: false; error: string };

export async function saveImage(file: File): Promise<SaveResult> {
	if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'Photos must be 5 MB or smaller.' };
	const buf = Buffer.from(await file.arrayBuffer());
	const ext = sniff(buf);
	if (!ext) return { ok: false, error: 'Only JPEG, PNG, WebP or GIF photos are allowed.' };

	const filename = `${randomBytes(16).toString('hex')}.${ext}`;
	await writeFile(join(UPLOAD_DIR, filename), buf);
	return { ok: true, filename };
}

export async function readImage(filename: string): Promise<Buffer | null> {
	if (!FILENAME_RE.test(filename)) return null;
	try {
		return await readFile(join(UPLOAD_DIR, filename));
	} catch {
		return null;
	}
}

export async function deleteImage(filename: string): Promise<void> {
	if (!FILENAME_RE.test(filename)) return;
	await unlink(join(UPLOAD_DIR, filename)).catch(() => {});
}
