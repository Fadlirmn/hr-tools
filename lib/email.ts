/**
 * Shared SMTP email helper. Used by notify-psikotes (notify kandidat: akses dibuka)
 * and exam-submit (notify HR: hasil masuk). Failures are caught by callers —
 * email is always best-effort, never blocks the primary DB write.
 */
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: (process.env.SMTP_PORT || '465') === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@perusahaan.com',
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  })
}
