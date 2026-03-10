import { useState, useEffect } from 'react';
import {
  getStores,
  createStore,
  updateStore,
  getAdmins,
  createAdmin,
  Store,
  AdminAccount,
} from '../api/store.api';

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 14,
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  padding: '9px 18px',
  background: '#ff6b35',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
};

export default function StoreManagePage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  // 매장 생성 폼
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreSlug, setNewStoreSlug] = useState('');
  const [storeError, setStoreError] = useState('');

  // 어드민 생성 폼
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminRole, setAdminRole] = useState<'SUPER_ADMIN' | 'STORE_ADMIN'>('STORE_ADMIN');
  const [adminError, setAdminError] = useState('');

  const load = async () => {
    const [s, a] = await Promise.all([getStores(), getAdmins()]);
    setStores(s);
    setAdmins(a);
  };

  useEffect(() => { load(); }, []);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreError('');
    try {
      await createStore({ name: newStoreName, slug: newStoreSlug });
      setNewStoreName('');
      setNewStoreSlug('');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setStoreError(msg ?? '매장 생성에 실패했습니다.');
    }
  };

  const handleToggleActive = async (store: Store) => {
    await updateStore(store.id, { isActive: !store.isActive });
    load();
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    try {
      await createAdmin({
        username: newAdminUsername,
        password: newAdminPassword,
        role: adminRole,
        storeId: adminRole === 'STORE_ADMIN' ? selectedStore?.id : undefined,
      });
      setNewAdminUsername('');
      setNewAdminPassword('');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAdminError(msg ?? '어드민 계정 생성에 실패했습니다.');
    }
  };

  const storeAdmins = selectedStore
    ? admins.filter((a) => a.storeId === selectedStore.id)
    : admins.filter((a) => a.role === 'SUPER_ADMIN');

  return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: 22 }}>매장 관리</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 왼쪽: 매장 목록 + 생성 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 매장 생성 폼 */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>신규 매장 등록</h3>
            <form onSubmit={handleCreateStore} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                style={inputStyle}
                placeholder="매장명 (예: 강남점)"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                required
              />
              <input
                style={inputStyle}
                placeholder="슬러그 (예: gangnam)"
                value={newStoreSlug}
                onChange={(e) => setNewStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
              />
              {storeError && <p style={{ color: '#e53935', fontSize: 13, margin: 0 }}>{storeError}</p>}
              <button type="submit" style={btnPrimary}>매장 추가</button>
            </form>
          </div>

          {/* 매장 목록 */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>매장 목록</h3>
            {stores.length === 0 ? (
              <p style={{ color: '#999', fontSize: 14 }}>등록된 매장이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stores.map((store) => (
                  <div
                    key={store.id}
                    onClick={() => setSelectedStore(store.id === selectedStore?.id ? null : store)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: `2px solid ${selectedStore?.id === store.id ? '#ff6b35' : '#eee'}`,
                      cursor: 'pointer',
                      background: selectedStore?.id === store.id ? '#fff3e0' : '#fafafa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{store.name}</span>
                      <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>{store.slug}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10,
                        background: store.isActive ? '#e8f5e9' : '#fce4ec',
                        color: store.isActive ? '#2e7d32' : '#c62828',
                      }}>
                        {store.isActive ? '운영 중' : '비활성'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(store); }}
                        style={{
                          padding: '4px 10px', fontSize: 12, borderRadius: 6,
                          border: '1px solid #ddd', background: '#fff', cursor: 'pointer',
                        }}
                      >
                        {store.isActive ? '비활성화' : '활성화'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 어드민 계정 관리 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 어드민 생성 폼 */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>어드민 계정 생성</h3>
            {adminRole === 'STORE_ADMIN' && !selectedStore && (
              <p style={{ fontSize: 12, color: '#ff6b35', margin: '0 0 12px' }}>
                왼쪽에서 매장을 선택하세요.
              </p>
            )}
            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <input
                style={inputStyle}
                placeholder="아이디"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                required
              />
              <input
                style={inputStyle}
                type="password"
                placeholder="비밀번호 (8자 이상)"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                required
                minLength={8}
              />
              <select
                style={inputStyle}
                value={adminRole}
                onChange={(e) => setAdminRole(e.target.value as 'SUPER_ADMIN' | 'STORE_ADMIN')}
              >
                <option value="STORE_ADMIN">매장 어드민</option>
                <option value="SUPER_ADMIN">슈퍼 어드민</option>
              </select>
              {adminRole === 'STORE_ADMIN' && selectedStore && (
                <div style={{ padding: '8px 12px', background: '#f0f0f0', borderRadius: 6, fontSize: 13, color: '#555' }}>
                  연결 매장: <strong>{selectedStore.name}</strong>
                </div>
              )}
              {adminError && <p style={{ color: '#e53935', fontSize: 13, margin: 0 }}>{adminError}</p>}
              <button
                type="submit"
                style={{ ...btnPrimary, opacity: (adminRole === 'STORE_ADMIN' && !selectedStore) ? 0.5 : 1 }}
                disabled={adminRole === 'STORE_ADMIN' && !selectedStore}
              >
                계정 생성
              </button>
            </form>
          </div>

          {/* 어드민 목록 */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>
              {selectedStore ? `${selectedStore.name} 어드민` : '슈퍼 어드민 목록'}
            </h3>
            {storeAdmins.length === 0 ? (
              <p style={{ color: '#999', fontSize: 14 }}>등록된 어드민이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {storeAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    style={{ padding: '10px 14px', background: '#fafafa', borderRadius: 8, border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{admin.username}</span>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 10, marginLeft: 8,
                        background: admin.role === 'SUPER_ADMIN' ? '#e3f2fd' : '#f3e5f5',
                        color: admin.role === 'SUPER_ADMIN' ? '#1565c0' : '#6a1b9a',
                      }}>
                        {admin.role === 'SUPER_ADMIN' ? '슈퍼' : '매장'}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11, color: admin.isActive ? '#2e7d32' : '#999',
                    }}>
                      {admin.isActive ? '활성' : '비활성'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
