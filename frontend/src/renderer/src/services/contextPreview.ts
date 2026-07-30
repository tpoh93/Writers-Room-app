import { getRelationKindDisplayName, getRelationStanceDisplayName } from '@renderer/i18n'

type RecordValue = Record<string, unknown>

export type AuthorContextSection = {
  title: string
  entries: string[]
}

export type AuthorContextPreview = {
  sections: AuthorContextSection[]
  technicalText: string
}

function asRecord(value: unknown): RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue
    : {}
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function asTextList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(asText).filter(Boolean) : []
}

function appendField(entries: string[], label: string, value: unknown) {
  const text = asText(value)
  if (text) entries.push(`${label}: ${text}`)
}

/**
 * Produces an author-facing view of the assembled context without rewriting
 * values from user cards. Raw renderer/template output is returned separately
 * for the collapsed diagnostic view and is never used to execute a workflow.
 */
export function buildAuthorContextPreview(
  factsStructured: unknown,
  technicalText: string | undefined | null,
): AuthorContextPreview {
  const source = asRecord(factsStructured)
  const sections: AuthorContextSection[] = []
  const facts = asTextList(source.fact_summaries)
  if (facts.length) sections.push({ title: 'Kluczowe fakty', entries: facts })

  const relations: string[] = []
  for (const value of Array.isArray(source.relation_summaries) ? source.relation_summaries : []) {
    const relation = asRecord(value)
    const members = [asText(relation.a), asText(relation.b)].filter(Boolean).join(' ↔ ')
    const descriptors = [
      asText(relation.kind) ? getRelationKindDisplayName(asText(relation.kind)) : '',
      asText(relation.stance) ? getRelationStanceDisplayName(asText(relation.stance)) : '',
    ].filter(Boolean)
    if (members) relations.push([members, ...descriptors].join(' · '))
    appendField(relations, 'Opis', relation.description)
    const addressing = [
      asText(relation.a_to_b_addressing) ? `A zwraca się do B: ${asText(relation.a_to_b_addressing)}` : '',
      asText(relation.b_to_a_addressing) ? `B zwraca się do A: ${asText(relation.b_to_a_addressing)}` : '',
    ].filter(Boolean)
    if (addressing.length) relations.push(addressing.join(' · '))
    const dialogues = asTextList(relation.recent_dialogues)
    if (dialogues.length) relations.push(`Przykłady rozmów: ${dialogues.join(' · ')}`)
    for (const eventValue of Array.isArray(relation.recent_event_summaries) ? relation.recent_event_summaries : []) {
      const event = asRecord(eventValue)
      const labels = [
        event.volume_number == null ? '' : `Tom ${event.volume_number}`,
        event.chapter_number == null ? '' : `Rozdział ${event.chapter_number}`,
      ].filter(Boolean)
      const summary = asText(event.summary)
      if (summary) relations.push(labels.length ? `${summary} · ${labels.join(' · ')}` : summary)
    }
  }
  if (relations.length) sections.push({ title: 'Podsumowanie relacji', entries: relations })

  const items: string[] = []
  for (const value of Array.isArray(source.item_summaries) ? source.item_summaries : []) {
    const item = asRecord(value)
    const name = asText(item.name)
    if (name) items.push(name)
    appendField(items, 'Kategoria', item.category)
    appendField(items, 'Opis', item.description)
    appendField(items, 'Stan', item.current_state)
    appendField(items, 'Właściciel', item.owner_hint)
    appendField(items, 'Działanie', item.power_or_effect)
    appendField(items, 'Ograniczenia', item.constraints)
  }
  if (items.length) sections.push({ title: 'Podsumowanie przedmiotów', entries: items })

  const concepts: string[] = []
  for (const value of Array.isArray(source.concept_summaries) ? source.concept_summaries : []) {
    const concept = asRecord(value)
    const name = asText(concept.name)
    if (name) concepts.push(name)
    appendField(concepts, 'Kategoria', concept.category)
    appendField(concepts, 'Opis', concept.description)
    appendField(concepts, 'Definicja', concept.rule_definition)
    appendField(concepts, 'Koszt', concept.cost)
    appendField(concepts, 'Wskazówka', concept.mastery_hint)
    const knownBy = asTextList(concept.known_by)
    if (knownBy.length) concepts.push(`Znane przez: ${knownBy.join(', ')}`)
    const counterRelations = asTextList(concept.counter_relations)
    if (counterRelations.length) concepts.push(`Powiązania przeciwne: ${counterRelations.join(', ')}`)
  }
  if (concepts.length) sections.push({ title: 'Podsumowanie pojęć', entries: concepts })

  return { sections, technicalText: technicalText || '' }
}
