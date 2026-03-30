import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ItemListPage } from './pages/ItemListPage';
import { ItemDetailPage } from './pages/ItemDetailPage';
import { ItemCreatePage } from './pages/ItemCreatePage';
import { ContainerListPage } from './pages/ContainerListPage';
import { ContainerDetailPage } from './pages/ContainerDetailPage';
import { LocationListPage } from './pages/LocationListPage';
import { LocationDetailPage } from './pages/LocationDetailPage';
import { CategoryListPage } from './pages/CategoryListPage';
import { ActivityPage } from './pages/ActivityPage';
import { ExportPage } from './pages/ExportPage';
import { ImportPage } from './pages/ImportPage';
import { FloorPlanPage } from './pages/FloorPlanPage';
import { UsersPage } from './pages/UsersPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/items" element={<ItemListPage />} />
            <Route path="/items/new" element={<ItemCreatePage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="/containers" element={<ContainerListPage />} />
            <Route path="/containers/:id" element={<ContainerDetailPage />} />
            <Route path="/locations" element={<LocationListPage />} />
            <Route path="/locations/:id" element={<LocationDetailPage />} />
            <Route path="/categories" element={<CategoryListPage />} />
            <Route path="/floorplan" element={<FloorPlanPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/activity" element={<ActivityPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
