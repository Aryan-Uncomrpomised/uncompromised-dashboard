import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect Operator away from Admin paths
  if (user?.role === 'operator') {
    const adminPaths = ['/operations', '/sales', '/spoilage', '/produce', '/receivables', '/poc-mapping'];
    if (adminPaths.includes(location.pathname)) {
      return <Navigate to="/daily-stock" replace />;
    }
  }

  // Restrict Farm Team to only Spoilage and Produce
  if (user?.role === 'farm_team') {
    const allowedPaths = ['/spoilage', '/produce'];
    if (!allowedPaths.includes(location.pathname)) {
      return <Navigate to="/spoilage" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
