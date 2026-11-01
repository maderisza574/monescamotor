import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { PosView } from './views/PosView';
import { InventoryView } from './views/InventoryView';
import { TransactionsView } from './views/TransactionsView';
import { UserManagementView } from './views/UserManagementView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('pos');
  const { user, isSuperAdmin } = useAuth();

  return (
    <div className="app-layout">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        {!user && activeTab === 'login' ? (
          <LoginView onLoginSuccess={() => setActiveTab('pos')} />
        ) : activeTab === 'pos' ? (
          <PosView />
        ) : activeTab === 'inventory' ? (
          <InventoryView />
        ) : activeTab === 'transactions' ? (
          <TransactionsView />
        ) : activeTab === 'users' && isSuperAdmin ? (
          <UserManagementView />
        ) : activeTab === 'settings' && isSuperAdmin ? (
          <SettingsView />
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
