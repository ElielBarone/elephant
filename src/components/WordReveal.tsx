import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ComposeWordState } from '@/lib/scheduler/composeScore'

export interface WordRevealProps {
  expected: string
  wordStates: ComposeWordState[]
  onDark?: boolean
}

function buildPlaceholder(word: string): string {
  return '▁'.repeat(word.length)
}

interface WordToken {
  key: string
  kind: 'word' | 'space'
  token: string
  wordIndex: number
}

function tokenize(expected: string): WordToken[] {
  const raw = expected.split(/(\s+)/)
  const out: WordToken[] = []
  let wordIndex = 0
  raw.forEach((token, index) => {
    if (token === '') {
      return
    }
    if (/\s+/.test(token)) {
      out.push({ key: `s-${index}`, kind: 'space', token, wordIndex: -1 })
      return
    }
    out.push({ key: `w-${index}`, kind: 'word', token, wordIndex })
    wordIndex += 1
  })
  return out
}

export function WordReveal({ expected, wordStates, onDark = false }: WordRevealProps) {
  const tokens = tokenize(expected)
  const correctColor = onDark ? 'info.light' : 'primary.main'
  const missedColor = onDark ? 'warning.light' : 'warning.main'
  const hiddenColor = onDark ? 'rgba(255,255,255,0.45)' : 'text.disabled'

  return (
    <Typography
      variant="h6"
      component="div"
      sx={{ textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.6 }}
    >
      {tokens.map((entry) => {
        if (entry.kind === 'space') {
          return <span key={entry.key}>{entry.token}</span>
        }

        const state = wordStates[entry.wordIndex] ?? 'hidden'

        if (state === 'correct') {
          return (
            <Box
              key={entry.key}
              component="span"
              sx={{ color: correctColor, fontWeight: 600 }}
            >
              {entry.token}
            </Box>
          )
        }

        if (state === 'missed' || state === 'tipRevealed') {
          return (
            <Box
              key={entry.key}
              component="span"
              sx={{ color: missedColor, fontWeight: 600 }}
            >
              {entry.token}
            </Box>
          )
        }

        return (
          <Box
            key={entry.key}
            component="span"
            sx={{
              color: hiddenColor,
              letterSpacing: '0.1em',
              fontFamily: 'monospace',
            }}
          >
            {buildPlaceholder(entry.token)}
          </Box>
        )
      })}
    </Typography>
  )
}
