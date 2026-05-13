import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined'
import MicIcon from '@mui/icons-material/Mic'
import SendIcon from '@mui/icons-material/Send'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
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
import { applyRating, sortDueFirst } from '@/lib/scheduler/scheduler'
import { speakWithIdiom } from '@/lib/tts/speak'
import { createSpeechRecognizer, isSpeechRecognitionSupported } from '@/lib/voice/speechRecognition'
import type { CardSchedule, Deck, Idiom, Phrase } from '@/types/models'

type ComposeFlowStatus = 'speech' | 'listening' | 'idle' | 'inputting' | 'rating'

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

function initialComposeFlowStatus(deck: Deck): ComposeFlowStatus {
  if (deck.ttsAnswerEnabled !== false) {
    return 'speech'
  }
  if (deck.voiceAutoFlipEnabled !== false && isSpeechRecognitionSupported()) {
    return 'listening'
  }
  return 'idle'
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
  const [acceptanceFlash, setAcceptanceFlash] = useState<'accepted' | 'rejected' | null>(null)
  const [flowStatus, setFlowStatus] = useState<ComposeFlowStatus>('idle')
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(() =>
    isSpeechRecognitionSupported(),
  )
  const speechRecognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null)
  const idleSubmitTimerRef = useRef<number | null>(null)
  const advanceAfterRatingTimerRef = useRef<number | null>(null)
  const submittedRef = useRef(false)
  const lastAttemptChangeFromSpeechRef = useRef(false)
  const flowStatusRef = useRef<ComposeFlowStatus>('idle')

  useEffect(() => {
    flowStatusRef.current = flowStatus
  }, [flowStatus])

  useEffect(() => {
    submittedRef.current = flowStatus === 'rating'
  }, [flowStatus])

  const clearIdleSubmitTimer = useCallback(() => {
    if (idleSubmitTimerRef.current !== null) {
      window.clearTimeout(idleSubmitTimerRef.current)
      idleSubmitTimerRef.current = null
    }
  }, [])

  const clearAdvanceAfterRatingTimer = useCallback(() => {
    if (advanceAfterRatingTimerRef.current !== null) {
      window.clearTimeout(advanceAfterRatingTimerRef.current)
      advanceAfterRatingTimerRef.current = null
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
  const activePhraseIdRef = useRef<string | undefined>(undefined)
  const deckRef = useRef<Deck | null>(null)

  useEffect(() => {
    activePhraseIdRef.current = active?.phrase.id
  }, [active?.phrase.id])

  useEffect(() => {
    deckRef.current = deck
  }, [deck])

  useEffect(() => {
    setAttempt('')
    setTipRevealedIndices(new Set())
    setAcceptanceFlash(null)
    clearIdleSubmitTimer()
    clearAdvanceAfterRatingTimer()
    lastAttemptChangeFromSpeechRef.current = false
    submittedRef.current = false
    const currentDeck = deckRef.current
    if (currentDeck) {
      setFlowStatus(initialComposeFlowStatus(currentDeck))
    } else {
      setFlowStatus('idle')
    }
  }, [active?.phrase.id, clearAdvanceAfterRatingTimer, clearIdleSubmitTimer])

  const isRating = flowStatus === 'rating'

  const liveScore = useMemo(() => {
    if (!active) {
      return null
    }
    return computeComposeScore(active.phrase.original, attempt, tipRevealedIndices, {
      submitted: isRating,
    })
  }, [active, attempt, tipRevealedIndices, isRating])

  const cardWordScore = useMemo(() => {
    if (!active) {
      return null
    }
    const attemptForCard = isRating ? attempt : ''
    return computeComposeScore(active.phrase.original, attemptForCard, tipRevealedIndices, {
      submitted: isRating,
    })
  }, [active, attempt, tipRevealedIndices, isRating])

  const totalWords = useMemo(
    () => (active ? countPhraseWords(active.phrase.original) : 0),
    [active],
  )

  const allWordsRevealedOrCorrect = useMemo(() => {
    if (!cardWordScore) {
      return true
    }
    return cardWordScore.wordStates.every((state) => state !== 'hidden')
  }, [cardWordScore])

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
    try {
      await speakWithIdiom(text, idiom)
    } catch {
      // ignore
    }
  }, [])

  const speakTranslation = useCallback(() => {
    if (!deck || !active || flowStatus === 'rating') {
      return
    }
    if (deck.ttsAnswerEnabled === false) {
      return
    }
    setFlowStatus('speech')
  }, [active, deck, flowStatus])

  const handleRevealTip = useCallback(() => {
    if (!cardWordScore) {
      return
    }
    const index = pickRandomHiddenWordIndex(cardWordScore.wordStates)
    if (index === null) {
      return
    }
    setTipRevealedIndices((prev) => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }, [cardWordScore])

  const startListeningOnce = useCallback(
    (options?: {
      continuous?: boolean
      keepListeningIndicatorAcrossRestarts?: boolean
      onEnd?: () => void
    }): boolean => {
      if (!deck || !active) {
        return false
      }
      const phraseIdWhenStarted = active.phrase.id
      const language = speechLanguageByIdiom[deck.learningIdiom] ?? 'en-US'
      const recognizer = createSpeechRecognizer({
        lang: language,
        continuous: options?.continuous ?? false,
        interimResults: false,
        maxAlternatives: 1,
        onStart: () => {},
        onResult: (transcript) => {
          lastAttemptChangeFromSpeechRef.current = true
          setAttempt((prev) => {
            const trimmed = prev.trim()
            return trimmed.length === 0 ? transcript : `${trimmed} ${transcript}`
          })
        },
        onError: () => {
          if (activePhraseIdRef.current !== phraseIdWhenStarted) {
            return
          }
          setFlowStatus('idle')
          options?.onEnd?.()
        },
        onEnd: () => {
          if (activePhraseIdRef.current !== phraseIdWhenStarted) {
            return
          }
          if (!options?.keepListeningIndicatorAcrossRestarts) {
            setFlowStatus('idle')
          }
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
        if (activePhraseIdRef.current === phraseIdWhenStarted) {
          setFlowStatus('idle')
        }
        options?.onEnd?.()
        return false
      }
    },
    [active, deck],
  )

  const handleMicToggle = useCallback(() => {
    if (flowStatus === 'rating' || flowStatus === 'speech' || speechSupported === false) {
      return
    }
    if (flowStatus === 'listening') {
      speechRecognizerRef.current?.stop()
      setFlowStatus('idle')
      return
    }
    if (flowStatus === 'idle' || flowStatus === 'inputting') {
      setFlowStatus('listening')
    }
  }, [flowStatus, speechSupported])

  useEffect(() => {
    return () => {
      const recognizer = speechRecognizerRef.current
      if (recognizer) {
        recognizer.stop()
      }
      clearIdleSubmitTimer()
      clearAdvanceAfterRatingTimer()
    }
  }, [clearAdvanceAfterRatingTimer, clearIdleSubmitTimer])

  useEffect(() => {
    if (!active || !deck || flowStatus !== 'speech') {
      return
    }

    let cancelled = false

    void (async () => {
      await playText(active.phrase.translated, deck.nativeIdiom)
      if (cancelled) {
        return
      }
      const nextListening =
        deck.voiceAutoFlipEnabled !== false && speechSupported !== false
      setFlowStatus(nextListening ? 'listening' : 'idle')
    })()

    return () => {
      cancelled = true
    }
  }, [
    active,
    deck,
    active?.phrase.id,
    deck?.id,
    deck?.nativeIdiom,
    deck?.ttsAnswerEnabled,
    deck?.voiceAutoFlipEnabled,
    flowStatus,
    playText,
    speechSupported,
  ])

  useEffect(() => {
    if (!active || !deck || flowStatus !== 'listening') {
      return
    }
    if (speechSupported === false) {
      return
    }

    let cancelled = false
    let pendingRestart: number | null = null

    const clearPendingRestart = () => {
      if (pendingRestart !== null) {
        window.clearTimeout(pendingRestart)
        pendingRestart = null
      }
    }

    const runContinuousSession = () => {
      if (cancelled || flowStatusRef.current !== 'listening') {
        return
      }
      clearPendingRestart()
      startListeningOnce({
        continuous: true,
        keepListeningIndicatorAcrossRestarts: true,
        onEnd: () => {
          if (cancelled || flowStatusRef.current !== 'listening') {
            return
          }
          pendingRestart = window.setTimeout(() => {
            pendingRestart = null
            if (cancelled || flowStatusRef.current !== 'listening') {
              return
            }
            runContinuousSession()
          }, 450)
        },
      })
    }

    runContinuousSession()

    return () => {
      cancelled = true
      clearPendingRestart()
      const recognizer = speechRecognizerRef.current
      if (recognizer) {
        recognizer.stop()
      }
    }
  }, [
    active,
    deck,
    active?.phrase.id,
    deck?.id,
    deck?.learningIdiom,
    flowStatus,
    speechSupported,
    startListeningOnce,
  ])

  useEffect(() => {
    if (flowStatus === 'inputting' || flowStatus === 'rating' || flowStatus === 'speech') {
      const recognizer = speechRecognizerRef.current
      if (recognizer) {
        recognizer.stop()
      }
    }
  }, [flowStatus])

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
    setFlowStatus('rating')
    submittedRef.current = true
    const finalScore = computeComposeScore(
      active.phrase.original,
      attempt,
      tipRevealedIndices,
      { submitted: true },
    )
    setAcceptanceFlash(finalScore.accepted ? 'accepted' : 'rejected')

    const now = Date.now()
    const next = applyRating(active.schedule, finalScore.rating, now)
    await saveScheduling(next)
    setSessionRated((count) => count + 1)

    clearAdvanceAfterRatingTimer()
    const delayMs = finalScore.accepted ? 1200 : 5000
    advanceAfterRatingTimerRef.current = window.setTimeout(() => {
      advanceAfterRatingTimerRef.current = null
      void advanceAfterRating()
    }, delayMs)
  }, [
    active,
    advanceAfterRating,
    attempt,
    clearAdvanceAfterRatingTimer,
    clearIdleSubmitTimer,
    deckId,
    tipRevealedIndices,
  ])

  useEffect(() => {
    if (!active || flowStatus === 'rating' || flowStatus === 'speech') {
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

    if (!lastAttemptChangeFromSpeechRef.current) {
      clearIdleSubmitTimer()
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
      if (!lastAttemptChangeFromSpeechRef.current) {
        return
      }
      void handleCheck()
    }, delay)

    return () => {
      clearIdleSubmitTimer()
    }
  }, [active, attempt, clearIdleSubmitTimer, flowStatus, handleCheck, liveScore])

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

  if (!active || !liveScore || !cardWordScore) {
    return <Alert severity="info">{t('study.noStudyRows')}</Alert>
  }

  const nextDue = rows
    .map((row) => row.schedule.due)
    .filter((due) => due > Date.now())
    .sort((a, b) => a - b)[0]

  const hasDue = rows.some((row) => row.schedule.due <= Date.now())
  const speakDisabled = deck.ttsAnswerEnabled === false

  const tipDisabled = isRating || allWordsRevealedOrCorrect

  const handleAnswerFocus = () => {
    speechRecognizerRef.current?.stop()
    setFlowStatus('inputting')
  }

  const handleAnswerBlur = () => {
    if (deck.voiceAutoFlipEnabled !== false && speechSupported !== false) {
      setFlowStatus('listening')
    } else {
      setFlowStatus('idle')
    }
  }

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
            wordStates={cardWordScore.wordStates}
            onDark
          />
        }
        answerMeta={
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            {t('compose.score', {
              correct: cardWordScore.correctCount,
              total: totalWords,
              percent: Math.round(cardWordScore.percentage),
            })}
          </Typography>
        }
      />

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

      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          fullWidth
          size="small"
          value={attempt}
          onChange={(event) => {
            lastAttemptChangeFromSpeechRef.current = false
            setAttempt(event.target.value)
          }}
          onFocus={handleAnswerFocus}
          onBlur={handleAnswerBlur}
          placeholder={t('compose.yourAnswer')}
          disabled={isRating}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={t('compose.check')}
                    onClick={() => void handleCheck()}
                    disabled={isRating || attempt.trim().length === 0}
                    edge="end"
                  >
                    <SendIcon />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <IconButton
          aria-label={t('compose.startListening')}
          onClick={handleMicToggle}
          disabled={
            isRating || flowStatus === 'speech' || speechSupported === false
          }
          color={flowStatus === 'listening' ? 'primary' : 'default'}
        >
          <MicIcon />
        </IconButton>
      </Stack>

     

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
