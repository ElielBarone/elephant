import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import MicIcon from '@mui/icons-material/Mic'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ComposeCardView } from '@/components/ComposeCardView'
import { FlagsRelated } from '@/components/FlagsRelated'
import { WordReveal } from '@/components/WordReveal'
import {
  ensureSchedulingForDeck,
  getDeck,
  listScheduling,
  saveScheduling,
} from '@/lib/db/deckStorage'
import {
  computeComposeScore,
  countPhraseWords,
  pickRandomHiddenWordIndex,
} from '@/lib/scheduler/composeScore'
import { buildComposeFlowConfig, ComposePhase } from '@/lib/scheduler/cardFlow'
import { applyRating, sortDueFirst } from '@/lib/scheduler/scheduler'
import { speakWithIdiom } from '@/lib/tts/speak'
import { createSpeechRecognizer, isSpeechRecognitionSupported } from '@/lib/voice/speechRecognition'
import type { CardSchedule, Deck, Idiom, Phrase } from '@/types/models'

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

export function ComposeStudyPage() {
  const { deckId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [rows, setRows] = useState<StudyRow[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [initialPending, setInitialPending] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [sessionRated, setSessionRated] = useState(0)
  const [attempt, setAttempt] = useState('')
  const [tipRevealedIndices, setTipRevealedIndices] = useState<Set<number>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [acceptanceFlash, setAcceptanceFlash] = useState<'accepted' | 'rejected' | null>(null)
  const [listening, setListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(() =>
    isSpeechRecognitionSupported(),
  )
  const [ttsPlaying, setTtsPlaying] = useState(false)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const speechRecognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null)
  const idleSubmitTimerRef = useRef<number | null>(null)
  const submittedRef = useRef(false)

  useEffect(() => {
    submittedRef.current = submitted
  }, [submitted])

  const clearIdleSubmitTimer = useCallback(() => {
    if (idleSubmitTimerRef.current !== null) {
      window.clearTimeout(idleSubmitTimerRef.current)
      idleSubmitTimerRef.current = null
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!deckId) {
      return
    }
    const now = Date.now()
    const found = await getDeck(deckId)
    if (!found) {
      setDeck(null)
      setRows([])
      setPendingCount(0)
      setLoading(false)
      return
    }
    await ensureSchedulingForDeck(found, now, 'compose')
    const schedules = await listScheduling(deckId, 'compose')
    const nextRows = buildRows(found, schedules, now)
    const due = nextRows.filter((row) => row.schedule.due <= now).length
    setDeck(found)
    setRows(nextRows)
    setPendingCount(due)
    setInitialPending((prev) => (prev === null ? due : prev))
    setLoading(false)
  }, [deckId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    setActiveIndex(0)
    setSessionRated(0)
    setInitialPending(null)
  }, [deckId])

  const safeIndex = Math.min(activeIndex, Math.max(0, rows.length - 1))
  const active = rows[safeIndex]

  useEffect(() => {
    setAttempt('')
    setTipRevealedIndices(new Set())
    setSubmitted(false)
    setAcceptanceFlash(null)
    setCurrentPhaseIndex(0)
    clearIdleSubmitTimer()
  }, [active?.phrase.id, clearIdleSubmitTimer])

  const liveScore = useMemo(() => {
    if (!active) {
      return null
    }
    return computeComposeScore(active.phrase.original, attempt, tipRevealedIndices, {
      submitted,
    })
  }, [active, attempt, tipRevealedIndices, submitted])

  const totalWords = useMemo(
    () => (active ? countPhraseWords(active.phrase.original) : 0),
    [active],
  )

  const allWordsRevealedOrCorrect = useMemo(() => {
    if (!liveScore) {
      return true
    }
    return liveScore.wordStates.every((state) => state !== 'hidden')
  }, [liveScore])

  const progress = useMemo(() => {
    if (initialPending === null || initialPending === 0) {
      return 0
    }
    const done = initialPending - pendingCount
    return Math.min(100, Math.max(0, (done / initialPending) * 100))
  }, [initialPending, pendingCount])

  const playText = useCallback(async (text: string, idiom: Idiom) => {
    const recognizer = speechRecognizerRef.current
    if (recognizer) {
      recognizer.stop()
    }
    setTtsPlaying(true)
    try {
      await speakWithIdiom(text, idiom)
    } catch {
      // ignore
    } finally {
      setTtsPlaying(false)
    }
  }, [])

  const speakTranslation = useCallback(() => {
    if (!deck || !active) {
      return
    }
    if (deck.ttsAnswerEnabled === false) {
      return
    }
    void playText(active.phrase.translated, deck.nativeIdiom)
  }, [active, deck, playText])

  const handleRevealTip = useCallback(() => {
    if (!liveScore) {
      return
    }
    const index = pickRandomHiddenWordIndex(liveScore.wordStates)
    if (index === null) {
      return
    }
    setTipRevealedIndices((prev) => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }, [liveScore])

  const startListeningOnce = useCallback(
    (options?: { onEnd?: () => void }): boolean => {
      if (!deck || !active) {
        return false
      }
      const language = speechLanguageByIdiom[deck.learningIdiom] ?? 'en-US'
      const recognizer = createSpeechRecognizer({
        lang: language,
        continuous: false,
        interimResults: false,
        maxAlternatives: 1,
        onStart: () => setListening(true),
        onResult: (transcript) => {
          setAttempt((prev) => {
            const trimmed = prev.trim()
            return trimmed.length === 0 ? transcript : `${trimmed} ${transcript}`
          })
        },
        onError: () => {
          setListening(false)
          options?.onEnd?.()
        },
        onEnd: () => {
          setListening(false)
          options?.onEnd?.()
        },
      })
      speechRecognizerRef.current = recognizer
      setSpeechSupported(recognizer.isSupported)
      if (!recognizer.isSupported) {
        options?.onEnd?.()
        return false
      }
      try {
        recognizer.start()
        return true
      } catch {
        options?.onEnd?.()
        return false
      }
    },
    [active, deck],
  )

  const handleStartListening = useCallback(() => {
    startListeningOnce()
  }, [startListeningOnce])

  useEffect(() => {
    return () => {
      const recognizer = speechRecognizerRef.current
      if (recognizer) {
        recognizer.stop()
      }
      clearIdleSubmitTimer()
    }
  }, [clearIdleSubmitTimer])

  const composePhases = useMemo<ComposePhase[]>(
    () => (deck ? buildComposeFlowConfig(deck) : []),
    [deck],
  )
  const currentPhase = composePhases[currentPhaseIndex]

  const advancePhase = useCallback(() => {
    setCurrentPhaseIndex((index) => Math.min(index + 1, composePhases.length - 1))
  }, [composePhases.length])

  useEffect(() => {
    if (!active || !deck || submitted) {
      return
    }
    if (!currentPhase) {
      return
    }

    let isCurrent = true

    if (currentPhase === ComposePhase.PlayTranslationTts) {
      void (async () => {
        await playText(active.phrase.translated, deck.nativeIdiom)
        if (!isCurrent) {
          return
        }
        advancePhase()
      })()
      return () => {
        isCurrent = false
      }
    }

    if (currentPhase === ComposePhase.ListenAnswer) {
      if (speechSupported === false) {
        advancePhase()
        return () => {
          isCurrent = false
        }
      }
      startListeningOnce({
        onEnd: () => {
          if (!isCurrent) {
            return
          }
          advancePhase()
        },
      })
      return () => {
        isCurrent = false
        const recognizer = speechRecognizerRef.current
        if (recognizer) {
          recognizer.stop()
        }
      }
    }

    return () => {
      isCurrent = false
    }
  }, [active, advancePhase, currentPhase, deck, playText, speechSupported, startListeningOnce, submitted])

  const advanceAfterRating = useCallback(async () => {
    if (!deckId) {
      return
    }
    const now = Date.now()
    const schedules = await listScheduling(deckId, 'compose')
    const pendingAfter = schedules.filter((s) => s.due <= now).length
    if (pendingAfter === 0) {
      navigate(`/deck/${deckId}/study/done`, { replace: true })
      return
    }
    await refresh()
    setActiveIndex(0)
  }, [deckId, navigate, refresh])

  const handleCheck = useCallback(async () => {
    if (!active || !deckId || submittedRef.current) {
      return
    }
    clearIdleSubmitTimer()
    const recognizer = speechRecognizerRef.current
    if (recognizer) {
      recognizer.stop()
    }
    const finalScore = computeComposeScore(
      active.phrase.original,
      attempt,
      tipRevealedIndices,
      { submitted: true },
    )
    setSubmitted(true)
    submittedRef.current = true
    setAcceptanceFlash(finalScore.accepted ? 'accepted' : 'rejected')

    const now = Date.now()
    const next = applyRating(active.schedule, finalScore.rating, now)
    await saveScheduling(next)
    setSessionRated((count) => count + 1)

    window.setTimeout(() => {
      void advanceAfterRating()
    }, 1200)
  }, [active, advanceAfterRating, attempt, clearIdleSubmitTimer, deckId, tipRevealedIndices])

  useEffect(() => {
    if (!active || submitted) {
      clearIdleSubmitTimer()
      return
    }
    if (attempt.trim().length === 0) {
      clearIdleSubmitTimer()
      return
    }
    if (!liveScore) {
      return
    }

    clearIdleSubmitTimer()

    if (liveScore.percentage >= 100) {
      void handleCheck()
      return
    }

    const delay = liveScore.accepted ? 700 : 1500
    idleSubmitTimerRef.current = window.setTimeout(() => {
      idleSubmitTimerRef.current = null
      void handleCheck()
    }, delay)

    return () => {
      clearIdleSubmitTimer()
    }
  }, [active, attempt, clearIdleSubmitTimer, handleCheck, liveScore, submitted])

  if (!deckId) {
    return <Alert severity="error">{t('general.missingDeck')}</Alert>
  }

  if (loading) {
    return <Typography>{t('general.loading')}</Typography>
  }

  if (!deck) {
    return <Alert severity="warning">{t('general.deckNotFound')}</Alert>
  }

  if (deck.phrases.length === 0) {
    return (
      <Stack spacing={2}>
        <Typography>{t('study.thisDeckNoPhrases')}</Typography>
        <Typography
          color="primary"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate(`/deck/${deck.id}/phrases`)}
        >
          {t('study.addPhrases')}
        </Typography>
      </Stack>
    )
  }

  if (!active || !liveScore) {
    return <Alert severity="info">{t('study.noStudyRows')}</Alert>
  }

  const nextDue = rows
    .map((row) => row.schedule.due)
    .filter((due) => due > Date.now())
    .sort((a, b) => a - b)[0]

  const hasDue = rows.some((row) => row.schedule.due <= Date.now())
  const speakDisabled = deck.ttsAnswerEnabled === false

  const tipDisabled = submitted || allWordsRevealedOrCorrect

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
          >
            <FlagsRelated
              firstIdiom={deck.nativeIdiom}
              secondIdiom={deck.learningIdiom}
              height={22}
            />
            <Typography variant="subtitle2" color="text.secondary">
              {deck.title}
            </Typography>
          </Stack>
        </Box>
        <IconButton
          aria-label={t('compose.speakTranslation')}
          disabled={speakDisabled}
          onClick={speakTranslation}
        >
          {speakDisabled ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
      </Stack>

      {!hasDue ? (
        <Alert severity="info">
          {t('study.nothingDue')}
          {nextDue ? (
            <span> {t('study.nextCardAround', { time: new Date(nextDue).toLocaleString() })}</span>
          ) : null}{' '}
          {t('study.reviewEarly')}
        </Alert>
      ) : null}

      <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 999 }} />
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary">
          {t('study.reviewedQueue', {
            reviewed: sessionRated,
            total: initialPending ?? 0,
            queue: rows.length,
          })}
        </Typography>
        <Typography
          variant="caption"
          color={pendingCount > 0 ? 'primary.main' : 'text.secondary'}
          sx={{ fontWeight: pendingCount > 0 ? 600 : 'inherit' }}
        >
          {t('deck.pending', { count: pendingCount })}
        </Typography>
      </Stack>

      <ComposeCardView
        title={t('compose.translation')}
        translation={active.phrase.translated}
        answerLabel={t('compose.yourPhrase')}
        answer={
          <WordReveal
            expected={active.phrase.original}
            wordStates={liveScore.wordStates}
            onDark
          />
        }
        answerMeta={
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            {t('compose.score', {
              correct: liveScore.correctCount,
              total: totalWords,
              percent: Math.round(liveScore.percentage),
            })}
          </Typography>
        }
      />


      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          fullWidth
          size="small"
          autoFocus
          value={attempt}
          onChange={(event) => setAttempt(event.target.value)}
          placeholder={t('compose.yourAnswer')}
          disabled={submitted}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleCheck()
            }
          }}
          slotProps={
            {
              input: {
                endAdornment: 
                <IconButton
          aria-label={t('compose.startListening')}
          onClick={handleStartListening}
          disabled={submitted || speechSupported === false || ttsPlaying}
          color={listening ? 'primary' : 'default'}
        >
          <MicIcon />
        </IconButton>
              }
            }
          }
        />
        
      </Stack>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, minHeight: 24 }}>
        {acceptanceFlash === 'accepted' ? (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <CheckCircleIcon color="success" fontSize="small" />
            <Typography variant="caption" color="success.main">
              {t('compose.accepted', { percent: Math.round(liveScore.percentage) })}
            </Typography>
          </Stack>
        ) : null}
        {acceptanceFlash === 'rejected' ? (
          <Typography variant="caption" color="warning.main">
            
            {t('compose.notAccepted', { percent: Math.round(liveScore.percentage) })}
          </Typography>
        ) : null}
      </Box>

      <Button
          variant="outlined"          
          color="warning"
          startIcon={<LightbulbOutlinedIcon />}
          onClick={handleRevealTip}
          disabled={tipDisabled}
        >
          {t('compose.tip')}
        </Button>
    </Stack>
  )
}
