import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Join() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/set-name?roomId=${roomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-extrabold text-indigo-600 mb-6 text-center">
          Join a Game
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Enter the room code shared by your friend to join their game.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room Code"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!roomId.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition duration-200 disabled:opacity-50"
          >
            Join
          </button>
        </form>
      </div>
    </div>
  );
}
