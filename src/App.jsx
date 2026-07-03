import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import SalesDashboard from './pages/SalesDashboard';
import Placeholder from './pages/Placeholder';
import OperationsDashboard from './pages/OperationsDashboard';
import { FilterProvider } from './context/FilterContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

import ProduceDashboard from './pages/ProduceDashboard';
import ReceivablesDashboard from './pages/ReceivablesDashboard';

function App() {
  return (
    <AuthProvider>
      <FilterProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Navigate to="/operations" replace />} />
                <Route path="operations" element={<OperationsDashboard />} />
                <Route path="sales" element={<SalesDashboard />} />
                <Route path="spoilage" element={<Placeholder title="Spoilage Dashboard" />} />
                <Route path="produce" element={<ProduceDashboard />} />
                <Route path="receivables" element={<ReceivablesDashboard />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </FilterProvider>
    </AuthProvider>
  );
}

export default App;
