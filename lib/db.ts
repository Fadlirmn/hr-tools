import type { Candidate, Position } from './types'
import { POSITIONS_DEFAULT } from './constants'
import { createClient } from './supabase'

export async function getCandidates(): Promise<Candidate[]> {
  const supabase = createClient()
  const { data } = await supabase.from('candidates').select('*').order('tanggal', { ascending: false })
  return (data as Candidate[]) || []
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const supabase = createClient()
  const { data } = await supabase.from('candidates').select('*').eq('id', id).single()
  return data as Candidate | null
}

export async function saveCandidate(c: Candidate): Promise<void> {
  const supabase = createClient()
  const { id, ...rest } = c
  if (id) {
    await supabase.from('candidates').upsert({ id, ...rest })
  } else {
    await supabase.from('candidates').insert({ ...rest })
  }
}

export async function deleteCandidate(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('candidates').delete().eq('id', id)
}

export async function getPositions(): Promise<Position[]> {
  const supabase = createClient()
  const { data } = await supabase.from('positions').select('*').order('name')
  if (data && data.length > 0) return data as Position[]
  return JSON.parse(JSON.stringify(POSITIONS_DEFAULT))
}

export async function savePosition(p: Position): Promise<void> {
  const supabase = createClient()
  await supabase.from('positions').upsert({ id: p.id, name: p.name, weights: p.weights })
}

export async function deletePosition(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('positions').delete().eq('id', id)
}

export async function getCandidateByUserId(userId: string): Promise<Candidate | null> {
  const supabase = createClient()
  const { data } = await supabase.from('candidates').select('*').eq('user_id', userId).single()
  return data as Candidate | null
}

export async function getCandidateByInviteToken(token: string): Promise<Candidate | null> {
  const supabase = createClient()
  const { data } = await supabase.from('candidates').select('*').eq('invite_token', token).single()
  return data as Candidate | null
}
