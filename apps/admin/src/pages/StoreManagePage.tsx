import { useState, useEffect } from 'react';
import {
  getStores,
  createStore,
  updateStore,
  getAdmins,
  createAdmin,
  Store,
  AdminAccount,
} from '@admin/api/store.api';
import client from '@admin/api/client';
import ImageManagerWidget from '@admin/components/ImageManagerWidget';

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
      <h2 className="mt-0 mb-6 text-[22px]">매장 관리</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* 왼쪽: 매장 목록 + 생성 */}
        <div className="flex flex-col gap-4">
          {/* 매장 생성 폼 */}
          <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h3 className="mt-0 mb-4 text-base">신규 매장 등록</h3>
            <form onSubmit={handleCreateStore} className="flex flex-col gap-2.5">
              <input
                className="w-full box-border px-3 py-[9px] border border-[#ddd] rounded-lg text-sm"
                placeholder="매장명 (예: 강남점)"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                required
              />
              <input
                className="w-full box-border px-3 py-[9px] border border-[#ddd] rounded-lg text-sm"
                placeholder="슬러그 (예: gangnam)"
                value={newStoreSlug}
                onChange={(e) => setNewStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
              />
              {storeError && <p className="text-[#e53935] text-[13px] m-0">{storeError}</p>}
              <button
                type="submit"
                className="px-4 py-[9px] bg-[#ff6b35] text-white border-none rounded-lg cursor-pointer text-sm"
              >
                매장 추가
              </button>
            </form>
          </div>

          {/* 매장 목록 */}
          <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h3 className="mt-0 mb-4 text-base">매장 목록</h3>
            {stores.length === 0 ? (
              <p className="text-[#999] text-sm">등록된 매장이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stores.map((store) => (
                  <div key={store.id}>
                    <div
                      onClick={() => setSelectedStore(store.id === selectedStore?.id ? null : store)}
                      className={`px-4 py-3 cursor-pointer flex items-center justify-between border-2 ${
                        imageOpenId === store.id ? 'rounded-t-lg' : 'rounded-lg'
                      } ${
                        selectedStore?.id === store.id
                          ? 'border-[#ff6b35] bg-[#fff3e0]'
                          : 'border-[#eee] bg-[#fafafa]'
                      } ${imageOpenId === store.id ? 'border-b-0' : ''}`}
                    >
                      <div>
                        <span className="font-semibold text-sm">{store.name}</span>
                        <span className="text-xs text-[#999] ml-2">{store.slug}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                          store.isActive ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#fce4ec] text-[#c62828]'
                        }`}>
                          {store.isActive ? '운영 중' : '비활성'}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleActive(store); }}
                          className="px-2.5 py-1 text-xs rounded-md border border-[#ddd] bg-white cursor-pointer"
                        >
                          {store.isActive ? '비활성화' : '활성화'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setImageOpenId(imageOpenId === store.id ? null : store.id); }}
                          className={`px-2.5 py-1 text-xs rounded-md border border-[#ff6b35] cursor-pointer ${
                            imageOpenId === store.id ? 'bg-[#ff6b35] text-white' : 'bg-white text-brand'
                          }`}
                        >
                          🖼️
                        </button>
                      </div>
                    </div>
                    {imageOpenId === store.id && (
                      <div className="px-4 py-2.5 bg-[#fff8f5] rounded-b-lg border-2 border-[#eee] border-t border-t-[#f0f0f0]">
                        <div className="font-semibold text-xs text-[#555] mb-2">매장 이미지 관리</div>
                        <ImageManagerWidget entityType="stores" entityId={store.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 메뉴 템플릿 배포 */}
          <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h3 className="mt-0 mb-1 text-base">메뉴 템플릿 배포</h3>
            <p className="mt-0 mb-4 text-xs text-[#6b7280]">소스 매장 메뉴를 선택한 대상 매장에 복사합니다.</p>
            <form onSubmit={handleDeployMenu} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[#555] block mb-1">소스 매장 (복사 원본)</label>
                <select
                  className="w-full box-border px-3 py-[9px] border border-[#ddd] rounded-lg text-sm"
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
                <label className="text-xs text-[#555] block mb-1.5">대상 매장 (복수 선택)</label>
                <div className="flex flex-col gap-1.5">
                  {stores
                    .filter((s) => s.id !== deploySourceId)
                    .map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-[13px] cursor-pointer">
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

              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={deployClear}
                  onChange={(e) => setDeployClear(e.target.checked)}
                />
                <span>대상 매장 기존 메뉴 삭제 후 복사</span>
              </label>

              {deployError && <p className="text-[#e53935] text-[13px] m-0">{deployError}</p>}

              <button
                type="submit"
                disabled={deployLoading}
                className={`px-4 py-[9px] bg-[#2563eb] text-white border-none rounded-lg text-sm cursor-pointer ${deployLoading ? 'opacity-60' : ''}`}
              >
                {deployLoading ? '배포 중...' : '메뉴 배포'}
              </button>
            </form>

            {/* 배포 결과 */}
            {deployResults && (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-[13px] font-semibold m-0">배포 결과</p>
                {deployResults.map((r) => {
                  const store = stores.find((s) => s.id === r.targetStoreId);
                  return (
                    <div
                      key={r.targetStoreId}
                      className={`px-3 py-2 rounded-md text-[13px] border ${
                        r.success
                          ? 'bg-[#f0fdf4] border-[#86efac]'
                          : 'bg-[#fef2f2] border-[#fca5a5]'
                      }`}
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
        <div className="flex flex-col gap-4">
          {/* 어드민 생성 폼 */}
          <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h3 className="mt-0 mb-1 text-base">어드민 계정 생성</h3>
            <form onSubmit={handleCreateAdmin} className="flex flex-col gap-2.5 mt-3">
              <input
                className="w-full box-border px-3 py-[9px] border border-[#ddd] rounded-lg text-sm"
                placeholder="아이디"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                required
              />
              <input
                className="w-full box-border px-3 py-[9px] border border-[#ddd] rounded-lg text-sm"
                type="password"
                placeholder="비밀번호 (8자 이상)"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                required
                minLength={8}
              />
              <select
                className="w-full box-border px-3 py-[9px] border border-[#ddd] rounded-lg text-sm"
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
                  <p className="text-xs text-[#555] m-0 mb-1.5">담당 매장 선택 (1개 이상)</p>
                  <div className="flex flex-col gap-1.5 px-3 py-2 bg-[#f9f9f9] rounded-lg border border-[#eee]">
                    {stores.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-[13px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={adminStoreIds.includes(s.id)}
                          onChange={() => toggleAdminStore(s.id)}
                        />
                        <span>{s.name}</span>
                        {!s.isActive && <span className="text-[11px] text-[#999]">(비활성)</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {adminError && <p className="text-[#e53935] text-[13px] m-0">{adminError}</p>}
              <button
                type="submit"
                className={`px-4 py-[9px] bg-[#ff6b35] text-white border-none rounded-lg cursor-pointer text-sm ${
                  adminRole === 'STORE_ADMIN' && adminStoreIds.length === 0 ? 'opacity-50' : ''
                }`}
                disabled={adminRole === 'STORE_ADMIN' && adminStoreIds.length === 0}
              >
                계정 생성
              </button>
            </form>
          </div>

          {/* 어드민 목록 */}
          <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h3 className="mt-0 mb-4 text-base">
              {selectedStore ? `${selectedStore.name} 어드민` : '슈퍼 어드민 목록'}
            </h3>
            {storeAdmins.length === 0 ? (
              <p className="text-[#999] text-sm">등록된 어드민이 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {storeAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    className="px-3.5 py-2.5 bg-[#fafafa] rounded-lg border border-[#eee]"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-sm">{admin.username}</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full ml-2 ${
                          admin.role === 'SUPER_ADMIN'
                            ? 'bg-[#e3f2fd] text-[#1565c0]'
                            : 'bg-[#f3e5f5] text-[#6a1b9a]'
                        }`}>
                          {admin.role === 'SUPER_ADMIN' ? '슈퍼' : '매장'}
                        </span>
                      </div>
                      <span className={`text-[11px] ${admin.isActive ? 'text-[#2e7d32]' : 'text-[#999]'}`}>
                        {admin.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                    {admin.role === 'STORE_ADMIN' && admin.stores?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {admin.stores.map((s) => (
                          <span key={s.id} className="text-[11px] px-1.5 py-0.5 rounded-lg bg-[#fff3e0] text-[#e65100]">
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
