/**
 * Shared email helper. Mengirim lewat Kurma Mail (email-company), bukan
 * SMTP langsung — hr-tools join Docker network yang sama (email-custom_default)
 * jadi panggil nama service internal (default: http://email_web:3000), tanpa
 * expose port tambahan ke publik.
 *
 * Auth: header X-API-Key (lihat EMAIL_SERVICE_API_KEY di Kurma Mail), bukan
 * session cookie — hr-tools tidak punya akun user di Kurma Mail.
 *
 * Failure selalu di-throw ke caller; semua caller di hr-tools sudah
 * men-treat email sebagai best-effort (try/catch, tidak pernah blocking
 * penyimpanan data utama).
 */
const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://email_web:3000'
const EMAIL_SERVICE_API_KEY = process.env.EMAIL_SERVICE_API_KEY || ''

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/emails/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': EMAIL_SERVICE_API_KEY,
    },
    body: JSON.stringify({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gagal kirim email via Kurma Mail (${res.status}): ${body}`)
  }
}
