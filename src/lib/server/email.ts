import nodemailer from 'nodemailer';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

/**
 * Sends email over SMTP (Gmail, Resend, SendGrid, Postmark… all offer it).
 * Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and EMAIL_FROM in .env.
 *
 * Without SMTP settings, `npm run dev` prints emails to the terminal instead, so
 * sign-up can be tested locally. A production build refuses to run without them.
 */
const transport = env.SMTP_HOST
	? nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: Number(env.SMTP_PORT || 587),
			secure: Number(env.SMTP_PORT) === 465,
			auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
		})
	: null;

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
	if (!transport) {
		if (!dev) throw new Error('Email is not configured: set SMTP_HOST and friends in .env');
		console.log(`\n📧 Email to ${to}\n   Subject: ${subject}\n\n${text.replace(/^/gm, '   ')}\n`);
		return;
	}
	await transport.sendMail({ from: env.EMAIL_FROM || env.SMTP_USER, to, subject, text });
}
