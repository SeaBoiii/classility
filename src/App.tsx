import { Navigate, Route, Routes } from 'react-router-dom'
import { CardPage } from './pages/CardPage'
import { CardsPage } from './pages/CardsPage'
import { LandingPage } from './pages/LandingPage'
import { QuizPage } from './pages/QuizPage'
import { ResultPage } from './pages/ResultPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/cards" element={<CardsPage />} />
      <Route path="/card/:id" element={<CardPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default App
