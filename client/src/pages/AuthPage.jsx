import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../utils/constants';
import { motion } from 'framer-motion';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const body = isLogin
      ? { username, password }
      : { username, password, phone, lastName, email: email || undefined };
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      login(data.token, data.userId, data.username, data.role);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md"
      >
        <div className="arcade-card p-6">
          <h2 className="text-2xl font-display font-bold text-center text-neon-cyan mb-6">
            {isLogin ? 'LOGIN' : 'SIGN UP'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="USERNAME"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="neon-input w-full border-neon-cyan arcade-input"
              required
            />
            <input
              type="password"
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="neon-input w-full border-neon-cyan arcade-input"
              required
            />
            {!isLogin && (
              <>
                <input
                  type="tel"
                  placeholder="PHONE (11 digits)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="neon-input w-full  border-neon-cyan arcade-input"
                  required
                />
                <input
                  type="text"
                  placeholder="LAST NAME"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="neon-input w-full  border-neon-cyan arcade-input"
                  required
                />
                <input
                  type="email"
                  placeholder="EMAIL (optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="neon-input w-full  border-neon-cyan arcade-input"
                />
              </>
            )}
            <button type="submit" className="arcade-btn w-full py-2">
              {isLogin ? 'LOGIN' : 'SIGN UP'}
            </button>
          </form>
          {error && <p className="text-neon-red text-sm mt-3 text-center">{error}</p>}
          <div className="mt-4 text-center">
            <button
            
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-neon-cyan hover:underline"
            >
              {isLogin ? "Don't have an account? SIGN UP" : 'Already have an account? LOGIN'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}