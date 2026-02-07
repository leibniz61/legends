import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface SidebarContextType {
  // Left sidebar
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  // Right mobile menu
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Left sidebar controls - close mobile menu when opening
  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) setIsMobileMenuOpen(false);
      return !prev;
    });
  }, []);
  const open = useCallback(() => {
    setIsOpen(true);
    setIsMobileMenuOpen(false);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  // Right mobile menu controls - close sidebar when opening
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => {
      if (!prev) setIsOpen(false);
      return !prev;
    });
  }, []);
  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
    setIsOpen(false);
  }, []);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  return (
    <SidebarContext.Provider value={{
      isOpen, toggle, open, close,
      isMobileMenuOpen, toggleMobileMenu, openMobileMenu, closeMobileMenu
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
