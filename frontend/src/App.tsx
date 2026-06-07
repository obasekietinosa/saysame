import { Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/set-name" element={<div className="p-8 text-center"><h1 className="text-2xl">Set Name Page (Placeholder)</h1></div>} />
      <Route path="/join" element={<div className="p-8 text-center"><h1 className="text-2xl">Join Page (Placeholder)</h1></div>} />
    </Routes>
  )
}

export default App
