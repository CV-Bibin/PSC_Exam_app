import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Compass, Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Simple Admin Routing check based on email (you can upgrade to Custom Claims later)
      if (userCredential.user.email === 'admin@psccivil.com') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-civil-card border border-civil-border rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-slate-950 shadow-lg mb-4">
            <Compass size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-white">PSC Civil Quest</h2>
          <p className="text-sm text-slate-400">Sign in to your learning portal</p>
        </div>

        {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-sm mb-4">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="email" 
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-civil-dark border border-civil-border text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-brand-500 transition"
                required 
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-civil-dark border border-civil-border text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-brand-500 transition"
                required 
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold py-3 rounded-xl transition flex justify-center"
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}