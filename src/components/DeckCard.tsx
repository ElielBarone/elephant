import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { FlagsRelated } from '@/components/FlagsRelated'
import { idiomLabel } from '@/lib/idiom'
import type { Deck } from '@/types/models'

export interface DeckCardProps {
  deck: Deck
  onOpen: () => void
}

export function DeckCard({ deck, onOpen }: DeckCardProps) {
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
          <Typography variant="caption" color="text.secondary">
            {deck.phrases.length} cards
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
