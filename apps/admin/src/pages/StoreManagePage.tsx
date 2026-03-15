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
import client from '../api/client';
import ImageManagerWidget from '../components/ImageManagerWidget';

interface DeployResult {
  targetStoreId: string;
  success: boolean;
  categoriesCreated: number;
  itemsCreated: number;
  error?: string;
}

const deployMenu = (data: {
  sourceStoreId: string;
  targetStoreIds: string[];
  clearTarget: boolean;
}): Promise<DeployResult[]> => client.post('/menu/deploy', data);

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
  const [adminStoreIds, setAdminStoreIds] = useState<string[]>([]);
  const [adminError, setAdminError] = useState('');

  // 메뉴 배포 폼
  const [deploySourceId, setDeploySourceId] = useState('');
  const [deployTargetIds, setDeployTargetIds] = useState<string[]>([]);
  const [deployClear, setDeployClear] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployResults, setDeployResults] = useState<DeployResult[] | null>(null);
  const [deployError, setDeployError] = useState('');
  const [imageOpenId, setImageOpenId] = useState<string | null>(null);

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

  const toggleAdminStore = (id: string) => {
    setAdminStoreIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    try {
      await createAdmin({
        username: newAdminUsername,
        password: newAdminPassword,
        role: adminRole,
        storeIds: adminRole === 'STORE_ADMIN' ? adminStoreIds : undefined,
      });
      setNewAdminUsername('');
      setNewAdminPassword('');
      setAdminStoreIds([]);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAdminError(msg ?? '어드민 계정 생성에 실패했습니다.');
    }
  };

  const handleDeployMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeployError('');
    setDeployResults(null);
    if (!deploySourceId || deployTargetIds.length === 0) {
      setDeployError('소스 매장과 대상 매장을 선택하세요.');
      return;
    }
    setDeployLoading(true);
    try {
      const results = await deployMenu({
        sourceStoreId: deploySourceId,
        targetStoreIds: deployTargetIds,
        clearTarget: deployClear,
      });
      setDeployResults(results as DeployResult[]);
    } catch {
      setDeployError('배포 중 오류가 발생했습니다.');
    } finally {
      setDeployLoading(false);
    }
  };

  const toggleDeployTarget = (id: string) => {
    setDeployTargetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const storeAdmins = selectedStore
    ? admins.filter((a) => a.stores?.some((s) => s.id === selectedStore.id))
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
                  <div key={store.id}>
                    <div
                      onClick={() => setSelectedStore(store.id === selectedStore?.id ? null : store)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: imageOpenId === store.id ? '8px 8px 0 0' : 8,
                        border: `2px solid ${selectedStore?.id === store.id ? '#ff6b35' : '#eee'}`,
                        borderBottom: imageOpenId === store.id ? 'none' : undefined,
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
                        <button
                          onClick={(e) => { e.stopPropagation(); setImageOpenId(imageOpenId === store.id ? null : store.id); }}
                          style={{
                            padding: '4px 10px', fontSize: 12, borderRadius: 6,
                            border: '1px solid #ff6b35',
                            background: imageOpenId === store.id ? '#ff6b35' : '#fff',
                            color: imageOpenId === store.id ? '#fff' : '#ff6b35',
                            cursor: 'pointer',
                          }}
                        >
                          🖼️
                        </button>
                      </div>
                    </div>
                    {imageOpenId === store.id && (
                      <div style={{ padding: '10px 16px', background: '#fff8f5', borderRadius: '0 0 8px 8px', border: '2px solid #eee', borderTop: '1px solid #f0f0f0' }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#555', marginBottom: 8 }}>매장 이미지 관리</div>
                        <ImageManagerWidget entityType="stores" entityId={store.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 메뉴 템플릿 배포 */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>메뉴 템플릿 배포</h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#6b7280' }}>소스 매장 메뉴를 선택한 대상 매장에 복사합니다.</p>
            <form onSubmit={handleDeployMenu} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>소스 매장 (복사 원본)</label>
                <select
                  style={inputStyle}
                  value={deploySourceId}
                  onChange={(e) => setDeploySourceId(e.target.value)}
                >
                  <option value="">-- 선택 --</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 6 }}>대상 매장 (복수 선택)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {stores
                    .filter((s) => s.id !== deploySourceId)
                    .map((s) => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={deployTargetIds.includes(s.id)}
                          onChange={() => toggleDeployTarget(s.id)}
                        />
                        {s.name}
                      </label>
                    ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={deployClear}
                  onChange={(e) => setDeployClear(e.target.checked)}
                />
                <span>대상 매장 기존 메뉴 삭제 후 복사</span>
              </label>

              {deployError && <p style={{ color: '#e53935', fontSize: 13, margin: 0 }}>{deployError}</p>}

              <button
                type="submit"
                disabled={deployLoading}
                style={{ ...btnPrimary, background: '#2563eb', opacity: deployLoading ? 0.6 : 1 }}
              >
                {deployLoading ? '배포 중...' : '메뉴 배포'}
              </button>
            </form>

            {/* 배포 결과 */}
            {deployResults && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>배포 결과</p>
                {deployResults.map((r) => {
                  const store = stores.find((s) => s.id === r.targetStoreId);
                  return (
                    <div
                      key={r.targetStoreId}
                      style={{
                        padding: '8px 12px', borderRadius: 6,
                        background: r.success ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${r.success ? '#86efac' : '#fca5a5'}`,
                        fontSize: 13,
                      }}
                    >
                      <strong>{store?.name ?? r.targetStoreId}</strong>:{' '}
                      {r.success
                        ? `카테고리 ${r.categoriesCreated}개, 아이템 ${r.itemsCreated}개 복사 완료`
                        : `실패 — ${r.error}`}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 어드민 계정 관리 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 어드민 생성 폼 */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>어드민 계정 생성</h3>
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
                onChange={(e) => {
                  setAdminRole(e.target.value as 'SUPER_ADMIN' | 'STORE_ADMIN');
                  setAdminStoreIds([]);
                }}
              >
                <option value="STORE_ADMIN">매장 어드민</option>
                <option value="SUPER_ADMIN">슈퍼 어드민</option>
              </select>
              {adminRole === 'STORE_ADMIN' && (
                <div>
                  <p style={{ fontSize: 12, color: '#555', margin: '0 0 6px' }}>담당 매장 선택 (1개 이상)</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px', background: '#f9f9f9', borderRadius: 8, border: '1px solid #eee' }}>
                    {stores.map((s) => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={adminStoreIds.includes(s.id)}
                          onChange={() => toggleAdminStore(s.id)}
                        />
                        <span>{s.name}</span>
                        {!s.isActive && <span style={{ fontSize: 11, color: '#999' }}>(비활성)</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {adminError && <p style={{ color: '#e53935', fontSize: 13, margin: 0 }}>{adminError}</p>}
              <button
                type="submit"
                style={{ ...btnPrimary, opacity: (adminRole === 'STORE_ADMIN' && adminStoreIds.length === 0) ? 0.5 : 1 }}
                disabled={adminRole === 'STORE_ADMIN' && adminStoreIds.length === 0}
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
                    style={{ padding: '10px 14px', background: '#fafafa', borderRadius: 8, border: '1px solid #eee' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                      <span style={{ fontSize: 11, color: admin.isActive ? '#2e7d32' : '#999' }}>
                        {admin.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                    {admin.role === 'STORE_ADMIN' && admin.stores?.length > 0 && (
                      <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {admin.stores.map((s) => (
                          <span key={s.id} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: '#fff3e0', color: '#e65100' }}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
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
