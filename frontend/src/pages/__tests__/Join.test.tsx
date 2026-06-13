import { render, screen, fireEvent } from '../../utils/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { Join } from '../Join';
import * as router from 'react-router-dom';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('Join Component', () => {
  it('renders correctly', () => {
    render(
      <MemoryRouter>
        <Join />
      </MemoryRouter>
    );
    expect(screen.getByText('Join a Game')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Room Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join' })).toBeDisabled();
  });

  it('navigates to /set-name with room code on submit', () => {
    const navigateMock = vi.fn();
    vi.mocked(router.useNavigate).mockReturnValue(navigateMock);

    render(
      <MemoryRouter>
        <Join />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Enter Room Code');
    const button = screen.getByRole('button', { name: 'Join' });

    fireEvent.change(input, { target: { value: 'room123' } });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    expect(navigateMock).toHaveBeenCalledWith('/set-name?roomId=room123');
  });
});
