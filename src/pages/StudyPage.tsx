import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FlagsRelated } from '@/components/FlagsRelated'
import { FlipCard } from '@/components/FlipCard'
import { RatingBar } from '@/components/RatingBar'
import { useSplashScreen } from '@/components/SplashScreen'
import {
  ensureSchedulingForDeck,
  getDeck,
  listScheduling,
  saveScheduling,
} from '@/lib/db/deckStorage'
import { idiomLabel } from '@/lib/idiom'
import { applyRating, sortDueFirst } from '@/lib/scheduler/scheduler'
import { speakWithIdiom } from '@/lib/tts/speak'
import { createSpeechRecognizer, arePhrasesSimilar } from '@/lib/voice/speechRecognition'
import { getRatingFromTranscript } from '@/lib/voice/ratingCommands'
import type { CardSchedule, Deck, Phrase, Rating } from '@/types/models'

interface StudyRow {
  phrase: Phrase
  schedule: CardSchedule
}

const speechLanguageByIdiom: Record<string, string> = {
  ptBR: 'pt-BR',
  enUS: 'en-US',
  enGB: 'en-GB',
  itIT: 'it-IT',
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
  const [, splashScreenActions] = useSplashScreen()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [rows, setRows] = useState<StudyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [flipped, setFlipped] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [sessionRated, setSessionRated] = useState(0)
  const [sessionTarget, setSessionTarget] = useState(0)
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null)
  const [listening, setListening] = useState(false)
  const [speechTranscript, setSpeechTranscript] = useState('')
  const [speechError, setSpeechError] = useState<string | null>(null)
  const speechRecognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null)
  const completionSplashVisible = useRef(false)

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
    completionSplashVisible.current = false
  }, [deckId])

  useEffect(() => {
    if (rows.length > 0 && sessionTarget === 0) {
      setSessionTarget(rows.length)
    }
  }, [rows.length, sessionTarget])

  useEffect(() => {
    if (!deck || sessionTarget === 0 || sessionRated < sessionTarget || completionSplashVisible.current) {
      return
    }

    const startAgain = () => {
      setFlipped(false)
      setActiveIndex(0)
      setSessionRated(0)
      setSessionTarget(rows.length)
      completionSplashVisible.current = false
      splashScreenActions.hide()
    }

    const openDecks = () => {
      splashScreenActions.hide()
      navigate('/')
    }

    splashScreenActions.show(
      'well-done',
      {
        title: 'Congratulations!',
        message: "I'm proud of you, come back tomorrow.",
      },
      'happy',
      <Stack spacing={1.5}>        
        <Button variant="contained" onClick={openDecks}>
          Back to Decks
        </Button>
        <Button variant="outlined" onClick={startAgain}>
          Start Again
        </Button>
      </Stack>,
      0,
    )
    completionSplashVisible.current = true
  }, [deck, navigate, rows.length, sessionRated, sessionTarget, splashScreenActions])

  const safeIndex = Math.min(activeIndex, Math.max(0, rows.length - 1))
  const active = rows[safeIndex]

  const progress = useMemo(() => {
    if (sessionTarget === 0) {
      return 0
    }
    return Math.min(100, (sessionRated / sessionTarget) * 100)
  }, [sessionRated, sessionTarget])

  const promptTtsOn = deck?.ttsPromptEnabled !== false
  const answerTtsOn = deck?.ttsAnswerEnabled !== false

  const speakVisibleSide = useCallback(() => {
    if (!deck || !active) {
      return
    }
    if (flipped) {
      if (deck.ttsAnswerEnabled === false) {
        return
      }
      speakWithIdiom(active.phrase.translated, deck.nativeIdiom)
    } else {
      if (deck.ttsPromptEnabled === false) {
        return
      }
      speakWithIdiom(active.phrase.original, deck.learningIdiom)
    }
  }, [active, deck, flipped])

  useEffect(() => {
    if (!active || !deck || deck.ttsPromptEnabled === false) {
      return
    }
    speakWithIdiom(active.phrase.original, deck.learningIdiom)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only when card id or prompt TTS flag changes
  }, [active?.phrase.id, deck?.id, deck?.ttsPromptEnabled])

  useEffect(() => {
    if (!active || !deck || !flipped || deck.ttsAnswerEnabled === false) {
      return
    }
    speakWithIdiom(active.phrase.translated, deck.nativeIdiom)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only when card, flip, or answer TTS flag changes
  }, [active?.phrase.id, flipped, deck?.id, deck?.ttsAnswerEnabled])

  useEffect(() => {
    if (!active || !deck || flipped) {
      return
    }

    const language = speechLanguageByIdiom[deck.learningIdiom] ?? 'en-US'
    let isCurrent = true

    setSpeechError(null)
    setSpeechTranscript('')

    const recognizer = createSpeechRecognizer({
      lang: language,
      continuous: true,
      interimResults: false,
      maxAlternatives: 1,
      onStart: () => {
        if (!isCurrent) {
          return
        }
        setListening(true)
      },
      onResult: (transcript) => {
        if (!isCurrent) {
          return
        }
        setSpeechTranscript(transcript)
        if (arePhrasesSimilar(active.phrase.original, transcript)) {
          setFlipped(true)
        }
      },
      onError: (message) => {
        if (!isCurrent) {
          return
        }
        setSpeechError(message)
      },
      onEnd: () => {
        if (!isCurrent) {
          return
        }
        setListening(false)
      },
    })

    speechRecognizerRef.current = recognizer
    setSpeechSupported(recognizer.isSupported)

    if (!recognizer.isSupported) {
      setSpeechError('Speech recognition is unavailable in this browser.')
      return
    }

    try {
      recognizer.start()
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : String(error))
    }

    return () => {
      isCurrent = false
      recognizer.stop()
      speechRecognizerRef.current = null
      setListening(false)
    }
  }, [active?.phrase.id, active?.phrase.original, deck?.learningIdiom, flipped])

  const handleRate = useCallback(async (rating: Rating) => {
    if (!active) {
      return
    }
    const next = applyRating(active.schedule, rating, Date.now())
    await saveScheduling(next)
    setFlipped(false)
    setSessionRated((count) => count + 1)
    await refresh()
    setActiveIndex(0)
  }, [active, refresh])

  useEffect(() => {
    if (!active || !deck || !flipped) {
      return
    }

    const language = 'en-US' // Use English for rating recognition since most commands are English-based
    let isCurrent = true

    const ratingRecognizer = createSpeechRecognizer({
      lang: language,
      continuous: true,
      interimResults: false,
      maxAlternatives: 1,
      onStart: () => {
        if (!isCurrent) {
          return
        }
        // Rating listening started
      },
      onResult: (transcript) => {
        if (!isCurrent) {
          return
        }
        const rating = getRatingFromTranscript(transcript)
        if (rating) {
          void handleRate(rating)
        }
      },
      onError: () => {
        // Rating recognition error - silently ignore
      },
      onEnd: () => {
        // Rating listening ended
      },
    })

    if (ratingRecognizer.isSupported) {
      try {
        ratingRecognizer.start()
      } catch (error) {
        // Silently handle rating recognition start errors
      }
    }

    return () => {
      isCurrent = false
      ratingRecognizer.stop()
    }
  }, [active?.phrase.id, deck?.nativeIdiom, flipped, handleRate])

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

  const speakButtonDisabled = flipped ? !answerTtsOn : !promptTtsOn

  return (
    <Stack spacing={2.5} sx={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton aria-label="back" onClick={() => navigate(`/deck/${deck.id}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            flexWrap="wrap"
            useFlexGap
            sx={{ color: 'text.secondary' }}
            aria-label={`${idiomLabel(deck.learningIdiom)} prompt, ${idiomLabel(deck.nativeIdiom)} answer`}
          >
            
            <FlagsRelated
              firstIdiom={deck.learningIdiom}
              secondIdiom={deck.nativeIdiom}
              height={22}
            />

<Typography variant="subtitle2" color="text.secondary">
            {deck.title}
          </Typography>
            
          </Stack>
        </Box>
        <IconButton
          aria-label="speak visible side"
          disabled={speakButtonDisabled}
          onClick={() => speakVisibleSide()}
        >
          {speakButtonDisabled ? <VolumeOffIcon /> : <VolumeUpIcon />}
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

      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <FlipCard
          frontTitle="Prompt"
          backTitle="Translation"
          frontText={active.phrase.original}
          backText={active.phrase.translated}
          flipped={flipped}
          onToggle={() => setFlipped((value) => !value)}
        />
        <Typography
          variant="caption"
          color={speechError ? 'error.main' : 'text.secondary'}
          sx={{ mt: 1 }}
        >
          {speechError
            ? speechError
            : speechSupported === false
            ? 'Speech recognition not available. Tap to flip manually.'
            : listening
            ? 'Listening for your pronunciation…'
            : flipped
            ? 'Say "hard", "good", or "easy" to rate the card.'
            : 'Speak the prompt aloud to flip the card.'}
        </Typography>
        {speechTranscript ? (
          <Typography variant="caption" color="text.secondary">
            Heard: {speechTranscript}
          </Typography>
        ) : null}
      </Box>

      <RatingBar disabled={!flipped} onRate={(rating) => void handleRate(rating)} />
    </Stack>
  )
}
