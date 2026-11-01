import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { IoPersonAddOutline, IoTrashOutline, IoPeopleOutline, IoShieldCheckmarkOutline } from 'react-icons/io5';

export const UserManagementView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('KASIR');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await api.post('/users', { username, password, name, role });
      setShowAddModal(false);
      setUsername('');
      setPassword('');
      setName('');
      fetchUsers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal membuat akun kasir baru');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Yakin ingin menghapus akun "${user.name}"?`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Gagal menghapus akun pengguna');
    }
  };

  return (
    <div>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
          }}>
            <IoPeopleOutline />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Manajemen Akun Kasir & Pengguna</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Kelola akses kasir yang berhak melayani transaksi di bengkel
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '0.65rem 1.15rem',
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <IoPersonAddOutline size={18} /> Tambah Akun Kasir
        </button>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Nama Lengkap</th>
              <th style={{ padding: '0.85rem 1rem' }}>Username</th>
              <th style={{ padding: '0.85rem 1rem' }}>Peran (Role)</th>
              <th style={{ padding: '0.85rem 1rem' }}>Status</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Memuat data pengguna...
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>
                    {u.name}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    @{u.username}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {u.role === 'SUPER_ADMIN' ? (
                      <span className="role-tag role-super">OWNER</span>
                    ) : u.role === 'GUDANG' ? (
                      <span className="role-tag role-gudang">STAF GUDANG</span>
                    ) : (
                      <span className="role-tag role-cashier">KASIR POS</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '99px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: u.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: u.is_active ? '#34d399' : '#f87171',
                    }}>
                      {u.is_active ? 'AKTIF' : 'NON-AKTIF'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    {u.role !== 'SUPER_ADMIN' && (
                      <button
                        onClick={() => handleDelete(u)}
                        style={{ background: 'transparent', color: '#ef4444', padding: '4px' }}
                        title="Hapus Akun"
                      >
                        <IoTrashOutline size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah User */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Tambah Akun Kasir Baru</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                &times;
              </button>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                padding: '0.65rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Nama Karyawan / Kasir *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username Login *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: budi123"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Peran (Hak Akses) *</label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="KASIR">Kasir POS (Hanya Akses Kasir & Cetak Struk - Stok Dihide)</option>
                  <option value="GUDANG">Staf Gudang (Hanya Akses Stok & Tambah Barang - Kasir Dihide)</option>
                  <option value="SUPER_ADMIN">Owner Bengkel (Akses Penuh Seluruh Sistem)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '0.75rem',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    borderRadius: '8px',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--primary)',
                    color: '#fff',
                    borderRadius: '8px',
                    fontWeight: 700,
                  }}
                >
                  {saving ? 'Menyimpan...' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
