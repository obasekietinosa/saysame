import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { SetName } from '../SetName';
import { vi } from 'vitest';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('SetName Component', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    global.fetch = vi.fn();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(
      <MemoryRouter initialEntries={['/set-name?mode=friend']}>
        <SetName />
      </MemoryRouter>
    );
    expect(screen.getByText("What's your name?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('shows error if name is empty', async () => {
    render(
      <MemoryRouter initialEntries={['/set-name?mode=friend']}>
        <SetName />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('Please enter a name')).toBeInTheDocument();
  });

  it('handles friend mode correctly', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ roomId: '123', playerId: 'abc', playerName: 'Test' }),
    });

    render(
      <MemoryRouter initialEntries={['/set-name?mode=friend']}>
        <SetName />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
      target: { value: 'Test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem('playerId')).toBe('abc');
      expect(sessionStorage.getItem('playerName')).toBe('Test');
      expect(mockNavigate).toHaveBeenCalledWith('/share?roomId=123');
    });
  });

  it('handles random mode correctly - waiting', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'waiting', playerId: 'xyz' }),
    });

    render(
      <MemoryRouter initialEntries={['/set-name?mode=random']}>
        <SetName />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
      target: { value: 'Test Random' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem('playerId')).toBe('xyz');
      expect(sessionStorage.getItem('playerName')).toBe('Test Random');
      expect(mockNavigate).toHaveBeenCalledWith('/waiting');
    });
  });

  it('handles random mode correctly - matched immediately', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'room-789',
        players: [{ id: 'xyz', name: 'Test Random' }, { id: 'other', name: 'Other' }]
      }),
    });

    render(
      <MemoryRouter initialEntries={['/set-name?mode=random']}>
        <SetName />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
      target: { value: 'Test Random' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem('playerId')).toBe('xyz');
      expect(sessionStorage.getItem('playerName')).toBe('Test Random');
      expect(mockNavigate).toHaveBeenCalledWith('/room/room-789');
    });
  });

  it('handles joining specific room via roomId param', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ roomId: 'spec-123', playerId: 'p-123', playerName: 'Joiner' }),
    });

    render(
      <MemoryRouter initialEntries={['/set-name?roomId=spec-123']}>
        <SetName />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
      target: { value: 'Joiner' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem('playerId')).toBe('p-123');
      expect(sessionStorage.getItem('playerName')).toBe('Joiner');
      expect(mockNavigate).toHaveBeenCalledWith('/room/spec-123');
    });
  });

  it('shows error when fetch fails', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Room not found' }),
    });

    render(
      <MemoryRouter initialEntries={['/set-name?roomId=spec-123']}>
        <SetName />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Enter your name'), {
      target: { value: 'Joiner' },
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText('Room not found')).toBeInTheDocument();
    });
  });
});
