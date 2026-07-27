import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import SalesDashboard from './pages/SalesDashboard';
import Placeholder from './pages/Placeholder';
import OperationsDashboard from './pages/OperationsDashboard';
import { FilterProvider } from './context/FilterContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

import SpoilageDashboard from './pages/SpoilageDashboard';
import ProduceDashboard from './pages/ProduceDashboard';
import ReceivablesDashboard from './pages/ReceivablesDashboard';
import PocMappingDashboard from './pages/PocMappingDashboard';
import DailyStockDashboard from './pages/DailyStockDashboard';
import { useAuth } from './context/AuthContext';

const IndexRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'operator') {
    return <Navigate to="/daily-stock" replace />;
  }
  return <Navigate to="/operations" replace />;
};

function App() {
  return (
    <AuthProvider>
      <FilterProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<IndexRoute />} />
                <Route path="operations" element={<OperationsDashboard />} />
                <Route path="sales" element={<SalesDashboard />} />
                <Route path="spoilage" element={<SpoilageDashboard />} />
                <Route path="produce" element={<ProduceDashboard />} />
                <Route path="receivables" element={<ReceivablesDashboard />} />
                <Route path="poc-mapping" element={<PocMappingDashboard />} />
                <Route path="daily-stock" element={<DailyStockDashboard />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </FilterProvider>
    </AuthProvider>
  );
}

export default App;
