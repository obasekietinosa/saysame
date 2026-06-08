import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../Home';

describe('Home Component UI', () => {
  it('renders correctly', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText('SaySame')).toBeInTheDocument();
    expect(screen.getByText('The game where great minds think alike.')).toBeInTheDocument();
    expect(screen.getByText('Play with a Friend')).toBeInTheDocument();
    expect(screen.getByText('Join Random Player')).toBeInTheDocument();
    expect(screen.getByText('Join with Code')).toBeInTheDocument();
    expect(screen.getByText('How to play')).toBeInTheDocument();
  });

  it('toggles How to Play modal', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // Initial state: not visible
    expect(screen.queryByText('The goal is to submit the')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(screen.getByText('How to play'));
    expect(screen.getByText('How to Play')).toBeInTheDocument();

    // Click to close
    fireEvent.click(screen.getByText('Got it!'));
    expect(screen.queryByText('How to Play')).not.toBeInTheDocument();
  });
});
