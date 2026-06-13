import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomPolling } from '../hooks/useRoomPolling';
import { useSubmitWord } from '../hooks/useSubmitWord';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [word, setWord] = useState('');
  const [hasSubmittedThisRound, setHasSubmittedThisRound] = useState(false);

  const lastUpdatedAtRef = useRef<string | null>(null);

  const { data: roomState } = useRoomPolling(roomId || null, lastUpdatedAtRef);

  const previousRoundRef = useRef<number | null>(null);

  useEffect(() => {
    if (roomState) {
       if (previousRoundRef.current !== null && roomState.currentRound > previousRoundRef.current) {
          setHasSubmittedThisRound(false);
          setWord('');
       }
       previousRoundRef.current = roomState.currentRound;
    }
  }, [roomState?.currentRound]);

  const mutation = useSubmitWord(roomId, roomState, lastUpdatedAtRef, setHasSubmittedThisRound, setWord);

  const handleSubmitWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !roomState) return;
    mutation.mutate({ wordToSubmit: word.trim(), round: roomState.currentRound });
  };

  if (!roomState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
         <div className="w-12 h-12 border-[4px] border-border bg-secondary shadow-[4px_4px_0px_0px_var(--color-border)] animate-spin"></div>
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
    <div className="min-h-[100dvh] flex flex-col p-4 md:p-8">
      <div className="max-w-4xl w-full mx-auto bg-card-bg rounded-xl border-[3px] border-border shadow-[8px_8px_0px_0px_var(--color-border)] overflow-hidden flex flex-col flex-grow">

        {/* Header */}
        <div className="bg-white border-b-[3px] border-border p-6 text-center z-10 relative">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/favicon.svg" alt="Logo" className="w-8 h-8 drop-shadow-[2px_2px_0px_var(--color-border)]" />
            <h1 className="text-3xl font-black uppercase drop-shadow-[2px_2px_0px_var(--color-secondary)]">SaySame</h1>
          </div>
          <div className="flex justify-between items-center max-w-md mx-auto font-black uppercase tracking-wide">
             <span className="text-lg truncate max-w-[40%] px-2 bg-primary text-white border-[3px] border-border shadow-[2px_2px_0px_0px_var(--color-border)]">{me?.name || 'You'}</span>
             <span className="text-foreground text-sm bg-muted px-3 py-1 border-[3px] border-border shadow-[2px_2px_0px_0px_var(--color-border)]">Round {Math.min(roomState.currentRound + 1, roomState.totalRounds)} / {roomState.totalRounds}</span>
             <span className="text-lg truncate max-w-[40%] px-2 bg-secondary text-foreground border-[3px] border-border shadow-[2px_2px_0px_0px_var(--color-border)]">{opponent?.name || 'Opponent'}</span>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex-grow p-4 md:p-6 flex flex-col bg-background relative z-0">

          {/* History */}
          <div className="flex-grow overflow-y-auto mb-6 space-y-4">
             {Array.from({ length: roomState.currentRound }).map((_, i) => (
                <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl border-[3px] border-border shadow-[4px_4px_0px_0px_var(--color-border)] transition-transform duration-300 transform scale-100 opacity-100">
                   <div className="text-center w-5/12 font-black text-xl text-foreground break-words uppercase">{me?.words[i]}</div>
                   <div className="w-2/12 flex justify-center">
                     {me?.words[i] === opponent?.words[i] ? (
                        <span className="text-green-500 font-black text-3xl drop-shadow-[2px_2px_0px_var(--color-border)]">✓</span>
                     ) : (
                        <span className="text-primary font-black text-3xl drop-shadow-[2px_2px_0px_var(--color-border)]">✗</span>
                     )}
                   </div>
                   <div className="text-center w-5/12 font-black text-xl text-foreground break-words uppercase">{opponent?.words[i]}</div>
                </div>
             ))}

             {/* Pending current round status if someone has submitted */}
             {!gameOver && hasSubmittedThisRound && (
               <div className="flex justify-between items-center bg-white p-4 rounded-xl border-[3px] border-border border-dashed opacity-80">
                 <div className="text-center w-5/12 font-black text-lg text-foreground uppercase tracking-widest">Waiting...</div>
                 <div className="w-2/12 flex justify-center text-foreground font-black text-2xl">...</div>
                 <div className="text-center w-5/12 font-black text-lg text-foreground uppercase tracking-widest">Thinking...</div>
               </div>
             )}
          </div>

          {/* Controls */}
          {gameOver ? (
            <div className="text-center bg-white p-8 rounded-xl border-[3px] border-border shadow-[4px_4px_0px_0px_var(--color-border)] mt-auto z-10">
               <h2 className={`text-5xl font-black mb-4 uppercase drop-shadow-[4px_4px_0px_var(--color-border)] ${isMatch ? 'text-green-400' : 'text-primary'}`}>
                 {isMatch ? 'Match!' : 'Game Over'}
               </h2>
               <p className="text-foreground font-black mb-8 text-xl uppercase tracking-wide">
                 {isMatch
                   ? `It took you ${roomState.currentRound} rounds to think alike.`
                   : "You couldn't find the same word in 10 rounds."}
               </p>
               <Button
                 variant="primary"
                 onClick={() => navigate('/')}
                 className="px-12 text-xl"
               >
                 Play Again
               </Button>
            </div>
          ) : (
            <div className="mt-auto bg-white p-4 md:p-6 rounded-xl border-[3px] border-border shadow-[4px_4px_0px_0px_var(--color-border)] z-10">
               {mutation.error && <p className="text-primary font-bold text-sm mb-4 text-center">{mutation.error instanceof Error ? mutation.error.message : 'An error occurred'}</p>}

               <form onSubmit={handleSubmitWord} className="flex flex-col sm:flex-row gap-4">
                 <Input
                   type="text"
                   value={word}
                   onChange={(e) => setWord(e.target.value)}
                   disabled={mutation.isPending || hasSubmittedThisRound}
                   placeholder={hasSubmittedThisRound ? "Waiting for opponent..." : "Enter your word..."}
                   className="flex-grow font-black text-xl uppercase placeholder:normal-case placeholder:font-medium placeholder:text-gray-400"
                   autoFocus
                 />
                 <Button
                   type="submit"
                   variant="primary"
                   disabled={!word.trim() || mutation.isPending || hasSubmittedThisRound}
                   className="min-w-[140px] text-xl"
                 >
                   {mutation.isPending ? 'Sending...' : 'Submit'}
                 </Button>
               </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
