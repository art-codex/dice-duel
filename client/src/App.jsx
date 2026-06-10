
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedOnlineRoute from './components/ProtectedOnlineRoute';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomePage from './pages/HomePage';
import GameRoom from './pages/GameRoom';
import WalletPage from './pages/WalletPage';
import TasksPage from './pages/TasksPage';
import AuthPage from './pages/AuthPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPanel from './pages/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import FriendsPage from './pages/FriendsPage';
import TournamentPage from './pages/TournamentPage';
import MatchHistoryPage from './pages/MatchHistoryPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';   // <-- اضافه شد




function AppContent() {
  const location = useLocation();
  const hideBottomNav = location.pathname.startsWith('/game/') || location.pathname === '/auth';
  const hideHeader = location.pathname === '/auth';

      

  return (
    <>
      {!hideHeader && <Header />}
      <main className="flex-1 pb-20">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/game/:roomId" element={<ProtectedRoute><ProtectedOnlineRoute><GameRoom />
              </ProtectedOnlineRoute></ProtectedRoute>}/>
            <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
            <Route path="/tournaments" element={<ProtectedRoute><TournamentPage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><MatchHistoryPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />   {/* <-- مسیر جدید */}
          </Routes>
        </AnimatePresence>
      </main>
      {!hideBottomNav && <BottomNav />}

    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      
        <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen bg-arcade-bg font-body text-gray-200 flex flex-col">
            <AppContent />
          </div>
        </SocketProvider>
      </AuthProvider>
      
    </BrowserRouter>
  );
}

export default App;