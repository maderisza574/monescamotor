import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  IoReceiptOutline, 
  IoCubeOutline, 
  IoTimeOutline, 
  IoPeopleOutline, 
  IoSettingsOutline, 
  IoLogOutOutline,
  IoSpeedometer
} from 'react-icons/io5';
import { FaMotorcycle } from 'react-icons/fa6';

export const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logout, isSuperAdmin, isKasir, isGudang } = useAuth();

  return (
    <>
      <header className="navbar">
        <div className="navbar-container">
          <div 
            className="brand-logo" 
            onClick={() => setActiveTab(isGudang ? 'inventory' : 'pos')} 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
          >
            <img 
              src="/logo.png" 
              alt="Monesca Motor" 
              style={{ 
                height: '36px', 
                width: 'auto', 
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(37, 99, 235, 0.4))'
              }} 
            />
            <span className="brand-badge">
              {isSuperAdmin ? 'POS & STOK' : isGudang ? 'STOK GUDANG' : 'KASIR POS'}
            </span>
          </div>

          <nav className="nav-links">
            {/* 1. Kasir POS: Khusus OWNER & KASIR (Gudang Dihide) */}
            {(isSuperAdmin || isKasir) && (
              <button
                className={`nav-btn ${activeTab === 'pos' ? 'active' : ''}`}
                onClick={() => setActiveTab('pos')}
              >
                <IoReceiptOutline size={18} />
                <span>Kasir POS</span>
              </button>
            )}

            {/* 2. Stok & Gudang: Khusus OWNER & GUDANG (Kasir Dihide) */}
            {(isSuperAdmin || isGudang) && (
              <button
                className={`nav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
              >
                <IoCubeOutline size={18} />
                <span>Stok & Gudang</span>
              </button>
            )}

            {/* 3. Riwayat Transaksi: Khusus OWNER & KASIR (Gudang Dihide) */}
            {(isSuperAdmin || isKasir) && (
              <button
                className={`nav-btn ${activeTab === 'transactions' ? 'active' : ''}`}
                onClick={() => setActiveTab('transactions')}
              >
                <IoTimeOutline size={18} />
                <span>Riwayat Transaksi</span>
              </button>
            )}

            {/* 4. Khusus OWNER (Super Admin): Akun & Profil Toko */}
            {isSuperAdmin && (
              <>
                <button
                  className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveTab('users')}
                >
                  <IoPeopleOutline size={18} />
                  <span>Akun Kasir</span>
                </button>

                <button
                  className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                >
                  <IoSettingsOutline size={18} />
                  <span>Toko & Struk</span>
                </button>
              </>
            )}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user ? (
              <div className="user-badge">
                <span style={{ fontWeight: 700 }}>{user.name}</span>
                <span className={`role-tag ${isSuperAdmin ? 'role-super' : isGudang ? 'role-gudang' : 'role-cashier'}`}>
                  {isSuperAdmin ? 'OWNER' : isGudang ? 'GUDANG' : 'KASIR'}
                </span>
                <button
                  onClick={logout}
                  style={{
                    background: 'transparent',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                    marginLeft: '4px',
                  }}
                  title="Keluar"
                >
                  <IoLogOutOutline size={18} />
                </button>
              </div>
            ) : (
              <button
                className="nav-btn active"
                onClick={() => setActiveTab('login')}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar for Smartphone */}
      <div className="mobile-bottom-nav">
        {(isSuperAdmin || isKasir) && (
          <button
            className={`mobile-nav-item ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            <IoReceiptOutline size={20} />
            <span>Kasir</span>
          </button>
        )}

        {(isSuperAdmin || isGudang) && (
          <button
            className={`mobile-nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <IoCubeOutline size={20} />
            <span>Gudang</span>
          </button>
        )}

        {(isSuperAdmin || isKasir) && (
          <button
            className={`mobile-nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <IoTimeOutline size={20} />
            <span>Riwayat</span>
          </button>
        )}

        {isSuperAdmin && (
          <button
            className={`mobile-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <IoPeopleOutline size={20} />
            <span>Akun</span>
          </button>
        )}
      </div>
    </>
  );
};
