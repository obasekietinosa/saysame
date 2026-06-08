import { Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { SetName } from './pages/SetName'
import { Share } from './pages/Share'
import { Join } from './pages/Join'
import { Waiting } from './pages/Waiting'
import { Room } from './pages/Room'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/set-name" element={<SetName />} />
      <Route path="/share" element={<Share />} />
      <Route path="/join" element={<Join />} />
      <Route path="/waiting" element={<Waiting />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  )
}

export default App
