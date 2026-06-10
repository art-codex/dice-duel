// client/src/components/ProtectedOnlineRoute.jsx
// eslint-disable-next-line no-unused-vars
import { Navigate } from 'react-router-dom';

export default function ProtectedOnlineRoute({ children }) {
  if (!navigator.onLine) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold text-neon-red">⚠️ بدون اتصال به اینترنت</h1>
        <p className="mt-2 text-gray-400">لطفاً اتصال خود را بررسی کرده و دوباره تلاش کنید.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 arcade-btn px-4 py-2"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }
  return children;
}