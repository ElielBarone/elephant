import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/Edit'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { nanoid } from 'nanoid'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import {
  deleteScheduling,
  ensureSchedulingForDeck,
  getDeck,
  saveDeck,
} from '@/lib/db/deckStorage'
import { phraseFormSchema, type PhraseFormValues } from '@/lib/forms/schemas'
import type { Deck, Phrase } from '@/types/models'

export function PhrasesPage() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Phrase | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Phrase | null>(null)

  const form = useForm<PhraseFormValues>({
    resolver: zodResolver(phraseFormSchema),
    defaultValues: {
      original: '',
      translated: '',
    },
  })

  const refresh = useCallback(async () => {
    if (!deckId) {
      return
    }
    const found = await getDeck(deckId)
    setDeck(found ?? null)
    setLoading(false)
  }, [deckId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openCreate = () => {
    setEditing(null)
    form.reset({ original: '', translated: '' })
    setDialogOpen(true)
  }

  const openEdit = (phrase: Phrase) => {
    setEditing(phrase)
    form.reset({
      original: phrase.original,
      translated: phrase.translated,
    })
    setDialogOpen(true)
  }

  const persistDeck = async (next: Deck) => {
    await saveDeck(next)
    await ensureSchedulingForDeck(next, Date.now())
    setDeck(next)
  }

  const handleSavePhrase = form.handleSubmit(async (values) => {
    if (!deck || !deckId) {
      return
    }
    const now = Date.now()
    if (editing) {
      const phrases = deck.phrases.map((phrase) =>
        phrase.id === editing.id
          ? { ...phrase, original: values.original, translated: values.translated }
          : phrase,
      )
      await persistDeck({
        ...deck,
        phrases,
        updatedAt: new Date(now).toISOString(),
      })
    } else {
      const phrase: Phrase = {
        id: nanoid(),
        original: values.original,
        translated: values.translated,
      }
      await persistDeck({
        ...deck,
        phrases: [...deck.phrases, phrase],
        updatedAt: new Date(now).toISOString(),
      })
    }
    setDialogOpen(false)
  })

  const handleDelete = async () => {
    if (!deck || !deleteTarget) {
      return
    }
    await deleteScheduling(deck.id, deleteTarget.id)
    const phrases = deck.phrases.filter((phrase) => phrase.id !== deleteTarget.id)
    await persistDeck({
      ...deck,
      phrases,
      updatedAt: new Date().toISOString(),
    })
    setDeleteTarget(null)
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

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton aria-label="back" onClick={() => navigate(`/deck/${deck.id}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flex: 1 }}>
          Phrases · {deck.title}
        </Typography>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Prompt</TableCell>
            <TableCell>Translation</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {deck.phrases.map((phrase) => (
            <TableRow key={phrase.id}>
              <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                {phrase.original}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                {phrase.translated}
              </TableCell>
              <TableCell align="right" sx={{ width: 70 , padding: 0}} >
                <IconButton aria-label="edit" onClick={() => openEdit(phrase)}>
                  <EditIcon />
                </IconButton>
                <IconButton aria-label="delete" onClick={() => setDeleteTarget(phrase)}>
                  <DeleteOutlineIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Fab
        color="primary"
        aria-label="add phrase"
        sx={{ position: 'fixed', right: 24, bottom: 24 }}
        onClick={openCreate}
      >
        <AddIcon />
      </Fab>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit phrase' : 'Add phrase'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Learning language prompt"
              fullWidth
              multiline
              minRows={2}
              {...form.register('original')}
              error={Boolean(form.formState.errors.original)}
              helperText={form.formState.errors.original?.message}
            />
            <TextField
              label="Native translation"
              fullWidth
              multiline
              minRows={2}
              {...form.register('translated')}
              error={Boolean(form.formState.errors.translated)}
              helperText={form.formState.errors.translated?.message}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleSavePhrase()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete phrase?</DialogTitle>
        <DialogContent>
          <Typography>This removes the phrase and its scheduling from this device.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void handleDelete()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
