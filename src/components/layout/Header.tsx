import HeaderAuthControls from '@/components/layout/HeaderAuthControls';
import HeaderShell from '@/components/layout/HeaderShell';
import { navigationRoutes } from '@/routes/routeConfig';

export default function Header() {
  return (
    <HeaderShell
      actionClassName="flex-nowrap xl:w-auto"
      actions={<HeaderAuthControls loginTo="/login" />}
      ariaLabel="Main navigation"
      navItems={navigationRoutes.map(({ name, path }) => ({
        key: path,
        label: name,
        to: path,
      }))}
    />
  );
}
