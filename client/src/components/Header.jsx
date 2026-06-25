import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { User, LucideDices, LogOut, ExternalLink } from 'lucide-react';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const { get } = useApi();
  const [profile, setProfile] = useState(null);
  const location = useLocation();

  async function fetchProfile() {
    try {
      const data = await get('/users/profile');
      setProfile(data);
    } catch (e) {
      console.error('Header: fetchProfile error', e);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [isAuthenticated, location.pathname]);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="border-b-2 border-neon-cyan bg-arcade-bg p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* ??? ??: ??????? */}
        <div className="flex items-center">
          {isAuthenticated ? (
            <Link to="/profile" className="flex items-center gap-2 hover:bg-neon-cyan/20 px-2 py-1 rounded transition">
              {profile?.avatar ? (
                <img src={profile.avatar} className="w-8 h-8 rounded-full border border-neon-cyan object-cover" alt="avatar" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-linear-to-r from-neon-cyan to-neon-purple flex items-center justify-center text-black font-bold text-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          ) : (
            <Link to="/auth" className="arcade-btn text-sm">LOGIN</Link>
          )}
        </div>

        {/* ???: ???? ? ??? ???? */}
        <div className="flex-1 flex justify-center">
          <Link to="/" className="text-2xl font-display font-black tracking-wider text-neon-cyan [text-shadow:0_0_8px_#00f3ff] hover:text-neon-pink transition-all flex items-center gap-2">
            <LucideDices size={40} className="text-neon-cyan" />
            <span>DICE DUEL</span>
          </Link>
        </div>

        {/* ??? ????: ???????? ???? ? ???? */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <>
              {/* ????? ????? ?? ???? ???? */}
              <a 
                href="https://dev-py.ir" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:bg-neon-cyan/20 px-2 py-1 rounded transition"
                title="???? ?? ???? ????"
              >
                <ExternalLink size={20} className="text-neon-cyan" />
              </a>
              
              {/* ????? ???? ?? ????? */}
              <button 
                onClick={handleLogout} 
                className="retro-btn text-sm px-3 py-1 flex items-center gap-1"
                title="???? ?? ?????"
              >
                <LogOut size={20} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}