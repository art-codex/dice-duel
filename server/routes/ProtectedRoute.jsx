export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (requireAdmin && user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}