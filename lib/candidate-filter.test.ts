import { describe, it, expect } from 'vitest'
import { filterCandidates, type PickerItem } from './candidate-filter'

const it_ = (id: string, nama: string, posisi: string, todo: boolean, done: boolean): PickerItem => ({ id, nama, posisi, todo, done })
const L = [
  it_('1', 'Andini Putri', 'Marketing', true, false),
  it_('2', 'Budi Santoso', 'Marketing', true, false),
  it_('3', 'Dewi Anggraini', 'Marketing', false, true),
  it_('4', 'Raka Pratama', 'Content Creator', false, false),
  it_('5', 'Sabda Budiman', 'Iklan', false, true),
]
const ids = (x: PickerItem[]) => x.map(i => i.id)

describe('filterCandidates', () => {
  it('filter todo / done / all', () => {
    expect(ids(filterCandidates(L, '', 'todo'))).toEqual(['1', '2'])
    expect(ids(filterCandidates(L, '', 'done'))).toEqual(['3', '5'])
    expect(filterCandidates(L, '', 'all')).toHaveLength(5)
  })
  it('cari nama tanpa peka huruf besar, nama depan diutamakan', () => {
    expect(ids(filterCandidates(L, 'BUD', 'all'))).toEqual(['2', '5'])
  })
  it('semua kata harus cocok, posisi ikut dicari', () => {
    expect(ids(filterCandidates(L, 'marketing dewi', 'all'))).toEqual(['3'])
    expect(ids(filterCandidates(L, 'creator', 'all'))).toEqual(['4'])
  })
  it('pencarian tetap menghormati filter', () => {
    expect(ids(filterCandidates(L, 'bud', 'todo'))).toEqual(['2'])
  })
  it('abaikan aksen', () => {
    expect(ids(filterCandidates([it_('9', 'José Rizal', 'Iklan', true, false)], 'jose', 'all'))).toEqual(['9'])
  })
})
