import { z } from 'zod'
import { idiomValues } from '@/types/models'

export const idiomSchema = z.enum(idiomValues)

export const deckCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    nativeIdiom: idiomSchema,
    learningIdiom: idiomSchema,
  })
  .refine((value) => value.nativeIdiom !== value.learningIdiom, {
    message: 'Choose two different languages',
    path: ['learningIdiom'],
  })

export const phraseFormSchema = z.object({
  original: z.string().trim().min(1).max(500),
  translated: z.string().trim().min(1).max(500),
})

export type DeckCreateValues = z.infer<typeof deckCreateSchema>
export type PhraseFormValues = z.infer<typeof phraseFormSchema>
