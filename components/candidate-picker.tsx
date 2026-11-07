'use client'

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { filterCandidates, type PickerFilter, type PickerItem } from '@/lib/candidate-filter'
import { IconCheckCircle, IconPaperclip, IconSearch, IconX } from './icons'

const LAST_KEY = 'hr-last-candidate'

interface Props {
  items: PickerItem[]
  value: string
  onChange: (id: string) => void
  /** Label filter, mis. { todo: 'Perlu dinilai', done: 'Sudah dinilai' } */
  labels: { todo: string; done: string }
  defaultFilter?: PickerFilter
  /** Teks status di sebelah kanan (mis. progres tes) */
  extra?: React.ReactNode
}

/**
 * Pencari kandidat berdasarkan nama (combobox ARIA). Pilihan disimpan ke URL (?candidateId=)
 * dan sessionStorage sehingga terbawa saat pindah menu (CV, Tes DISC/IQ, Interview, Onboarding).
 */
export default function CandidatePicker({ items, value, onChange, labels, defaultFilter = 'all', extra }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const uid = useId()
  const [filter, setFilter] = useState<PickerFilter>(defaultFilter)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const sel = items.find(x => x.id === value) || null
  const list = useMemo(() => filterCandidates(items, query, filter), [items, query, filter])
  const counts = useMemo(() => ({ todo: items.filter(x => x.todo).length, done: items.filter(x => x.done).length, all: items.length }), [items])

  // Pilihan awal: ?candidateId= di URL, kalau tidak ada pakai kandidat terakhir di sesi ini.
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current || value || !items.length) return
    restored.current = true
    let id = new URLSearchParams(window.location.search).get('candidateId')
    if (!id) { try { id = sessionStorage.getItem(LAST_KEY) } catch { /* abaikan */ } }
    if (id && items.some(x => x.id === id)) onChange(id)
  }, [items, value, onChange])

  // Sinkronkan URL & sesi dengan kandidat terpilih
  useEffect(() => {
    if (!value) return
    try { sessionStorage.setItem(LAST_KEY, value) } catch { /* abaikan */ }
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('candidateId') !== value) {
      sp.set('candidateId', value)
      sp.delete('applyAi')
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false })
    }
  }, [value, pathname, router])

  // Tutup saat klik di luar
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const choose = (id: string) => {
    onChange(id)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  const move = (d: number) => {
    if (!list.length) return
    const n = (hi + d + list.length) % list.length
    setHi(n)
    listRef.current?.children[n]?.scrollIntoView({ block: 'nearest' })
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) { setOpen(true); setHi(0) } else move(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (open) move(-1) }
    else if (e.key === 'Enter') { if (open && list[hi]) { e.preventDefault(); choose(list[hi].id) } }
    else if (e.key === 'Escape') { if (open) { e.preventDefault(); setOpen(false) } else if (query) setQuery('') }
  }

  const listId = `${uid}-list`
  const FILTERS: [PickerFilter, string, number][] = [['todo', labels.todo, counts.todo], ['done', labels.done, counts.done], ['all', 'Semua', counts.all]]

  return (
    <div className="picker no-print" ref={wrapRef}>
      <div className="picker-row">
        <div className="picker-box">
          <label htmlFor={`${uid}-in`} className="sr-only">Cari kandidat berdasarkan nama</label>
          <IconSearch size={16} className="ico-svg picker-ico" />
          <input id={`${uid}-in`} ref={inputRef} type="text" role="combobox" autoComplete="off"
            aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
            aria-activedescendant={open && list[hi] ? `${uid}-o-${list[hi].id}` : undefined}
            placeholder={sel ? `${sel.nama} · ${sel.posisi}` : 'Cari nama kandidat…'}
            className={sel && !query ? 'has-sel' : ''}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); setHi(0) }}
            onFocus={() => { setOpen(true); setHi(Math.max(0, list.findIndex(x => x.id === value))) }}
            onKeyDown={onKey} />
          {query && <button type="button" className="picker-clear" aria-label="Hapus pencarian" onClick={() => { setQuery(''); inputRef.current?.focus() }}><IconX size={14} /></button>}
        </div>
        <div className="picker-filters" role="group" aria-label="Filter kandidat">
          {FILTERS.map(([f, l, n]) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => { setFilter(f); setHi(0) }}>{l} <span>{n}</span></button>
          ))}
        </div>
        {extra && <div className="picker-extra">{extra}</div>}
      </div>
      {sel && (
        <div className="picker-sel">
          Kandidat: <b>{sel.nama}</b> · {sel.posisi}
          {sel.hasCv && <span className="chip violet"><IconPaperclip size={12} />CV</span>}
          {sel.done && <span className="chip ok"><IconCheckCircle size={12} />{labels.done}</span>}
          {sel.score && <span className={`chip ${sel.scoreKind || 'neutral'}`}>{sel.score}</span>}
        </div>
      )}
      {open && (
        <ul id={listId} ref={listRef} role="listbox" className="picker-list" aria-label="Daftar kandidat">
          {list.length === 0 && <li className="picker-empty" role="presentation">Tidak ada kandidat yang cocok{filter !== 'all' ? ' di filter ini' : ''}.</li>}
          {list.map((x, i) => (
            <li key={x.id} id={`${uid}-o-${x.id}`} role="option" aria-selected={x.id === value}
              className={`${i === hi ? 'hi' : ''} ${x.id === value ? 'sel' : ''}`}
              onMouseEnter={() => setHi(i)} onMouseDown={e => { e.preventDefault(); choose(x.id) }}>
              <span className="nm">{x.nama}<small>{x.posisi}</small></span>
              <span className="flags">
                {x.hasCv && <IconPaperclip size={14} title="CV sudah diupload" />}
                {x.done && <IconCheckCircle size={14} title={labels.done} />}
                {x.score && <span className={`chip ${x.scoreKind || 'neutral'}`}>{x.score}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
