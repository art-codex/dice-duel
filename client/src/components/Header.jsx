/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import {User, LucideDices ,LogOut} from 'lucide-react';

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

      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchProfile();
    } else {

      setProfile(null);
    }
  }, [isAuthenticated, location.pathname]);

  return (
    <header className="border-b-2 border-neon-cyan bg-arcade-bg p-4 flex flex-wrap justify-between items-center ">
     
                  <button onClick={logout} className="retro-btn text-sm px-3 py-1"><LogOut size={23}/></button>

       <Link to="/" className="text-2xl font-display font-black tracking-wider text-neon-cyan [text-shadow:0_0_8px_#00f3ff] hover:text-neon-pink transition-all">
        DICE DUEL <LucideDices size={40} className=" text-neon-cyan inline-block align-middle"/>
      </Link>
      <nav className="flex flex-wrap gap-4 items-center text-lg">
        {isAuthenticated ? (
          <>

            {/* Profile link with avatar */}
            <Link to="/profile" className="flex items-center gap-2 hover:bg-neon-cyan/20 px-2 py-1 rounded transition">
              
              {profile?.avatar ? (
                <img src={profile.avatar} className="w-8 h-8 rounded-full border border-neon-cyan object-cover" alt="avatar" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-linear-to-r from-neon-cyan to-neon-purple flex items-center justify-center text-black font-bold text-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}    
              
            </Link>
          </>
        ) : (
          <Link to="/auth" className="arcade-btn text-sm">LOGIN / SIGN UP</Link>
        )}
      </nav>
    </header>
  );
}