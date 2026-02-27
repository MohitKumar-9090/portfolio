import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase.js';
import '../styles/auth.css';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    if (type === 'error') {
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      showMessage('Please fill in all fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await auth.signInWithEmailAndPassword(email.trim(), password);
      showMessage('Login successful! Redirecting...', 'success');
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email. Please sign up first.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed login attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please check your credentials.';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }

      showMessage(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Login to access your portfolio</p>
        </div>

        {message && <div className={`message ${message.type}`}>{message.text}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="divider">OR</div>

        <div className="auth-link">
          Don&apos;t have an account? <Link to="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
