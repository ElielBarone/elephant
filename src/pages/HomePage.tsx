import AddIcon from '@mui/icons-material/Add'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { CardAvailableDeck } from '@/components/CardAvailableDeck'
import { DeckCard } from '@/components/DeckCard'
import { IdiomFlag } from '@/components/IdiomFlag'
import { deckCreateSchema, type DeckCreateValues } from '@/lib/forms/schemas'
import {
  copyBundledDeck,
  createEmptyDeck,
  listDeckRecords,
} from '@/lib/db/deckStorage'
import type { Deck, Idiom } from '@/types/models'
import { idiomValues } from '@/types/models'
import { CardNewItem } from '@/components/CardNewItem'

interface CatalogPayload {
  bundled: Array<{
    file: string
    label: string
    nativeIdiom: Idiom
    learningIdiom: Idiom
  }>
}

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [decks, setDecks] = useState<Deck[]>([])
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
          setCatalogError(t('home.couldNotLoadBundledDecks'))
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

  const handleInstallBundled = async (file: string, label: string) => {
    setBusyFile(file)
    setFormError(null)
    try {
      const deck = await copyBundledDeck(file, Date.now(), label)
      await refreshDecks()
      navigate(`/deck/${deck.id}/study`)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('home.installFailed'))
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
      setFormError(error instanceof Error ? error.message : t('home.createFailed'))
    }
  })

  return (
    <Stack spacing={3}>      

        <Typography variant="h4" component="h1" gutterBottom color="primary">
          {t('home.title')}
        </Typography>
  

      {formError ? <Alert severity="error">{formError}</Alert> : null}
      {catalogError ? <Alert severity="warning">{catalogError}</Alert> : null}

      <Box>
        
        {
          <Stack spacing={1.5}>
            {decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onOpen={() => navigate(`/deck/${deck.id}`)}
              />
            ))}
            <CardNewItem
            label={t('home.newDeck')}
            icon={<AddIcon />}
            minHeight={72}
            onClick={() => setCreateOpen(true)}
          />
          </Stack>
        }
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom>
          {t('home.bundledStarters')}
        </Typography>
        {catalog == null && !catalogError ? (
          <CircularProgress size={28} />
        ) : (
          <Stack spacing={1.5}>
            {catalog?.bundled.map((entry) => (
              <CardAvailableDeck
                key={entry.file}
                label={entry.label}
                nativeIdiom={entry.nativeIdiom}
                learningIdiom={entry.learningIdiom}
                disabled={busyFile != null}
                copying={busyFile === entry.file}
                onCopy={() => handleInstallBundled(entry.file, entry.label)}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('home.createDeck')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('home.titleLabel')}
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
                  <InputLabel id="native-idiom">{t('home.nativeLanguage')}</InputLabel>
                  <Select
                    labelId="native-idiom"
                    label={t('home.nativeLanguage')}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value as Idiom)}
                    renderValue={(value) => (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IdiomFlag idiom={value as Idiom} height={22} />
                      </Stack>
                    )}
                  >
                    {idiomValues.map((value) => (
                      <MenuItem key={value} value={value} sx={{ minHeight: 48 }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" sx={{ width: 1, py: 0.5 }}>
                          <IdiomFlag idiom={value} height={28} />
                        </Stack>
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
                  <InputLabel id="learning-idiom">{t('home.learningLanguage')}</InputLabel>
                  <Select
                    labelId="learning-idiom"
                    label={t('home.learningLanguage')}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value as Idiom)}
                    renderValue={(value) => (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IdiomFlag idiom={value as Idiom} height={22} />
                      </Stack>
                    )}
                  >
                    {idiomValues.map((value) => (
                      <MenuItem key={value} value={value} sx={{ minHeight: 48 }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" sx={{ width: 1, py: 0.5 }}>
                          <IdiomFlag idiom={value} height={28} />
                        </Stack>
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
          <Button onClick={() => setCreateOpen(false)}>{t('general.cancel')}</Button>
          <Button onClick={() => void handleCreateDeck()} variant="contained">
            {t('home.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
