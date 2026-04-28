import { nanoid } from 'nanoid'
import type { CardSchedule, Deck, Idiom, Phrase } from '@/types/models'
import { createInitialSchedule } from '@/lib/scheduler/scheduler'
import { openElephantDb, schedulingKey } from './openElephantDb'

const LAST_DECK_KEY = 'elephant:lastDeckId'

export function readLastDeckId(): string | null {
  try {
    return localStorage.getItem(LAST_DECK_KEY)
  } catch {
    return null
  }
}

export function writeLastDeckId(deckId: string | null): void {
  try {
    if (deckId == null) {
      localStorage.removeItem(LAST_DECK_KEY)
    } else {
      localStorage.setItem(LAST_DECK_KEY, deckId)
    }
  } catch {
    /* ignore */
  }
}

export async function listDeckRecords(): Promise<Deck[]> {
  const db = await openElephantDb()
  const rows = await db.getAll('decks')
  return rows
    .map((row) => JSON.parse(row.payload) as Deck)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getDeck(deckId: string): Promise<Deck | undefined> {
  const db = await openElephantDb()
  const row = await db.get('decks', deckId)
  if (!row) {
    return undefined
  }
  return JSON.parse(row.payload) as Deck
}

export async function saveDeck(deck: Deck): Promise<void> {
  const db = await openElephantDb()
  await db.put('decks', {
    id: deck.id,
    payload: JSON.stringify(deck),
    updatedAt: deck.updatedAt,
  })
}

export async function deleteDeck(deckId: string): Promise<void> {
  const db = await openElephantDb()
  const tx = db.transaction(['decks', 'scheduling', 'audio'], 'readwrite')
  await tx.objectStore('decks').delete(deckId)
  const schedPrefix = `${deckId}\u0000`
  const schedStore = tx.objectStore('scheduling')
  let schedCursor = await schedStore.openCursor()
  while (schedCursor) {
    const key = String(schedCursor.key)
    if (key.startsWith(schedPrefix)) {
      await schedCursor.delete()
    }
    schedCursor = await schedCursor.continue()
  }
  const audioStore = tx.objectStore('audio')
  let audioCursor = await audioStore.openCursor()
  while (audioCursor) {
    const key = String(audioCursor.key)
    if (key.startsWith(schedPrefix)) {
      await audioCursor.delete()
    }
    audioCursor = await audioCursor.continue()
  }
  await tx.done
}

export async function listScheduling(deckId: string): Promise<CardSchedule[]> {
  const db = await openElephantDb()
  const store = db.transaction('scheduling').objectStore('scheduling')
  const prefix = `${deckId}\u0000`
  const out: CardSchedule[] = []
  let cursor = await store.openCursor()
  while (cursor) {
    const key = String(cursor.key)
    if (key.startsWith(prefix)) {
      const row = cursor.value as { payload: string }
      out.push(JSON.parse(row.payload) as CardSchedule)
    }
    cursor = await cursor.continue()
  }
  return out
}

export async function saveScheduling(row: CardSchedule): Promise<void> {
  const db = await openElephantDb()
  const key = schedulingKey(row.deckId, row.cardId)
  await db.put('scheduling', {
    key,
    payload: JSON.stringify(row),
  })
}

export async function deleteScheduling(deckId: string, cardId: string): Promise<void> {
  const db = await openElephantDb()
  await db.delete('scheduling', schedulingKey(deckId, cardId))
}

export async function ensureSchedulingForDeck(
  deck: Deck,
  now: number,
): Promise<void> {
  const db = await openElephantDb()
  const tx = db.transaction('scheduling', 'readwrite')
  const store = tx.objectStore('scheduling')
  for (const phrase of deck.phrases) {
    const key = schedulingKey(deck.id, phrase.id)
    const existing = await store.get(key)
    if (!existing) {
      const initial = createInitialSchedule(deck.id, phrase.id, now)
      await store.put({
        key,
        payload: JSON.stringify(initial),
      })
    }
  }
  await tx.done
}

export interface BundledDeckFile {
  title: string
  nativeIdiom: Idiom
  learningIdiom: Idiom
  phrases: Array<{ id?: string; original: string; translated: string }>
}

export async function copyBundledDeck(
  assetPath: string,
  now: number,
): Promise<Deck> {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
  const response = await fetch(`${base}decks/${assetPath}`)
  if (!response.ok) {
    throw new Error(`Missing deck asset ${assetPath}`)
  }
  const raw = (await response.json()) as BundledDeckFile
  const deckId = nanoid()
  const phrases: Phrase[] = raw.phrases.map((p) => ({
    id: p.id && p.id.length > 0 ? p.id : nanoid(),
    original: p.original,
    translated: p.translated,
  }))
  const deck: Deck = {
    id: deckId,
    title: raw.title,
    nativeIdiom: raw.nativeIdiom,
    learningIdiom: raw.learningIdiom,
    phrases,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    sourceAsset: assetPath,
  }
  await saveDeck(deck)
  await ensureSchedulingForDeck(deck, now)
  return deck
}

export async function createEmptyDeck(
  title: string,
  nativeIdiom: Idiom,
  learningIdiom: Idiom,
  now: number,
): Promise<Deck> {
  const deck: Deck = {
    id: nanoid(),
    title,
    nativeIdiom,
    learningIdiom,
    phrases: [],
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  }
  await saveDeck(deck)
  return deck
}

export async function duplicateDeck(source: Deck, now: number): Promise<Deck> {
  const idMap = new Map<string, string>()
  for (const phrase of source.phrases) {
    idMap.set(phrase.id, nanoid())
  }
  const phrases = source.phrases.map((p) => ({
    ...p,
    id: idMap.get(p.id) ?? nanoid(),
  }))
  const deck: Deck = {
    id: nanoid(),
    title: `${source.title} (copy)`,
    nativeIdiom: source.nativeIdiom,
    learningIdiom: source.learningIdiom,
    phrases,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    ttsPromptEnabled: source.ttsPromptEnabled,
    ttsAnswerEnabled: source.ttsAnswerEnabled,
    voiceAutoFlipEnabled: source.voiceAutoFlipEnabled,
  }
  await saveDeck(deck)
  const schedules = await listScheduling(source.id)
  for (const row of schedules) {
    const nextId = idMap.get(row.cardId)
    if (!nextId) {
      continue
    }
    const clone: CardSchedule = {
      ...row,
      deckId: deck.id,
      cardId: nextId,
    }
    await saveScheduling(clone)
  }
  await ensureSchedulingForDeck(deck, now)
  return deck
}
