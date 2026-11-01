import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { PosView } from './views/PosView';
import { InventoryView } from './views/InventoryView';
import { TransactionsView } from './views/TransactionsView';
import { UserManagementView } from './views/UserManagementView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';

const MainApp = () => {
  const { user, isSuperAdmin, isKasir, isGudang } = useAuth();

  const getDefaultTab = (u) => {
    if (u?.role === 'GUDANG') return 'inventory';
    return 'pos';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab(user));

  // Otomatis sesuaikan tab saat role user berubah atau setelah login
  useEffect(() => {
    if (user?.role === 'GUDANG' && (activeTab === 'pos' || activeTab === 'transactions')) {
      setActiveTab('inventory');
    } else if (user?.role === 'KASIR' && activeTab === 'inventory') {
      setActiveTab('pos');
    }
  }, [user]);

  // Jika belum login, wajib masuk ke halaman login terlebih dahulu
  if (!user) {
    return (
      <div className="app-layout">
        <LoginView onLoginSuccess={(loggedInUser) => {
          setActiveTab(getDefaultTab(loggedInUser));
        }} />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        {activeTab === 'pos' && (isSuperAdmin || isKasir) ? (
          <PosView />
        ) : activeTab === 'inventory' && (isSuperAdmin || isGudang) ? (
          <InventoryView />
        ) : activeTab === 'transactions' && (isSuperAdmin || isKasir) ? (
          <TransactionsView />
        ) : activeTab === 'users' && isSuperAdmin ? (
          <UserManagementView />
        ) : activeTab === 'settings' && isSuperAdmin ? (
          <SettingsView />
        ) : isGudang ? (
          <InventoryView />
        ) : (
          <PosView />
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
