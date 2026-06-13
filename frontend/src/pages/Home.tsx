import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function Home() {
  const navigate = useNavigate();
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <img src="/favicon.svg" alt="SaySame Logo" className="w-24 h-24 mx-auto mb-6 drop-shadow-[4px_4px_0px_var(--color-border)]" />
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground drop-shadow-[4px_4px_0px_var(--color-secondary)] mb-4">
          SaySame
        </h1>
        <p className="text-foreground font-medium mb-8 text-lg">The game where great minds think alike.</p>

        <div className="space-y-5 flex flex-col">
          <Button
            variant="primary"
            fullWidth
            onClick={() => navigate('/set-name?mode=friend')}
          >
            Play with a Friend
          </Button>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => navigate('/set-name?mode=random')}
          >
            Join Random Player
          </Button>

          <Button
            variant="muted"
            fullWidth
            onClick={() => navigate('/join')}
          >
            Join with Code
          </Button>
        </div>

        <div className="mt-8">
          <button
            className="text-foreground font-black underline hover:text-primary transition-colors uppercase tracking-widest text-sm"
            onClick={() => setShowHowToPlay(true)}
          >
            How to play
          </button>
        </div>
      </Card>

      {showHowToPlay && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <Card className="p-8 max-w-sm w-full">
            <h2 className="text-3xl font-black mb-6 text-foreground text-center">How to Play</h2>
            <ul className="list-disc pl-5 text-foreground space-y-3 mb-8 text-left font-medium">
              <li>You and your opponent will each submit a word.</li>
              <li>The goal is to submit the <strong className="font-black text-primary">exact same word</strong>.</li>
              <li>If the words don't match, you'll see what the other person wrote.</li>
              <li>Use that as a clue for your next word!</li>
              <li>You have up to <strong className="font-black">10 rounds</strong> to match.</li>
            </ul>
            <Button
              variant="primary"
              fullWidth
              onClick={() => setShowHowToPlay(false)}
            >
              Got it!
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
