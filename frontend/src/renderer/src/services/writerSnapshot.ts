import type { CardRead } from '@renderer/api/cards'

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export interface WriterContextTemplates {
  generation: string
  review: string
}

export interface WriterSnapshot {
  projectId: number
  cardId: number
  title: string
  content: JsonValue
  contextTemplates: WriterContextTemplates
}

function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function canonicalizeJson(value: JsonValue): JsonValue {
  if (isJsonPrimitive(value)) return value
  if (Array.isArray(value)) return value.map((item) => canonicalizeJson(item))
  if (!isPlainObject(value)) throw new TypeError('Writer snapshot accepts JSON-compatible values only')

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeJson(value[key] as JsonValue)])
  )
}

export function createWriterSnapshot(
  card: Pick<CardRead, 'id' | 'project_id' | 'title' | 'content' | 'ai_context_template' | 'ai_context_template_review'>
): WriterSnapshot {
  return {
    projectId: card.project_id,
    cardId: card.id,
    title: card.title,
    content: (card.content ?? {}) as JsonValue,
    contextTemplates: {
      generation: card.ai_context_template ?? '',
      review: card.ai_context_template_review ?? '',
    },
  }
}

export function createChapterWriterContent(
  content: Record<string, JsonValue | undefined>,
  textContent: string,
): JsonValue {
  const snapshotContent: Record<string, JsonValue | undefined> = {
    ...content,
    content: textContent,
  }
  if (snapshotContent.volume_number === undefined) delete snapshotContent.volume_number
  if (snapshotContent.chapter_number === undefined) delete snapshotContent.chapter_number
  return snapshotContent as Record<string, JsonValue>
}

export function canonicalizeWriterSnapshot(snapshot: WriterSnapshot): string {
  return JSON.stringify(
    canonicalizeJson({
      title: snapshot.title,
      content: snapshot.content,
      contextTemplates: {
        generation: snapshot.contextTemplates.generation,
        review: snapshot.contextTemplates.review,
      },
    })
  )
}

export function fingerprintWriterSnapshot(snapshot: WriterSnapshot): string {
  return canonicalizeWriterSnapshot(snapshot)
}

export function snapshotsEqual(left: WriterSnapshot, right: WriterSnapshot): boolean {
  return fingerprintWriterSnapshot(left) === fingerprintWriterSnapshot(right)
}
