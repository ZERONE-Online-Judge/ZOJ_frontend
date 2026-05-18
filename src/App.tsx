import { BrowserRouter } from 'react-router-dom';
import AppProviders from '@/app/providers/AppProviders';
import Layout from '@/components/layout/Layout';
import AppRoutes from '@/routes/AppRoutes';

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Layout>
          <AppRoutes />
        </Layout>
      </BrowserRouter>
    </AppProviders>
  );
}
