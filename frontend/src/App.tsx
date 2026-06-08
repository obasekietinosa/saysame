import { Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { SetName } from './pages/SetName'
import { Share } from './pages/Share'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/set-name" element={<SetName />} />
      <Route path="/share" element={<Share />} />
      <Route path="/join" element={<div className="p-8 text-center"><h1 className="text-2xl">Join Page (Placeholder)</h1></div>} />
    </Routes>
  )
}

export default App
