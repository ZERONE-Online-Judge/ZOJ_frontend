import { Route, Routes } from 'react-router-dom';
import { appRoutes } from '@/routes/routeConfig';

export default function AppRoutes() {
  return (
    <Routes>
      {appRoutes.map(({ path, Component }) => (
        <Route element={<Component />} key={path} path={path} />
      ))}
    </Routes>
  );
}
