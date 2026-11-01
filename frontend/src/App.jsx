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
  const { user, loading, isSuperAdmin, isKasir, isGudang } = useAuth();

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

  // Loading state saat cek sesi login tersimpan
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0b1120',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '0.85rem',
      }}>
        <img 
          src="/logo.png" 
          alt="Monesca Motor" 
          style={{ height: '48px', filter: 'drop-shadow(0 4px 14px rgba(37, 99, 235, 0.45))' }} 
        />
        <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
          Memuat sistem Monesca Motor...
        </div>
      </div>
    );
  }

  // Jika belum login, WAJIB tampil form login (Orang asing/iseng tidak bisa masuk atau lihat data apapun)
  if (!user) {
    return (
      <LoginView onLoginSuccess={(loggedInUser) => {
        setActiveTab(getDefaultTab(loggedInUser));
      }} />
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
          <TransactionsView onNavigateToPos={() => setActiveTab('pos')} />
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
