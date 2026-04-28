import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import type { Phrase } from '@/types/models'
import { parseCsvPhrases } from '@/lib/forms/csvPhraseParser'

interface ImportPhrasesDialogProps {
  open: boolean
  onClose: () => void
  onImport: (phrases: Phrase[]) => void
  existingPhrases: Phrase[]
}

export function ImportPhrasesDialog({
  open,
  onClose,
  onImport,
  existingPhrases,
}: ImportPhrasesDialogProps) {
  const { t } = useTranslation()
  const [csvContent, setCsvContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<{
    phrases: Phrase[]
    duplicateCount: number
  } | null>(null)

  const handleContentChange = (newContent: string) => {
    setCsvContent(newContent)
    setError(null)
    setParseResult(null)
  }

  const handlePreview = () => {
    const result = parseCsvPhrases(csvContent, existingPhrases)
    if (result.error) {
      setError(result.error)
      setParseResult(null)
    } else {
      setParseResult({
        phrases: result.phrases,
        duplicateCount: result.duplicateCount,
      })
      setError(null)
    }
  }

  const handleImport = () => {
    if (parseResult) {
      onImport(parseResult.phrases)
      handleClose()
    }
  }

  const handleClose = () => {
    setCsvContent('')
    setError(null)
    setParseResult(null)
    onClose()
  }

  const isValid = parseResult && parseResult.phrases.length > 0

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('phrases.importDialog.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2">{t('phrases.importDialog.description')}</Typography>

          <Box
            
          >
            <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
              {t('phrases.importDialog.format')}
            </Typography>
            <Typography variant="caption" display="block">
              {t('phrases.importDialog.example')}
            </Typography>
          </Box>

          <TextField
            label={t('phrases.importDialog.paste')}
            multiline
            minRows={6}
            maxRows={12}
            fullWidth
            value={csvContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Hello ; Hola&#10;Good morning ; Buenos días"
          />

          {error && <Alert severity="error">{error}</Alert>}

          {parseResult && (
            <Alert severity="success">
              {parseResult.duplicateCount > 0 ? (
                <>
                  <Typography variant="body2">
                    ✓ {parseResult.phrases.length} phrase(s) ready to import
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    {t('phrases.importDialog.duplicateSkipped', {
                      count: parseResult.duplicateCount,
                    })}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2">
                  ✓ {parseResult.phrases.length} phrase(s) ready to import
                </Typography>
              )}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('general.cancel')}</Button>
        <Button
          onClick={handlePreview}
          disabled={csvContent.trim().length === 0}
          variant="outlined"
        >
          {t('phrases.importDialog.preview')}
        </Button>
        <Button
          onClick={handleImport}
          disabled={!isValid}
          variant="contained"
          color="success"
        >
          {t('phrases.importDialog.import')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
