import { describe, it, expect } from 'vitest'
import { safeFilename, pdfThreats, imageSize, createRateLimiter } from './upload-guard'
import { pickCandidateFields } from './candidate-columns'

describe('safeFilename', () => {
  it('buang path, karakter berbahaya, dan samakan ekstensi dengan isi', () => {
    expect(safeFilename('../../etc/passwd', 'application/pdf')).toBe('passwd.pdf')
    expect(safeFilename('C:\\Users\\x\\CV Budi.exe', 'application/pdf')).toBe('CV Budi.pdf')
    expect(safeFilename("cv'; DROP TABLE candidates;--.png", 'image/webp')).toBe("cv' DROP TABLE candidates--.webp")
    expect(safeFilename('a\u0000b\r\n<script>.jpg', 'image/jpeg')).toBe('abscript.jpg')
    expect(safeFilename('', 'image/png')).toBe('cv.png')
    expect(safeFilename('x'.repeat(500) + '.pdf', 'application/pdf').length).toBeLessThanOrEqual(120)
  })
})

describe('pdfThreats', () => {
  it('menandai PDF berisi JavaScript / launch / file tersisip', () => {
    expect(pdfThreats(Buffer.from('%PDF-1.7 /OpenAction << /S /JavaScript /JS (app.alert(1)) >>'))).toEqual(['JavaScript'])
    expect(pdfThreats(Buffer.from('%PDF-1.7 /Launch /EmbeddedFiles'))).toEqual(['perintah menjalankan program', 'file tersisip'])
    expect(pdfThreats(Buffer.from('%PDF-1.7 /Type /Page /JSON'))).toEqual([])
  })
})

describe('imageSize', () => {
  it('membaca ukuran PNG & WEBP, menolak header rusak', () => {
    const png = Buffer.alloc(24); png.write('\x89PNG\r\n\x1a\n', 0, 'latin1'); png.write('IHDR', 12, 'latin1'); png.writeUInt32BE(750, 16); png.writeUInt32BE(1061, 20)
    expect(imageSize(png, 'image/png')).toEqual({ w: 750, h: 1061 })
    expect(imageSize(Buffer.from('\x89PNG\r\n\x1a\nxxxxxxxx', 'latin1'), 'image/png')).toBeNull()
  })
})

describe('createRateLimiter', () => {
  it('membatasi per akun dalam jendela waktu', () => {
    const lim = createRateLimiter(2, 1000)
    expect(lim('a', 0).ok).toBe(true); expect(lim('a', 10).ok).toBe(true)
    expect(lim('a', 20)).toEqual({ ok: false, retryAfterSec: 1 })
    expect(lim('b', 20).ok).toBe(true)
    expect(lim('a', 1001).ok).toBe(true)
  })
})

describe('pickCandidateFields (anti SQL injection nama kolom)', () => {
  it('hanya kolom yang diizinkan yang lolos', () => {
    expect(pickCandidateFields({ nama: 'A', 'stage = $1; DROP TABLE users; --': 'x', password_hash: 'h', has_cv_file: true }))
      .toEqual({ nama: 'A' })
    expect(pickCandidateFields({ id: '1', nama: 'A' }, ['id'])).toEqual({ id: '1', nama: 'A' })
  })
})
