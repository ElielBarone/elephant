import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FlipCard } from '@/components/FlipCard'
import { RatingBar } from '@/components/RatingBar'
import {
  ensureSchedulingForDeck,
  getDeck,
  listScheduling,
  saveScheduling,
} from '@/lib/db/deckStorage'
import { idiomLabel } from '@/lib/idiom'
import { applyRating, sortDueFirst } from '@/lib/scheduler/scheduler'
import { speakWithIdiom } from '@/lib/tts/speak'
import type { CardSchedule, Deck, Phrase, Rating } from '@/types/models'

interface StudyRow {
  phrase: Phrase
  schedule: CardSchedule
}

function buildRows(deck: Deck, schedules: CardSchedule[], now: number): StudyRow[] {
  const map = new Map(schedules.map((row) => [row.cardId, row]))
  const rows: StudyRow[] = []
  for (const phrase of deck.phrases) {
    const schedule = map.get(phrase.id)
    if (schedule) {
      rows.push({ phrase, schedule })
    }
  }
  rows.sort((a, b) => sortDueFirst(a.schedule, b.schedule, now))
  return rows
}

export function StudyPage() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [rows, setRows] = useState<StudyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [flipped, setFlipped] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [sessionRated, setSessionRated] = useState(0)
  const [sessionTarget, setSessionTarget] = useState(0)

  const refresh = useCallback(async () => {
    if (!deckId) {
      return
    }
    const now = Date.now()
    const found = await getDeck(deckId)
    if (!found) {
      setDeck(null)
      setRows([])
      setLoading(false)
      return
    }
    await ensureSchedulingForDeck(found, now)
    const schedules = await listScheduling(deckId)
    setDeck(found)
    setRows(buildRows(found, schedules, now))
    setLoading(false)
  }, [deckId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    setActiveIndex(0)
    setFlipped(false)
    setSessionRated(0)
    setSessionTarget(0)
  }, [deckId])

  useEffect(() => {
    if (rows.length > 0 && sessionTarget === 0) {
      setSessionTarget(rows.length)
    }
  }, [rows.length, sessionTarget])

  const safeIndex = Math.min(activeIndex, Math.max(0, rows.length - 1))
  const active = rows[safeIndex]

  const progress = useMemo(() => {
    if (sessionTarget === 0) {
      return 0
    }
    return Math.min(100, (sessionRated / sessionTarget) * 100)
  }, [sessionRated, sessionTarget])

  const speakVisibleSide = useCallback(() => {
    if (!deck || !active) {
      return
    }
    if (flipped) {
      speakWithIdiom(active.phrase.translated, deck.nativeIdiom)
    } else {
      speakWithIdiom(active.phrase.original, deck.learningIdiom)
    }
  }, [active, deck, flipped])

  useEffect(() => {
    if (!active || !deck) {
      return
    }
    speakWithIdiom(active.phrase.original, deck.learningIdiom)
  }, [active?.phrase.id, deck])

  useEffect(() => {
    if (!active || !deck || !flipped) {
      return
    }
    speakWithIdiom(active.phrase.translated, deck.nativeIdiom)
  }, [active?.phrase.id, flipped, deck])

  const handleRate = async (rating: Rating) => {
    if (!active) {
      return
    }
    const next = applyRating(active.schedule, rating, Date.now())
    await saveScheduling(next)
    setFlipped(false)
    setSessionRated((count) => count + 1)
    await refresh()
    setActiveIndex(0)
  }

  if (!deckId) {
    return <Alert severity="error">Missing deck</Alert>
  }

  if (loading) {
    return <Typography>Loading…</Typography>
  }

  if (!deck) {
    return <Alert severity="warning">Deck not found</Alert>
  }

  if (deck.phrases.length === 0) {
    return (
      <Stack spacing={2}>
        <Typography>This deck has no phrases yet.</Typography>
        <Typography
          color="primary"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate(`/deck/${deck.id}/phrases`)}
        >
          Add phrases
        </Typography>
      </Stack>
    )
  }

  if (!active) {
    return <Alert severity="info">No study rows available.</Alert>
  }

  const nextDue = rows
    .map((row) => row.schedule.due)
    .filter((due) => due > Date.now())
    .sort((a, b) => a - b)[0]

  const hasDue = rows.some((row) => row.schedule.due <= Date.now())

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton aria-label="back" onClick={() => navigate(`/deck/${deck.id}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {deck.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {idiomLabel(deck.learningIdiom)} prompt · {idiomLabel(deck.nativeIdiom)} answer
          </Typography>
        </Box>
        <IconButton aria-label="speak visible side" onClick={() => speakVisibleSide()}>
          <VolumeUpIcon />
        </IconButton>
      </Stack>

      {!hasDue ? (
        <Alert severity="info">
          Nothing is due right now.
          {nextDue ? (
            <span>
              {' '}
              Next card around {new Date(nextDue).toLocaleString()}.
            </span>
          ) : null}{' '}
          You can still review early in due order.
        </Alert>
      ) : null}

      <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 999 }} />
      <Typography variant="caption" color="text.secondary">
        Reviewed {sessionRated}
        {sessionTarget > 0 ? ` of ${sessionTarget}` : ''} · {rows.length} in queue
      </Typography>

      <FlipCard
        frontTitle="Prompt"
        backTitle="Translation"
        frontText={active.phrase.original}
        backText={active.phrase.translated}
        flipped={flipped}
        onToggle={() => setFlipped((value) => !value)}
      />

      <RatingBar disabled={!flipped} onRate={(rating) => void handleRate(rating)} />
    </Stack>
  )
}
