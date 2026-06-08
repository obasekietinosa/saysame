import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../config';

export function Share() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const roomId = searchParams.get('roomId');

  useEffect(() => {
    if (!roomId) {
      setError('Room ID is missing');
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/room/${roomId}`);
        if (!res.ok) {
          if (res.status === 304) return;
          throw new Error('Failed to fetch room state');
        }

        const data = await res.json();

        // If the second player has joined (playerTwoId is set)
        if (data && data.players && data.players.length === 2 && data.players[1].id) {
          clearInterval(intervalId);
          navigate(`/room/${roomId}`);
        }
      } catch (err) {
        console.error("Error polling room:", err);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [roomId, navigate]);

  if (!roomId) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <p className="text-red-500">{error || 'Invalid access'}</p>
        </div>
      </div>
    );
  }

  const shareLink = `${window.location.origin}/set-name?roomId=${roomId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-extrabold text-indigo-600 mb-6">
          Share this link!
        </h1>
        <p className="text-gray-600 mb-6">
          Send this link to your friend so they can join the game. The game will start automatically when they join.
        </p>

        <div className="flex items-center space-x-2 mb-8">
          <input
            type="text"
            readOnly
            value={shareLink}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-md bg-gray-50 focus:outline-none"
            data-testid="share-link-input"
          />
          <button
            onClick={copyToClipboard}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition duration-200"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex justify-center items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          <p className="text-indigo-600 font-medium">Waiting for opponent...</p>
        </div>
      </div>
    </div>
  );
}
