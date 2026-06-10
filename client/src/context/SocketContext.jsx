import { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) socketRef.current.disconnect();
      socketRef.current = null;
      return;
    }
    if (!socketRef.current) {
      const s = io('', { auth: { token } });
      s.on('connect', () => console.log('socket connected'));
      s.on('connect_error', (e) => console.error('socket err', e));
      socketRef.current = s;
    }
  }, [isAuthenticated, token]);

  // eslint-disable-next-line react-hooks/refs
  return <SocketContext.Provider value={socketRef.current}>{children}</SocketContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);