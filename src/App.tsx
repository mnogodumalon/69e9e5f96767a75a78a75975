import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import ProduktkatalogPage from '@/pages/ProduktkatalogPage';
import BeschaffungsprotokollPage from '@/pages/BeschaffungsprotokollPage';
import VerbrauchserfassungPage from '@/pages/VerbrauchserfassungPage';
import VerbrauchsstatistikPage from '@/pages/VerbrauchsstatistikPage';
import PublicFormProduktkatalog from '@/pages/public/PublicForm_Produktkatalog';
import PublicFormBeschaffungsprotokoll from '@/pages/public/PublicForm_Beschaffungsprotokoll';
import PublicFormVerbrauchserfassung from '@/pages/public/PublicForm_Verbrauchserfassung';
import PublicFormVerbrauchsstatistik from '@/pages/public/PublicForm_Verbrauchsstatistik';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/69e9e5d3c50aa0bc0dbdd1b4" element={<PublicFormProduktkatalog />} />
              <Route path="public/69e9e5d97115acc28bfe78aa" element={<PublicFormBeschaffungsprotokoll />} />
              <Route path="public/69e9e5daed7b54f376491f1f" element={<PublicFormVerbrauchserfassung />} />
              <Route path="public/69e9e5db336260cc4f3e835a" element={<PublicFormVerbrauchsstatistik />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
                <Route path="produktkatalog" element={<ProduktkatalogPage />} />
                <Route path="beschaffungsprotokoll" element={<BeschaffungsprotokollPage />} />
                <Route path="verbrauchserfassung" element={<VerbrauchserfassungPage />} />
                <Route path="verbrauchsstatistik" element={<VerbrauchsstatistikPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
