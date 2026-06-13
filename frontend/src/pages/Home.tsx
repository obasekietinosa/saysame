import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Home() {
  const navigate = useNavigate();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <img src="/favicon.svg" alt="SaySame Logo" className="w-24 h-24 mx-auto mb-4" />
        <h1 className="text-5xl font-extrabold text-indigo-600 mb-2">SaySame</h1>
        <p className="text-gray-600 mb-8">The game where great minds think alike.</p>

        <div className="space-y-4 flex flex-col">
          <button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition duration-200"
            onClick={() => navigate('/set-name?mode=friend')}
          >
            Play with a Friend
          </button>

          <button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition duration-200"
            onClick={() => navigate('/set-name?mode=random')}
          >
            Join Random Player
          </button>

          <button
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded transition duration-200"
            onClick={() => navigate('/join')}
          >
            Join with Code
          </button>
        </div>

        <div className="mt-8">
          <button
            className="text-indigo-500 hover:text-indigo-700 underline text-sm"
            onClick={() => setShowHowToPlay(true)}
          >
            How to play
          </button>
        </div>
      </div>

      {showHowToPlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">How to Play</h2>
            <ul className="list-disc pl-5 text-gray-600 space-y-2 mb-6 text-left">
              <li>You and your opponent will each submit a word.</li>
              <li>The goal is to submit the <strong>exact same word</strong>.</li>
              <li>If the words don't match, you'll see what the other person wrote.</li>
              <li>Use that as a clue for your next word!</li>
              <li>You have up to <strong>10 rounds</strong> to match.</li>
            </ul>
            <button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition duration-200"
              onClick={() => setShowHowToPlay(false)}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
