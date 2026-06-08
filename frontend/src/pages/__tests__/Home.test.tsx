import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { Home } from '../Home';
import { vi } from 'vitest';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('Home Component', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
  });

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

  it('navigates to /set-name?mode=friend on Play with a Friend click', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Play with a Friend'));
    expect(mockNavigate).toHaveBeenCalledWith('/set-name?mode=friend');
  });

  it('navigates to /set-name?mode=random on Join Random Player click', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Join Random Player'));
    expect(mockNavigate).toHaveBeenCalledWith('/set-name?mode=random');
  });

  it('navigates to /join on Join with Code click', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Join with Code'));
    expect(mockNavigate).toHaveBeenCalledWith('/join');
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
