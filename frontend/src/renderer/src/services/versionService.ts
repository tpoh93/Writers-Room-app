export interface CardVersionSnapshot {
  id: string
  cardId: number
  projectId: number
  title: string
  content: any
  ai_context_template?: string
  ai_context_template_review?: string
  createdAt: string
  fingerprint?: string
}

import { fingerprintWriterSnapshot } from './writerSnapshot'
import type { WriterHistoryReason } from './writerSaveCoordinator'

const KEY = (projectId: number) => `nf:v1:versions:${projectId}`

function load(projectId: number): Record<number, CardVersionSnapshot[]> {
  try {
    const raw = localStorage.getItem(KEY(projectId))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(projectId: number, data: Record<number, CardVersionSnapshot[]>) {
  localStorage.setItem(KEY(projectId), JSON.stringify(data))
}

export function addVersion(projectId: number, snapshot: Omit<CardVersionSnapshot, 'id' | 'createdAt'>) {
  const db = load(projectId)
  const list = db[snapshot.cardId] || []
  const item: CardVersionSnapshot = {
    ...snapshot,
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    createdAt: new Date().toISOString(),
  }
  list.unshift(item)
  // 限制每卡片最多20条
  db[snapshot.cardId] = list.slice(0, 20)
  save(projectId, db)
}

export function fingerprintVersionSnapshot(snapshot: Pick<CardVersionSnapshot, 'title' | 'content' | 'ai_context_template' | 'ai_context_template_review'>): string {
  return fingerprintWriterSnapshot({
    projectId: 0,
    cardId: 0,
    title: snapshot.title,
    content: snapshot.content,
    contextTemplates: { generation: snapshot.ai_context_template ?? '', review: snapshot.ai_context_template_review ?? '' },
  })
}

export function recordVersionIfEligible(projectId: number, snapshot: Omit<CardVersionSnapshot, 'id' | 'createdAt' | 'fingerprint'>, reason: WriterHistoryReason): boolean {
  if (reason === 'autosave' || reason === 'technical-flush') return false
  const fingerprint = fingerprintVersionSnapshot(snapshot)
  const latest = latestVersion(projectId, snapshot.cardId)
  if (latest && (latest.fingerprint ?? fingerprintVersionSnapshot(latest)) === fingerprint) return false
  addVersion(projectId, { ...snapshot, fingerprint })
  return true
}

export function listVersions(projectId: number, cardId: number): CardVersionSnapshot[] {
  const db = load(projectId)
  return db[cardId] || []
}

export function latestVersion(projectId: number, cardId: number): CardVersionSnapshot | undefined {
  const list = listVersions(projectId, cardId)
  return list[0]
}

export function clearVersions(projectId: number, cardId: number) {
  const db = load(projectId)
  delete db[cardId]
  save(projectId, db)
}

export function deleteVersion(projectId: number, cardId: number, versionId: string) {
  const db = load(projectId)
  const list = db[cardId] || []
  db[cardId] = list.filter(v => v.id !== versionId)
  save(projectId, db)
} 
