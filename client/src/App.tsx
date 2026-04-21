import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectFormPage from './pages/ProjectFormPage';
import SuppliersPage from './pages/SuppliersPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import SupplierFormPage from './pages/SupplierFormPage';
import PurchasesPage from './pages/PurchasesPage';
import PurchaseDetailPage from './pages/PurchaseDetailPage';
import PurchaseFormPage from './pages/PurchaseFormPage';
import TransactionsPage from './pages/TransactionsPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import TransactionFormPage from './pages/TransactionFormPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import InvoiceFormPage from './pages/InvoiceFormPage';
import UsersPage from './pages/UsersPage';
import MobileHome from './pages/mobile/MobileHome';
import PurchaseSearch from './pages/mobile/PurchaseSearch';
import ProjectSearch from './pages/mobile/ProjectSearch';
import SupplierSearch from './pages/mobile/SupplierSearch';
import TransactionSearch from './pages/mobile/TransactionSearch';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* 项目 */}
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<ProjectFormPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="projects/:id/edit" element={<ProjectFormPage />} />
        
        {/* 供应商 */}
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="suppliers/new" element={<SupplierFormPage />} />
        <Route path="suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="suppliers/:id/edit" element={<SupplierFormPage />} />
        
        {/* 采购 */}
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="purchases/new" element={<PurchaseFormPage />} />
        <Route path="purchases/:id" element={<PurchaseDetailPage />} />
        <Route path="purchases/:id/edit" element={<PurchaseFormPage />} />
        
        {/* 收付款 */}
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/new" element={<TransactionFormPage />} />
        <Route path="transactions/:id" element={<TransactionDetailPage />} />
        <Route path="transactions/:id/edit" element={<TransactionFormPage />} />
        
        {/* 发票 */}
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/new" element={<InvoiceFormPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />

        {/* 账号管理 */}
        <Route path="users" element={<UsersPage />} />
        
        {/* 操作日志 */}
        {/* <Route path="logs" element={<LogsPage />} /> */}
       
        {/* 手机端路由 - 放在这里，电脑端路由的末尾 */}
        <Route path="mobile-home" element={<PrivateRoute><MobileHome /></PrivateRoute>} />
        <Route path="mobile/purchase-search" element={<PrivateRoute><PurchaseSearch /></PrivateRoute>} />
        <Route path="mobile/project-search" element={<PrivateRoute><ProjectSearch /></PrivateRoute>} />
        <Route path="mobile/supplier-search" element={<PrivateRoute><SupplierSearch /></PrivateRoute>} />
        <Route path="mobile/transaction-search" element={<PrivateRoute><TransactionSearch /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}

export default App;