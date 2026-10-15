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

export type BroadcastRecipient = string | { email: string; name?: string; vars?: Record<string, string> }

export interface BroadcastResponse {
  success: boolean
  total: number
  sent: number
  failed: number
  invalid: string[]
  results: { email: string; success: boolean; messageId?: string; error?: string }[]
}

/**
 * Kirim satu email ke banyak penerima, masing-masing email terpisah (penerima
 * tidak saling lihat). subject/html mendukung {{name}}, {{email}}, dan key
 * dari vars per penerima. Maks 100 penerima per panggilan — pecah di caller
 * kalau lebih. Partial failure TIDAK di-throw: cek `failed` / `results`.
 */
export async function sendBroadcast(opts: {
  recipients: BroadcastRecipient[]
  subject: string
  html: string
}): Promise<BroadcastResponse> {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/emails/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': EMAIL_SERVICE_API_KEY,
    },
    body: JSON.stringify(opts),
  })

  const data = await res.json().catch(() => null)
  // 502 = semua gagal kirim tapi body tetap berisi results per penerima.
  if (!data || (!res.ok && !data.results)) {
    throw new Error(`Gagal broadcast via Kurma Mail (${res.status}): ${JSON.stringify(data)}`)
  }
  return data as BroadcastResponse
}

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
