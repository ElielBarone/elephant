import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DB_NAME = 'elephant'
const DB_VERSION = 1

export interface ElephantDbSchema extends DBSchema {
  decks: {
    key: string
    value: {
      id: string
      payload: string
      updatedAt: string
    }
  }
  scheduling: {
    key: string
    value: {
      key: string
      payload: string
    }
  }
  audio: {
    key: string
    value: {
      key: string
      blob: Blob
    }
  }
}

function schedulingKey(deckId: string, cardId: string): string {
  return `${deckId}\u0000${cardId}`
}

export { schedulingKey }

export async function openElephantDb(): Promise<IDBPDatabase<ElephantDbSchema>> {
  return openDB<ElephantDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('decks')) {
        db.createObjectStore('decks', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('scheduling')) {
        db.createObjectStore('scheduling', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('audio')) {
        db.createObjectStore('audio', { keyPath: 'key' })
      }
    },
  })
}
