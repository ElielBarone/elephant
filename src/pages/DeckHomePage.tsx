import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditNoteIcon from '@mui/icons-material/EditNote'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import SchoolIcon from '@mui/icons-material/School'
import Alert from '@mui/material/Alert'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

import Stack from '@mui/material/Stack'

import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import {
  deleteDeck,
  duplicateDeck,
  getDeck,
  saveDeck,
  writeLastDeckId,
} from '@/lib/db/deckStorage'
import type { Deck } from '@/types/models'
import { IdiomInformation } from '@/components/IdiomInformation'
import { VolumeToggleButton } from '@/components/VolumeToggleButton'
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';

export function DeckHomePage() {
  const { t } = useTranslation()
  const { deckId } = useParams()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!deckId) {
        return
      }
      setLoading(true)
      const found = await getDeck(deckId)
      if (!cancelled) {
        setDeck(found ?? null)
        setLoading(false)
        if (found) {
          writeLastDeckId(found.id)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [deckId])

  if (!deckId) {
    return <Alert severity="error">{t('general.missingDeck')}</Alert>
  }

  if (loading) {
    return <Typography>{t('general.loading')}</Typography>
  }

  if (!deck) {
    return <Alert severity="warning">{t('general.deckNotFound')}</Alert>
  }

  const handleRename = async () => {
    const nextTitle = renameValue.trim()
    if (nextTitle.length === 0) {
      return
    }
    const next: Deck = {
      ...deck,
      title: nextTitle,
      updatedAt: new Date().toISOString(),
    }
    await saveDeck(next)
    setDeck(next)
    setRenameOpen(false)
  }

  const handleDuplicate = async () => {
    const copy = await duplicateDeck(deck, Date.now())
    navigate(`/deck/${copy.id}`)
  }

  const handleDelete = async () => {
    await deleteDeck(deck.id)
    writeLastDeckId(null)
    navigate('/')
  }

  const persistTtsField = async (patch: Pick<Deck, 'ttsPromptEnabled' | 'ttsAnswerEnabled' | 'voiceAutoFlipEnabled'>) => {
    const next: Deck = {
      ...deck,
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    await saveDeck(next)
    setDeck(next)
  }

  return (
    <Stack spacing={3}>      
        <Typography variant="overline" color="text.secondary">
          {t('deck.deckLabel')}
        
          <Typography variant="h4">
            {deck.title}
          </Typography>
          <Chip label={t('deck.cards', { count: deck.phrases.length })} variant="outlined" sx={{ width: 'fit-content'}}/>
        </Typography>

        <Stack direction="row" spacing={3} flexWrap="wrap"  useFlexGap sx={{ mt: 1 }}>
          <IdiomInformation label={t('deck.native')} idiom={deck.nativeIdiom}>
            <VolumeToggleButton value={deck.ttsAnswerEnabled !== false} 
            onChange={(value) => void persistTtsField({ ttsAnswerEnabled: value })} />
          </IdiomInformation>
          <IdiomInformation label={t('deck.learning')} idiom={deck.learningIdiom} >          
            <VolumeToggleButton value={deck.ttsPromptEnabled !== false} 
            onChange={(value) => void persistTtsField({ ttsPromptEnabled: value })} />
          </IdiomInformation>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 220 }}>
            <Typography variant="body2">{t('deck.autoFlipByVoice')}</Typography>
            <VolumeToggleButton value={deck.voiceAutoFlipEnabled !== false}
            selectedIcon={<MicRoundedIcon/>}
            unselectedIcon={<MicOffRoundedIcon/>}
              onChange={(value) => void persistTtsField({ voiceAutoFlipEnabled: value })}
            />
          </Stack>
        </Stack>
      

      

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Button
        variant="contained"
        size="large"
        startIcon={<SchoolIcon />}
        onClick={() => navigate(`/deck/${deck.id}/study`)}
      >
        {t('deck.study')}
      </Button>
      <Button
        variant="outlined"
        size="large"
        startIcon={<EditNoteIcon />}
        onClick={() => navigate(`/deck/${deck.id}/phrases`)}
      >
        {t('deck.editPhrases')}
      </Button>
      <Button
        variant="outlined"
        startIcon={<FileCopyIcon />}
        onClick={() =>
          void handleDuplicate().catch(() => {
            setError(t('deck.duplicateFailed'))
          })
        }
      >
        {t('deck.duplicateDeck')}
      </Button>
      <Button variant="text" onClick={() => {
        setRenameValue(deck.title)
        setRenameOpen(true)
      }}
      >
        {t('deck.rename')}
      </Button>
      <Button color="error" variant="outlined" startIcon={<DeleteOutlineIcon />} onClick={() => setDeleteOpen(true)}>
        {t('deck.deleteDeck')}
      </Button>

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('deck.rename')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('deck.title')}
            fullWidth
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>{t('general.cancel')}</Button>
          <Button onClick={() => void handleRename()} variant="contained">
            {t('general.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>{t('deck.deleteThisDeck')}</DialogTitle>
        <DialogContent>
          <Typography>{t('deck.deleteDeckBody')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{t('general.cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => void handleDelete()}>
            {t('general.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
