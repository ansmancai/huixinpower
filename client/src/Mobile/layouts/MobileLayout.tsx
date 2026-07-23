import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
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
import MobileLayout from './Mobile/layouts/MobileLayout';

// 维保管理页面（PC版）
import SiteProjectsPage from './pages/site/ProjectsPage';
import SiteProjectDetailPage from './pages/site/ProjectDetailPage';
import SiteInspectionForm from './pages/site/InspectionForm';

// 手机版维保页面
import MobileSiteProjectsPage from './pages/mobile/SiteProjectsPage';
import MobileSiteProjectDetailPage from './pages/mobile/SiteProjectDetailPage';
import MobileSiteInspectionForm from './pages/mobile/SiteInspectionForm';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleGuard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'site') {
      return <Navigate to="/site/projects" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* ==================== 手机端路由（嵌套结构） ==================== */}
      <Route
        element={
          <PrivateRoute>
            <MobileLayout />
          </PrivateRoute>
        }
      >
        {/* 手机端首页 - 所有角色可见 */}
        <Route path="mobile-home" element={<MobileHome />} />

        {/* 手机端财务搜索 - site 角色会被拦截到维保列表 */}
        <Route
          path="mobile/purchase-search"
          element={
            <RoleGuard allowedRoles={['admin', 'finance', 'boss', 'viewer']}>
              <PurchaseSearch />
            </RoleGuard>
          }
        />
        <Route
          path="mobile/project-search"
          element={
            <RoleGuard allowedRoles={['admin', 'finance', 'boss', 'viewer']}>
              <ProjectSearch />
            </RoleGuard>
          }
        />
        <Route
          path="mobile/supplier-search"
          element={
            <RoleGuard allowedRoles={['admin', 'finance', 'boss', 'viewer']}>
              <SupplierSearch />
            </RoleGuard>
          }
        />
        <Route
          path="mobile/transaction-search"
          element={
            <RoleGuard allowedRoles={['admin', 'finance', 'boss', 'viewer']}>
              <TransactionSearch />
            </RoleGuard>
          }
        />

        {/* 手机端维保管理 - site / admin / finance / boss 可访问 */}
        <Route
          path="mobile/site/projects"
          element={
            <RoleGuard allowedRoles={['site', 'admin', 'finance', 'boss']}>
              <MobileSiteProjectsPage />
            </RoleGuard>
          }
        />
        <Route
          path="mobile/site/projects/:id"
          element={
            <RoleGuard allowedRoles={['site', 'admin', 'finance', 'boss']}>
              <MobileSiteProjectDetailPage />
            </RoleGuard>
          }
        />
        <Route
          path="mobile/site/projects/:id/inspection/new"
          element={
            <RoleGuard allowedRoles={['site', 'admin', 'finance', 'boss']}>
              <MobileSiteInspectionForm />
            </RoleGuard>
          }
        />
        <Route
          path="mobile/site/projects/:id/inspection/:inspectionId/edit"
          element={
            <RoleGuard allowedRoles={['site', 'admin', 'finance', 'boss']}>
              <MobileSiteInspectionForm />
            </RoleGuard>
          }
        />
      </Route>

      {/* ==================== PC端维保管理路由 ==================== */}
      <Route
        path="/site"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['site', 'admin', 'finance', 'boss']}>
              <Layout />
            </RoleGuard>
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/site/projects" replace />} />
        <Route path="projects" element={<SiteProjectsPage />} />
        <Route path="projects/:id" element={<SiteProjectDetailPage />} />
        <Route path="projects/:id/inspection/new" element={<SiteInspectionForm />} />
        <Route path="projects/:id/inspection/:inspectionId/edit" element={<SiteInspectionForm />} />
      </Route>

      {/* ==================== PC端主应用路由 ==================== */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <RoleGuard allowedRoles={['admin', 'finance', 'boss', 'viewer']}>
              <Layout />
            </RoleGuard>
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<ProjectFormPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="projects/:id/edit" element={<ProjectFormPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="suppliers/new" element={<SupplierFormPage />} />
        <Route path="suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="suppliers/:id/edit" element={<SupplierFormPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="purchases/new" element={<PurchaseFormPage />} />
        <Route path="purchases/:id" element={<PurchaseDetailPage />} />
        <Route path="purchases/:id/edit" element={<PurchaseFormPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/new" element={<TransactionFormPage />} />
        <Route path="transactions/:id" element={<TransactionDetailPage />} />
        <Route path="transactions/:id/edit" element={<TransactionFormPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/new" element={<InvoiceFormPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="invoices/:id/edit" element={<InvoiceFormPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
    </Routes>
  );
}

export default App;