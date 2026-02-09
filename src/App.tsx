import { Navigate, Route, Routes } from 'react-router-dom'
import { CardPage } from './pages/CardPage'
import { QuizPage } from './pages/QuizPage'
import { ResultPage } from './pages/ResultPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<QuizPage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/card/:id" element={<CardPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default App
