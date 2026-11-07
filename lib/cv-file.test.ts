import { describe, it, expect } from 'vitest'
import { detectCvMime, describeUnsupported } from './cv-file'

const b = (...parts: (string | number[])[]) => Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p, 'latin1') : Buffer.from(p)))

describe('detectCvMime', () => {
  it('mengenali PDF, JPG, PNG, WEBP dari isi file', () => {
    expect(detectCvMime(b('%PDF-1.7\n'))).toBe('application/pdf')
    expect(detectCvMime(b([0xef, 0xbb, 0xbf], '\n%PDF-1.4'))).toBe('application/pdf') // ada byte sebelum %PDF
    expect(detectCvMime(b([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(detectCvMime(b([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png')
    expect(detectCvMime(b('RIFF', [0x90, 0xa2, 2, 0], 'WEBPVP8L'))).toBe('image/webp') // file .png yang isinya WebP
  })
  it('menolak format lain dan menjelaskan isinya', () => {
    const docx = b('PK', [3, 4, 20, 0])
    expect(detectCvMime(docx)).toBeNull()
    expect(describeUnsupported(docx)).toContain('.docx')
    expect(describeUnsupported(b([0, 0, 0, 0x18], 'ftypheic'))).toContain('HEIC')
    expect(describeUnsupported(b([0xd0, 0xcf, 0x11, 0xe0]))).toContain('.doc')
    expect(describeUnsupported(b('halo'))).toBeNull()
  })
})
