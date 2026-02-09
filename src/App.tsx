import { Navigate, Route, Routes } from 'react-router-dom'
import { CardPreview } from './pages/CardPreview'

function App() {
  return (
    <Routes>
      <Route path="/card" element={<CardPreview />} />
      <Route path="*" element={<Navigate replace to="/card" />} />
    </Routes>
  )
}

export default App
