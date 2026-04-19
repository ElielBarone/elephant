import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditNoteIcon from '@mui/icons-material/EditNote'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import SchoolIcon from '@mui/icons-material/School'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IdiomFlag } from '@/components/IdiomFlag'
import { idiomLabel } from '@/lib/idiom'
import {
  deleteDeck,
  duplicateDeck,
  getDeck,
  saveDeck,
  writeLastDeckId,
} from '@/lib/db/deckStorage'
import type { Deck } from '@/types/models'

export function DeckHomePage() {
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
    return <Alert severity="error">Missing deck</Alert>
  }

  if (loading) {
    return <Typography>Loading…</Typography>
  }

  if (!deck) {
    return <Alert severity="warning">Deck not found</Alert>
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

  const persistTtsField = async (patch: Pick<Deck, 'ttsPromptEnabled' | 'ttsAnswerEnabled'>) => {
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
      <Box>
        <Typography variant="overline" color="text.secondary">
          Deck
        </Typography>
        <Typography variant="h4" component="h1">
          {deck.title}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          <Chip
            label="Native"
            icon={<IdiomFlag idiom={deck.nativeIdiom} height={18} decorative />}
            aria-label={`Native, ${idiomLabel(deck.nativeIdiom)}`}
          />
          <Chip
            label="Learning"
            icon={<IdiomFlag idiom={deck.learningIdiom} height={18} decorative />}
            color="primary"
            aria-label={`Learning, ${idiomLabel(deck.learningIdiom)}`}
          />
          <Chip label={`${deck.phrases.length} cards`} variant="outlined" />
        </Stack>
      </Box>

      <Stack spacing={0.5} sx={{ pl: 0.5 }}>
        <FormControlLabel
          control={
            <Switch
              checked={deck.ttsPromptEnabled !== false}
              onChange={(_, checked) =>
                void persistTtsField({ ttsPromptEnabled: checked }).catch(() => {
                  setError('Could not save speech setting')
                })
              }
            />
          }
          label={
            <Stack direction="row" alignItems="center" spacing={0.75} component="span">
              <Typography component="span" variant="body2">
                Speak prompt
              </Typography>
              <IdiomFlag idiom={deck.learningIdiom} height={18} />
            </Stack>
          }
        />
        <FormControlLabel
          control={
            <Switch
              checked={deck.ttsAnswerEnabled !== false}
              onChange={(_, checked) =>
                void persistTtsField({ ttsAnswerEnabled: checked }).catch(() => {
                  setError('Could not save speech setting')
                })
              }
            />
          }
          label={
            <Stack direction="row" alignItems="center" spacing={0.75} component="span">
              <Typography component="span" variant="body2">
                Speak translation
              </Typography>
              <IdiomFlag idiom={deck.nativeIdiom} height={18} />
            </Stack>
          }
        />
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Button
        variant="contained"
        size="large"
        startIcon={<SchoolIcon />}
        onClick={() => navigate(`/deck/${deck.id}/study`)}
      >
        Study
      </Button>
      <Button
        variant="outlined"
        size="large"
        startIcon={<EditNoteIcon />}
        onClick={() => navigate(`/deck/${deck.id}/phrases`)}
      >
        Edit phrases
      </Button>
      <Button
        variant="outlined"
        startIcon={<FileCopyIcon />}
        onClick={() =>
          void handleDuplicate().catch(() => {
            setError('Duplicate failed')
          })
        }
      >
        Duplicate deck
      </Button>
      <Button variant="text" onClick={() => {
        setRenameValue(deck.title)
        setRenameOpen(true)
      }}
      >
        Rename
      </Button>
      <Button color="error" variant="outlined" startIcon={<DeleteOutlineIcon />} onClick={() => setDeleteOpen(true)}>
        Delete deck
      </Button>

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Rename deck</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>Cancel</Button>
          <Button onClick={() => void handleRename()} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete this deck?</DialogTitle>
        <DialogContent>
          <Typography>This removes the deck, scheduling, and cached audio for this device.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void handleDelete()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
