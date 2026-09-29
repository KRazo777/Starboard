import { CODE_MINUTES } from './auth';
import { sendEmail } from './email';

export function sendCodeEmail(email: string, code: string) {
	return sendEmail(
		email,
		`${code} is your Starboard code`,
		`Your Starboard verification code is ${code}\n\n` +
			`It expires in ${CODE_MINUTES} minutes. If you didn't try to sign up, you can ignore this email.`
	);
}
