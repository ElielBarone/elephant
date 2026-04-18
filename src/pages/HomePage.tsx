import AddIcon from '@mui/icons-material/Add'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { idiomLabel } from '@/lib/idiom'
import { deckCreateSchema, type DeckCreateValues } from '@/lib/forms/schemas'
import {
  copyBundledDeck,
  createEmptyDeck,
  listDeckRecords,
} from '@/lib/db/deckStorage'
import type { Deck, Idiom } from '@/types/models'
import { idiomValues } from '@/types/models'

interface CatalogPayload {
  bundled: Array<{ file: string; label: string }>
}

export function HomePage() {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [busyFile, setBusyFile] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const base = useMemo(
    () => import.meta.env.BASE_URL.replace(/\/?$/, '/'),
    [],
  )

  const refreshDecks = useCallback(async () => {
    setDecks(await listDeckRecords())
  }, [])

  useEffect(() => {
    void refreshDecks()
  }, [refreshDecks])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch(`${base}decks/catalog.json`)
        if (!response.ok) {
          throw new Error('Missing catalog')
        }
        const payload = (await response.json()) as CatalogPayload
        if (!cancelled) {
          setCatalog(payload)
        }
      } catch {
        if (!cancelled) {
          setCatalogError('Could not load bundled decks')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [base])

  const form = useForm<DeckCreateValues>({
    resolver: zodResolver(deckCreateSchema),
    defaultValues: {
      title: '',
      nativeIdiom: 'ptBR',
      learningIdiom: 'enUS',
    },
  })

  const handleInstallBundled = async (file: string) => {
    setBusyFile(file)
    setFormError(null)
    try {
      const deck = await copyBundledDeck(file, Date.now())
      await refreshDecks()
      navigate(`/deck/${deck.id}/study`)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Install failed')
    } finally {
      setBusyFile(null)
    }
  }

  const handleCreateDeck = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const deck = await createEmptyDeck(
        values.title,
        values.nativeIdiom,
        values.learningIdiom,
        Date.now(),
      )
      setCreateOpen(false)
      form.reset()
      await refreshDecks()
      navigate(`/deck/${deck.id}/phrases`)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Create failed')
    }
  })

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Decks
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Pick a deck to study. Bundled starters copy into this device the first time you add them.
        </Typography>
      </Box>

      {formError ? <Alert severity="error">{formError}</Alert> : null}
      {catalogError ? <Alert severity="warning">{catalogError}</Alert> : null}

      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6">Your decks</Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            size="small"
            onClick={() => setCreateOpen(true)}
          >
            New deck
          </Button>
        </Stack>
        {decks == null ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : decks.length === 0 ? (
          <Typography color="text.secondary">No decks yet. Add a starter or create your own.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {decks.map((deck) => (
              <Card key={deck.id} variant="outlined">
                <CardActionArea onClick={() => navigate(`/deck/${deck.id}`)}>
                  <CardContent>
                    <Typography variant="h6">{deck.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {idiomLabel(deck.nativeIdiom)} → {idiomLabel(deck.learningIdiom)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {deck.phrases.length} cards
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom>
          Bundled starters
        </Typography>
        {catalog == null && !catalogError ? (
          <CircularProgress size={28} />
        ) : (
          <Stack spacing={1.5}>
            {catalog?.bundled.map((entry) => (
              <Card key={entry.file} variant="outlined">
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle1">{entry.label}</Typography>
                    <Button
                      variant="outlined"
                      startIcon={<CloudDownloadIcon />}
                      disabled={busyFile != null}
                      onClick={() => void handleInstallBundled(entry.file)}
                    >
                      {busyFile === entry.file ? 'Copying…' : 'Copy to this device'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create deck</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              {...form.register('title')}
              error={Boolean(form.formState.errors.title)}
              helperText={form.formState.errors.title?.message}
            />
            <Controller
              control={form.control}
              name="nativeIdiom"
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="native-idiom">Native language</InputLabel>
                  <Select
                    labelId="native-idiom"
                    label="Native language"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value as Idiom)}
                  >
                    {idiomValues.map((value) => (
                      <MenuItem key={value} value={value}>
                        {idiomLabel(value)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              control={form.control}
              name="learningIdiom"
              render={({ field }) => (
                <FormControl fullWidth error={Boolean(form.formState.errors.learningIdiom)}>
                  <InputLabel id="learning-idiom">Learning language</InputLabel>
                  <Select
                    labelId="learning-idiom"
                    label="Learning language"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value as Idiom)}
                  >
                    {idiomValues.map((value) => (
                      <MenuItem key={value} value={value}>
                        {idiomLabel(value)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            {form.formState.errors.learningIdiom?.message ? (
              <Typography color="error" variant="caption">
                {form.formState.errors.learningIdiom.message}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={() => void handleCreateDeck()} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
