import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { FlagsRelated } from '@/components/FlagsRelated'
import { idiomLabel } from '@/lib/idiom'
import type { Idiom } from '@/types/models'

export interface CardAvailableDeckProps {
  label: string
  nativeIdiom: Idiom
  learningIdiom: Idiom
  disabled: boolean
  copying: boolean
  onCopy: () => void
}

export function CardAvailableDeck({
  label,
  nativeIdiom,
  learningIdiom,
  disabled,
  copying,
  onCopy,
}: CardAvailableDeckProps) {
  return (
    <Card variant="outlined">        
      <CardContent>
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            component="span"
            display="flex"
            sx={{ color: 'text.secondary' }}
            aria-label={`${idiomLabel(nativeIdiom)} to ${idiomLabel(learningIdiom)}`}
          >
            <FlagsRelated
              firstIdiom={nativeIdiom}
              secondIdiom={learningIdiom}
              height={22}
            />
            <Typography variant="subtitle1">{label}</Typography>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            disabled={disabled}
            onClick={() => void onCopy()}
          >
            {copying ? 'Copying…' : 'Copy to this device'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
