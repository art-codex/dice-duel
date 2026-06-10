import { NavLink } from 'react-router-dom';
import { Home, Trophy, Users, Sword, MessageCircle } from 'lucide-react';

const navItems = [
  
  { path: '/tasks', label: 'TASKS', icon: Trophy },
  { path: '/leaderboard', label: 'RANKING', icon: Users },
  { path: '/', label: 'LOBBY', icon: Home },
  { path: '/tournaments', label: 'TOURNAMENTS', icon: Sword },
  { path: '/chat', label: 'CHAT', icon: MessageCircle },
];



export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-arcade-bg/70 backdrop-blur-md z-40 py-2">
      <div className="max-w-md mx-auto flex justify-around items-center gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'text-neon-cyan [text-shadow:0_0_8px_#00f3ff]'
                  : 'text-gray-400 hover:text-neon-cyan'
              }`
            }
          >
            <item.icon size={22} strokeWidth={1.5} />
            <span className="text-[10px] font-display font-bold tracking-wider hidden sm:block">
              {item.label}
            </span>
          </NavLink>
        ))}
        
      </div>
    </nav>
  );
}