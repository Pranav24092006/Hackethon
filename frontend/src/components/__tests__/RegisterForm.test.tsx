// @ts-nocheck
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterForm } from '../RegisterForm';

// Mock fetch
global.fetch = jest.fn();

// Mock window.location
delete (window as any).location;
(window as any).location = { href: '' };

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render registration form fields', () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText(/^Username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Role/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
  });

  it('should show error when fields are empty', async () => {
    render(<RegisterForm />);

    const registerButton = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all fields/i)).toBeInTheDocument();
    });
  });

  it('should validate username length', async () => {
    render(<RegisterForm />);

    const usernameInput = screen.getByLabelText(/^Username$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    const registerButton = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(usernameInput, { target: { value: 'ab' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByText(/Username must be at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('should validate password length', async () => {
    render(<RegisterForm />);

    const usernameInput = screen.getByLabelText(/^Username$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    const registerButton = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should validate password confirmation', async () => {
    render(<RegisterForm />);

    const usernameInput = screen.getByLabelText(/^Username$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    const registerButton = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'different123' } });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('should allow role selection', () => {
    render(<RegisterForm />);

    const ambulanceButton = screen.getByText(/🚑 Ambulance/i);
    const policeButton = screen.getByText(/🚓 Police/i);

    expect(ambulanceButton).toBeInTheDocument();
    expect(policeButton).toBeInTheDocument();

    fireEvent.click(policeButton);
    // Role should be selected (visual feedback tested in integration)
  });

  it('should register and auto-login successfully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: '123', username: 'newuser', role: 'ambulance' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'mock-token',
          user: { username: 'newuser', role: 'ambulance' },
        }),
      });

    render(<RegisterForm />);

    const usernameInput = screen.getByLabelText(/^Username$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    const registerButton = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'newuser',
            password: 'password123',
            role: 'ambulance',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'mock-token');
      expect(window.location.href).toBe('/ambulance');
    });
  });

  it('should handle duplicate username error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Username already exists' }),
    });

    render(<RegisterForm />);

    const usernameInput = screen.getByLabelText(/^Username$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    const registerButton = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByText(/Username already exists/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during registration', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ user: { id: '123' } }),
              }),
            100
          )
        )
    );

    render(<RegisterForm />);

    const usernameInput = screen.getByLabelText(/^Username$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    const registerButton = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(registerButton);

    expect(screen.getByText(/Creating account.../i)).toBeInTheDocument();
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<RegisterForm />);

    const usernameInput = screen.getByLabelText(/^Username$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    const registerButton = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('should register with police role', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: '123', username: 'officer', role: 'police' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'mock-token',
          user: { username: 'officer', role: 'police' },
        }),
      });

    render(<RegisterForm />);

    const usernameInput = screen.getByLabelText(/^Username$/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmInput = screen.getByLabelText(/Confirm Password/i);
    const policeButton = screen.getByText(/🚓 Police/i);
    const registerButton = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.click(policeButton);
    fireEvent.change(usernameInput, { target: { value: 'officer' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          body: JSON.stringify({
            username: 'officer',
            password: 'password123',
            role: 'police',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(window.location.href).toBe('/police');
    });
  });
});
