import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

type Player = {
  id: string;
  name: string;
  words: string[];
};

type RoomState = {
  id: string;
  lastUpdatedAt: string;
  currentRound: number;
  totalRounds: number;
  currentRoundState: 'PENDING' | 'NO_MATCH' | 'MATCH';
  players: [Player, Player];
};

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState('');
  const [word, setWord] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmittedThisRound, setHasSubmittedThisRound] = useState(false);

  const lastUpdatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    let intervalId: number;

    const pollRoom = async () => {
      try {
        const url = new URL(`${API_URL}/room/${roomId}`);
        if (lastUpdatedAtRef.current) {
          url.searchParams.append('lastUpdatedAt', lastUpdatedAtRef.current);
        }

        const res = await fetch(url.toString());

        if (res.status === 304) {
          // No change
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to fetch room state');
        }

        const data: RoomState = await res.json();

        // If round advanced or game ended, reset submission state
        if (roomState && data.currentRound > roomState.currentRound) {
           setHasSubmittedThisRound(false);
           setWord('');
        }

        setRoomState(data);
        lastUpdatedAtRef.current = data.lastUpdatedAt;

      } catch (err) {
        console.error("Polling error", err);
      }
    };

    pollRoom();
    intervalId = window.setInterval(pollRoom, 2000);

    return () => clearInterval(intervalId);
  }, [roomId, roomState?.currentRound]);

  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !roomState) return;

    const playerId = sessionStorage.getItem('playerId');
    if (!playerId) {
      setError('Player ID not found');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/room/${roomId}/words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          word: word.trim(),
          round: roomState.currentRound,
        }),
      });

      if (!res.ok) {
         if (res.status === 422) {
             const data = await res.json();
             setRoomState(data);
             lastUpdatedAtRef.current = data.lastUpdatedAt;
             setWord('');
         } else {
             const data = await res.json();
             throw new Error(data.error || 'Failed to submit word');
         }
      } else {
          const data = await res.json();
          setRoomState(data);
          lastUpdatedAtRef.current = data.lastUpdatedAt;

          if (roomState && data.currentRound > roomState.currentRound) {
              setHasSubmittedThisRound(false);
              setWord('');
          } else {
              setHasSubmittedThisRound(true);
          }
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (!roomState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const playerId = sessionStorage.getItem('playerId');
  const me = roomState.players.find(p => p.id === playerId);
  const opponent = roomState.players.find(p => p.id !== playerId);

  const gameOver = roomState.currentRoundState === 'MATCH' ||
                   (roomState.currentRoundState === 'NO_MATCH' && roomState.currentRound === roomState.totalRounds);

  const isMatch = roomState.currentRoundState === 'MATCH';

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden flex flex-col min-h-[80vh]">

        {/* Header */}
        <div className="bg-indigo-600 text-white p-6 text-center shadow-md z-10 relative">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/favicon.svg" alt="Logo" className="w-8 h-8 brightness-0 invert" />
            <h1 className="text-3xl font-extrabold">SaySame</h1>
          </div>
          <div className="flex justify-between items-center max-w-sm mx-auto">
             <span className="font-semibold text-lg truncate max-w-[40%]">{me?.name || 'You'}</span>
             <span className="text-indigo-200 text-sm">Round {Math.min(roomState.currentRound + 1, roomState.totalRounds)} / {roomState.totalRounds}</span>
             <span className="font-semibold text-lg truncate max-w-[40%]">{opponent?.name || 'Opponent'}</span>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex-grow p-6 flex flex-col bg-gray-50">

          {/* History */}
          <div className="flex-grow overflow-y-auto mb-6 space-y-4">
             {Array.from({ length: roomState.currentRound }).map((_, i) => (
                <div key={i} className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                   <div className="text-center w-5/12 font-medium text-lg text-gray-800 break-words">{me?.words[i]}</div>
                   <div className="w-2/12 flex justify-center">
                     {me?.words[i] === opponent?.words[i] ? (
                        <span className="text-green-500 font-bold text-xl">✓</span>
                     ) : (
                        <span className="text-red-500 font-bold text-xl">✗</span>
                     )}
                   </div>
                   <div className="text-center w-5/12 font-medium text-lg text-gray-800 break-words">{opponent?.words[i]}</div>
                </div>
             ))}

             {/* Pending current round status if someone has submitted */}
             {!gameOver && hasSubmittedThisRound && (
               <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border-2 border-indigo-100">
                 <div className="text-center w-5/12 font-medium text-lg text-gray-400 italic">Waiting...</div>
                 <div className="w-2/12 flex justify-center text-gray-300">...</div>
                 <div className="text-center w-5/12 font-medium text-lg text-gray-400 italic">Thinking...</div>
               </div>
             )}
          </div>

          {/* Controls */}
          {gameOver ? (
            <div className="text-center bg-white p-8 rounded-lg shadow-md mt-auto">
               <h2 className={`text-4xl font-extrabold mb-4 ${isMatch ? 'text-green-500' : 'text-red-500'}`}>
                 {isMatch ? 'You Win!' : 'Game Over'}
               </h2>
               <p className="text-gray-600 mb-8 text-lg">
                 {isMatch
                   ? `It took you ${roomState.currentRound} rounds to think alike.`
                   : "You couldn't find the same word in 10 rounds."}
               </p>
               <button
                 onClick={() => navigate('/')}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full transition duration-200"
               >
                 Play Again
               </button>
            </div>
          ) : (
            <div className="mt-auto bg-white p-6 rounded-lg shadow-md">
               {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

               <form onSubmit={handleSubmitWord} className="flex gap-4">
                 <input
                   type="text"
                   value={word}
                   onChange={(e) => setWord(e.target.value)}
                   disabled={submitting || hasSubmittedThisRound}
                   placeholder={hasSubmittedThisRound ? "Waiting for opponent..." : "Enter your word..."}
                   className="flex-grow px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 text-lg"
                   autoFocus
                 />
                 <button
                   type="submit"
                   disabled={!word.trim() || submitting || hasSubmittedThisRound}
                   className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-md transition duration-200 disabled:opacity-50 min-w-[120px]"
                 >
                   {submitting ? 'Sending...' : 'Submit'}
                 </button>
               </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
