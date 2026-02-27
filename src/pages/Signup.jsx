import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db, firebase } from '../lib/firebase.js';
import '../styles/auth.css';

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const passwordLengthMet = password.length >= 6;
  const passwordsMatch = confirmPassword === password;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showMessage('Please enter your name', 'error');
      return;
    }

    if (!email.trim()) {
      showMessage('Please enter your email', 'error');
      return;
    }

    if (!passwordLengthMet) {
      showMessage('Password must be at least 6 characters long', 'error');
      return;
    }

    if (!passwordsMatch) {
      showMessage('Passwords do not match', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(
        email.trim(),
        password
      );
      const user = userCredential.user;

      await user.updateProfile({
        displayName: name.trim(),
      });

      await db.collection('users').doc(user.uid).set({
        name: name.trim(),
        email: email.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      showMessage('Account created successfully! Redirecting...', 'success');
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      let errorMessage = 'Signup failed. Please try again.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please login instead.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please use a stronger password.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password sign up is not enabled. Contact administrator.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
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
          <h1>Create Account</h1>
          <p>Sign up to access the portfolio</p>
        </div>

        {message && <div className={`message ${message.type}`}>{message.text}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              placeholder="Enter your full name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
              placeholder="Create a strong password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ul className="password-requirements">
              <li className={passwordLengthMet ? 'requirement-met' : ''}>
                At least 6 characters
              </li>
            </ul>
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                borderColor:
                  confirmPassword && !passwordsMatch ? 'var(--danger)' : 'var(--border-color)',
              }}
            />
          </div>
          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="divider">OR</div>

        <div className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;
