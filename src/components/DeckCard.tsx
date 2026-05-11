import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { FlagsRelated } from '@/components/FlagsRelated'
import type { DeckPendingByMode } from '@/lib/db/deckStorage'
import { idiomLabel } from '@/lib/idiom'
import type { Deck } from '@/types/models'

export interface DeckCardProps {
  deck: Deck
  pending?: DeckPendingByMode
  onOpen: () => void
}

export function DeckCard({ deck, pending, onOpen }: DeckCardProps) {
  const { t } = useTranslation()
  return (
    <Card variant="outlined">
      <CardActionArea onClick={onOpen}>
        <CardContent>

          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            component="span"
            display="flex"
            sx={{ color: 'text.secondary' }}
            aria-label={`${idiomLabel(deck.nativeIdiom)} to ${idiomLabel(deck.learningIdiom)}`}
          >
            <FlagsRelated
              firstIdiom={deck.nativeIdiom}
              secondIdiom={deck.learningIdiom}
              height={22}
            />
            <Typography variant="h6" >{deck.title}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">
              {t('deck.cards', { count: deck.phrases.length })}
            </Typography>
            {pending ? (
              <Typography
                variant="caption"
                color={pending.flip > 0 ? 'primary.main' : 'text.secondary'}
                sx={{ fontWeight: pending.flip > 0 ? 600 : 'inherit' }}
              >
                · {t('deck.pendingFlip', { count: pending.flip })}
              </Typography>
            ) : null}
            {pending ? (
              <Typography
                variant="caption"
                color={pending.compose > 0 ? 'secondary.main' : 'text.secondary'}
                sx={{ fontWeight: pending.compose > 0 ? 600 : 'inherit' }}
              >
                · {t('deck.pendingCompose', { count: pending.compose })}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
