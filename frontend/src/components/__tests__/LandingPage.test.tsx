// @ts-nocheck
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingPage } from '../LandingPage';

describe('LandingPage', () => {
  it('should render the landing page with hero content', () => {
    render(<LandingPage />);

    expect(screen.getByText('Smart Emergency')).toBeInTheDocument();
    expect(screen.getByText('Route Optimizer')).toBeInTheDocument();
    expect(
      screen.getByText('Coordinating emergency response through intelligent routing')
    ).toBeInTheDocument();
  });

  it('should display feature highlights', () => {
    render(<LandingPage />);

    expect(screen.getByText('Real-Time Optimization')).toBeInTheDocument();
    expect(screen.getByText('Interactive Maps')).toBeInTheDocument();
    expect(screen.getByText('Instant Communication')).toBeInTheDocument();
  });

  it('should show login form by default', () => {
    render(<LandingPage />);

    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  it('should switch to register form when register tab is clicked', () => {
    render(<LandingPage />);

    const registerTab = screen.getAllByText('Register')[0];
    fireEvent.click(registerTab);

    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Role/i)).toBeInTheDocument();
  });

  it('should switch back to login form when login tab is clicked', () => {
    render(<LandingPage />);

    // Switch to register
    const registerTab = screen.getAllByText('Register')[0];
    fireEvent.click(registerTab);

    // Switch back to login
    const loginTab = screen.getAllByText('Login')[0];
    fireEvent.click(loginTab);

    expect(screen.queryByLabelText(/Confirm Password/i)).not.toBeInTheDocument();
  });

  it('should have animated background elements', () => {
    const { container } = render(<LandingPage />);

    const animatedElements = container.querySelectorAll('.animate-float, .animate-float-delayed');
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  it('should have glassmorphism card styling', () => {
    const { container } = render(<LandingPage />);

    const glassCard = container.querySelector('.backdrop-blur-lg');
    expect(glassCard).toBeInTheDocument();
  });
});
