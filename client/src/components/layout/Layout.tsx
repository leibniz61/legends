import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/contexts/SidebarContext';
import AppSidebar, { SidebarOpenButton } from './AppSidebar';
import Header from './Header';

export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto px-4 py-8 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
      <SidebarOpenButton />
    </SidebarProvider>
  );
}
