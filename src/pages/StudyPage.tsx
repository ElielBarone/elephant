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
import { keyframes } from '@mui/material/styles'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { buildCardFlowConfig, CardPhase } from '@/lib/scheduler/cardFlow'
import { speakWithIdiom } from '@/lib/tts/speak'
import { createSpeechRecognizer, matchPhraseWords } from '@/lib/voice/speechRecognition'
import type { CardSchedule, Deck, Idiom, Phrase, Rating } from '@/types/models'
import MicIcon from '@mui/icons-material/Mic';
import { getCardStatus } from '@/hooks/useCardStatus'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

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

const blinkAnimation = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
`

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
  const { t } = useTranslation()
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
  const [ttsPlaying, setTtsPlaying] = useState(false)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [speechTranscript, setSpeechTranscript] = useState('')
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [matchedPromptWords, setMatchedPromptWords] = useState<boolean[]>([])
  const speechRecognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null)
  const flipTimeoutRef = useRef<number | null>(null)
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
      setCurrentPhaseIndex(0)
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
        title: t('study.congratulationsTitle'),
        message: t('study.congratulationsMessage'),
      },
      'happy',
      <Stack spacing={1.5}>        
        <Button variant="contained" onClick={openDecks}>
          {t('study.backToDecks')}
        </Button>
        <Button variant="outlined" onClick={startAgain}>
          {t('study.startAgain')}
        </Button>
      </Stack>,
      0,
    )
    completionSplashVisible.current = true
  }, [deck, navigate, rows.length, sessionRated, sessionTarget, splashScreenActions])

  const safeIndex = Math.min(activeIndex, Math.max(0, rows.length - 1))
  const active = rows[safeIndex]

  const explainButton = useMemo(() => {
    if (!active || !deck) return null

    const prompt = `Explain '${active.phrase.original}' (${active.phrase.translated} in ${deck.learningIdiom}). Give 2 examples in different contexts. Respond in ${deck.nativeIdiom}.`
    const encodedPrompt = encodeURIComponent(prompt)
    const url = `https://chat.openai.com/?model=gpt-4&q=${encodedPrompt}`

    return (
      <Button
      startIcon={<AutoAwesomeIcon />}
        variant="outlined"
        color="secondary"
        component="a"
        href={url}
        target="_blank"
        sx={{ mt: 4, textTransform: 'none' }}
        rel="noopener noreferrer"        
      >
        Explain with AI
      </Button>
    )
  }, [active, deck])

  const promptWithMatches = useMemo(() => {
    if (!active) {
      return ''
    }

    const tokens = active.phrase.original.split(/(\s+)/)
    let wordIndex = 0

    return tokens.map((token, index) => {
      if (token === '') {
        return null
      }

      if (/\s+/.test(token)) {
        return <span key={index}>{token}</span>
      }

      const matched = matchedPromptWords[wordIndex]
      wordIndex += 1

      return (
        <Box
          key={index}
          component="span"
          sx={{            
            color: matched ? 'primary.main' : 'inherit',
            fontWeight: matched ? 600 : 'inherit',
          }}
        >
          {token}
        </Box>
      )
    })
  }, [active, matchedPromptWords])

  useEffect(() => {
    setMatchedPromptWords([])
    setSpeechTranscript('')
    setSpeechError(null)
  }, [active?.phrase.id, flipped])

  useEffect(() => {
    setCurrentPhaseIndex(0)
    setFlipped(false)
  }, [active?.phrase.id, deck?.id])

  const progress = useMemo(() => {
    if (sessionTarget === 0) {
      return 0
    }
    return Math.min(100, (sessionRated / sessionTarget) * 100)
  }, [sessionRated, sessionTarget])

  const promptTtsOn = deck?.ttsPromptEnabled !== false
  const answerTtsOn = deck?.ttsAnswerEnabled !== false

  const flowConfig = useMemo(() => (deck ? buildCardFlowConfig(deck) : null), [deck])
  const currentPhases = useMemo(() => {
    if (!flowConfig) {
      return []
    }
    return flipped ? flowConfig.back : flowConfig.front
  }, [flowConfig, flipped])
  const currentPhase = currentPhases[currentPhaseIndex] ?? CardPhase.ShowFront

  const playText = useCallback(async (text: string, idiom: Idiom) => {
    const recognizer = speechRecognizerRef.current
    if (recognizer) {
      recognizer.stop()
    }

    setTtsPlaying(true)
    try {
      await speakWithIdiom(text, idiom)
    } catch {
      // Ignore speech synthesis failures; the UI will recover.
    } finally {
      setTtsPlaying(false)
    }
  }, [])

  const speakVisibleSide = useCallback(() => {
    if (!deck || !active) {
      return
    }
    if (flipped) {
      if (deck.ttsAnswerEnabled === false) {
        return
      }
      void playText(active.phrase.translated, deck.nativeIdiom)
    } else {
      if (deck.ttsPromptEnabled === false) {
        return
      }
      void playText(active.phrase.original, deck.learningIdiom)
    }
  }, [active, deck, flipped, playText])

  useEffect(() => {
    if (!active || !deck || !flowConfig) {
      return
    }

    let isCurrent = true
    const nextPhase = currentPhases[currentPhaseIndex + 1]

    const goToNextPhase = () => {
      if (!isCurrent) {
        return
      }
      setCurrentPhaseIndex((index) => Math.min(index + 1, currentPhases.length - 1))
    }

    const shouldAdvanceAfterShow = (phase: CardPhase): boolean => {
      if (phase === CardPhase.ShowFront) {
        return nextPhase !== undefined && nextPhase !== CardPhase.AwaitRating
      }
      if (phase === CardPhase.ShowBack) {
        return nextPhase === CardPhase.PlayBackTts
      }
      return false
    }

    if (currentPhase === CardPhase.ShowFront || currentPhase === CardPhase.ShowBack) {
      if (shouldAdvanceAfterShow(currentPhase)) {
        goToNextPhase()
      }
      return () => {
        isCurrent = false
      }
    }

    if (currentPhase === CardPhase.PlayFrontTts) {
      setSpeechError(null)
      void (async () => {
        await playText(active.phrase.original, deck.learningIdiom)
        if (!isCurrent) {
          return
        }
        goToNextPhase()
      })()
      return () => {
        isCurrent = false
      }
    }

    if (currentPhase === CardPhase.PlayBackTts) {
      setSpeechError(null)
      void (async () => {
        await playText(active.phrase.translated, deck.nativeIdiom)
        if (!isCurrent) {
          return
        }
        goToNextPhase()
      })()
      return () => {
        isCurrent = false
      }
    }

    if (currentPhase === CardPhase.ListenFront) {
      const language = speechLanguageByIdiom[deck.learningIdiom] ?? 'en-US'
      setSpeechError(null)
      setSpeechTranscript('')
      setMatchedPromptWords([])
      setListening(false)
      const recognizer = createSpeechRecognizer({
        lang: language,
        continuous: false,
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
          const matches = matchPhraseWords(active.phrase.original, transcript)
          setMatchedPromptWords(matches)

          if (matches.every(Boolean)) {
            if (flipTimeoutRef.current !== null) {
              window.clearTimeout(flipTimeoutRef.current)
            }
            flipTimeoutRef.current = window.setTimeout(() => {
              if (!isCurrent) {
                return
              }
              setFlipped(true)
              setCurrentPhaseIndex(0)
              flipTimeoutRef.current = null
            }, 1200)
          }
        },
        onError: (message) => {
          if (!isCurrent) {
            return
          }
          setListening(false)
          setSpeechTranscript('')
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
        return () => {
          isCurrent = false
        }
      }

      try {
        recognizer.start()
      } catch (error) {
        setSpeechError(error instanceof Error ? error.message : String(error))
      }

      return () => {
        isCurrent = false
        if (flipTimeoutRef.current !== null) {
          window.clearTimeout(flipTimeoutRef.current)
          flipTimeoutRef.current = null
        }
        recognizer.stop()
        speechRecognizerRef.current = null
        setListening(false)
      }
    }

    return () => {
      isCurrent = false
    }
  }, [active, currentPhase, currentPhaseIndex, currentPhases, deck, flowConfig, flipped, playText])

  useEffect(() => {
    if (currentPhase !== CardPhase.ListenFront) {
      return
    }

    if (ttsPlaying) {
      const recognizer = speechRecognizerRef.current
      if (recognizer) {
        recognizer.stop()
      }
      setListening(false)
    }
  }, [currentPhase, ttsPlaying])

  const handleRate = useCallback(async (rating: Rating) => {
    if (!active) {
      return
    }
    const next = applyRating(active.schedule, rating, Date.now())
    await saveScheduling(next)
    setFlipped(false)
    setCurrentPhaseIndex(0)
    setSessionRated((count) => count + 1)
    await refresh()
    setActiveIndex(0)
  }, [active, refresh])

  const handleRetrySpeechRecognition = useCallback(() => {
    setSpeechError(null)
    setSpeechTranscript('')
    setMatchedPromptWords([])

    const recognizer = speechRecognizerRef.current
    if (!recognizer) {
      setSpeechError('Speech recognition is unavailable. Please try again later.')
      return
    }

    try {
      recognizer.start()
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : String(error))
    }
  }, [])

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

  if (!active) {
    return <Alert severity="info">{t('study.noStudyRows')}</Alert>
  }

  const nextDue = rows
    .map((row) => row.schedule.due)
    .filter((due) => due > Date.now())
    .sort((a, b) => a - b)[0]

  const hasDue = rows.some((row) => row.schedule.due <= Date.now())

  const speakButtonDisabled = flipped ? !answerTtsOn : !promptTtsOn

  const { statusText } = getCardStatus({ speechError, speechSupported, ttsPlaying, listening, currentPhase, flipped })

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
          aria-label={t('study.speakVisibleSide')}
          disabled={speakButtonDisabled}
          onClick={() => speakVisibleSide()}
        >
          {speakButtonDisabled ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
      </Stack>

      {!hasDue ? (
        <Alert severity="info">
          {t('study.nothingDue')}
          {nextDue ? (
            <span>
              {' '}
              {t('study.nextCardAround', { time: new Date(nextDue).toLocaleString() })}
            </span>
          ) : null}{' '}
          {t('study.reviewEarly')}
        </Alert>
      ) : null}

      <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 999 }} />
      <Typography variant="caption" color="text.secondary">
        {t('study.reviewedQueue', {
          reviewed: sessionRated,
          total: sessionTarget,
          queue: rows.length,
        })}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <FlipCard
          frontTitle={t('study.prompt')}
          backTitle={t('study.translation')}
          frontText={promptWithMatches}
          backText={active.phrase.translated}
          backExtra={explainButton}
          flipped={flipped}
          onToggle={() => {
            setFlipped((value) => !value)
            setCurrentPhaseIndex(0)
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
          {speechSupported !== false && currentPhase === CardPhase.ListenFront && !flipped && !listening ? (
            <IconButton size="small" onClick={handleRetrySpeechRecognition}>
              <MicIcon />
            </IconButton>
          ) : null}
          {listening ? (
            <Box
              component="span"
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                animation: `${blinkAnimation} 1.4s ease-in-out infinite`,
              }}
            />
          ) : null}
          <Typography variant="caption" color={speechError ? 'error.main' : 'text.secondary'}>
            {statusText}
          </Typography>
          
        </Box>
        {speechTranscript && !flipped ? (
          <Typography variant="caption" color="text.secondary">
            {t('study.heard')} {speechTranscript}
          </Typography>
        ) : null}
      </Box>

      <RatingBar disabled={!flipped} onRate={(rating) => void handleRate(rating)} />
    </Stack>
  )
}
