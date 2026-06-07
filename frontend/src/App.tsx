import { Routes, Route } from 'react-router-dom'
import './App.css'

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to SaySame</h1>
      <p className="text-lg">This is the scaffolded frontend using React, React Router, and Tailwind CSS.</p>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}

export default App
