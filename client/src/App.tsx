import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useMobile } from './hooks/useMobile';
import Layout from './components/Layout';
import MobileLayout from './mobile/layouts/MobileLayout';
import MobileHome from './mobile/pages/MobileHome';
import MobilePurchaseSearch from './mobile/pages/MobilePurchaseSearch';
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
import LogsPage from './pages/LogsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// 手机端路由
function MobileRoutes() {
  return (
    <MobileLayout>
      <Routes>
        <Route index element={<MobileHome />} />
        <Route path="purchase-search" element={<MobilePurchaseSearch />} />
        {/* 后续添加其他查询页面 */}
      </Routes>
    </MobileLayout>
  );
}

function App() {
  // 通过域名判断手机端
  const isMobileDomain = window.location.hostname === 'mb.gdhxpower.com';
  // 通过设备判断（备用）
  const isMobileDevice = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isMobile = isMobileDomain || isMobileDevice;

  // 手机端
  if (isMobile) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/mobile/*" element={<PrivateRoute><MobileRoutes /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/mobile" replace />} />
      </Routes>
    );
  }

  // 电脑端
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
        <Route path="logs" element={<LogsPage />} />
      </Route>
    </Routes>
  );
}

export default App;