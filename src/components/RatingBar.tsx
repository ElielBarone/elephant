import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import type { Rating } from '@/types/models'

export interface RatingBarProps {
  disabled?: boolean
  onRate: (rating: Rating) => void
}

export function RatingBar({ disabled, onRate }: RatingBarProps) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: '100%' }}>
      <Button
        fullWidth
        size="large"
        variant="outlined"
        color="warning"
        disabled={disabled}
        onClick={() => onRate('hard')}
      >
        Hard
      </Button>
      <Button
        fullWidth
        size="large"
        variant="contained"
        color="primary"
        disabled={disabled}
        onClick={() => onRate('good')}
      >
        Good
      </Button>
      <Button
        fullWidth
        size="large"
        variant="outlined"
        color="success"
        disabled={disabled}
        onClick={() => onRate('easy')}
      >
        Easy
      </Button>
    </Stack>
  )
}
