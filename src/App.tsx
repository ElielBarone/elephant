import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { DeckHomePage } from '@/pages/DeckHomePage'
import { HomePage } from '@/pages/HomePage'
import { PhrasesPage } from '@/pages/PhrasesPage'
import { StudyPage } from '@/pages/StudyPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/deck/:deckId" element={<DeckHomePage />} />
        <Route path="/deck/:deckId/study" element={<StudyPage />} />
        <Route path="/deck/:deckId/phrases" element={<PhrasesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
