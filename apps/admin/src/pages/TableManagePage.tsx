import { useEffect, useState } from 'react';
import {
  getTables,
  createTable,
  deleteTable,
  getTableSession,
  adminMoveSession,
  deleteTableSession,
} from '@admin/api/table.api';
import { Table, TableSessionInfo } from '@qr-order/shared-types';
import ConfirmDialog from '@admin/components/ConfirmDialog';
import { useAuthStore } from '@admin/stores/authStore';
import { useStoreNames } from '@admin/hooks/useStoreNames';
import ImageManagerWidget from '@admin/components/ImageManagerWidget';

export default function TableManagePage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [tableName, setTableName] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [imageOpenId, setImageOpenId] = useState<string | null>(null);
  const { currentStoreId, isSuperAdmin } = useAuthStore();
  const superAdmin = isSuperAdmin();
  const isAllStores = superAdmin && !currentStoreId;
  const storeNameMap = useStoreNames();

  // 세션 상태 관리
  const [sessionMap, setSessionMap] = useState<Record<string, TableSessionInfo | null>>({});
  const [sessionLoading, setSessionLoading] = useState(false);

  // 세션 이동 모달 상태
  const [moveSourceId, setMoveSourceId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string>('');
  const [moveLoading, setMoveLoading] = useState(false);

  // 세션 삭제 확인
  const [sessionDeleteTargetId, setSessionDeleteTargetId] = useState<string | null>(null);

  const fetchTables = () => getTables().then(setTables);

  const fetchSessions = async (tableList: Table[]) => {
    setSessionLoading(true);
    const results: Record<string, TableSessionInfo | null> = {};
    await Promise.all(
      tableList.map(async (t) => {
        try {
          results[t.id] = await getTableSession(t.id);
        } catch {
          results[t.id] = null;
        }
      }),
    );
    setSessionMap(results);
    setSessionLoading(false);
  };

  useEffect(() => {
    getTables().then((list) => {
      setTables(list);
      fetchSessions(list);
    });

    // 30초마다 세션 상태 자동 새로고침
    const interval = setInterval(() => {
      getTables().then((list) => {
        setTables(list);
        fetchSessions(list);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [currentStoreId]);

  const handleCreate = async () => {
    if (!tableNumber || !tableName.trim()) return;
    await createTable({ tableNumber: parseInt(tableNumber), name: tableName });
    setTableNumber('');
    setTableName('');
    const list = await getTables();
    setTables(list);
    fetchSessions(list);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    await deleteTable(deleteTargetId);
    setDeleteTargetId(null);
    const list = await getTables();
    setTables(list);
    fetchSessions(list);
  };

  const handleSessionMove = async () => {
    if (!moveSourceId || !moveTargetId) return;
    setMoveLoading(true);
    try {
      await adminMoveSession(moveSourceId, moveTargetId);
      setMoveSourceId(null);
      setMoveTargetId('');
      fetchSessions(tables);
    } catch (err: any) {
      const msg = err.response?.data?.message || '세션 이동에 실패했습니다.';
      alert(msg);
    } finally {
      setMoveLoading(false);
    }
  };

  const handleSessionDeleteConfirm = async () => {
    if (!sessionDeleteTargetId) return;
    try {
      await deleteTableSession(sessionDeleteTargetId);
      setSessionDeleteTargetId(null);
      fetchSessions(tables);
    } catch (err: any) {
      const msg = err.response?.data?.message || '세션 삭제에 실패했습니다.';
      alert(msg);
    }
  };

  const deleteTarget = tables.find((t) => t.id === deleteTargetId);
  const sessionDeleteTarget = tables.find((t) => t.id === sessionDeleteTargetId);

  // 이동 가능한 테이블 (세션 없는 것만)
  const availableTargets = tables.filter(
    (t) => t.id !== moveSourceId && !sessionMap[t.id],
  );

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="m-0">테이블 관리</h2>
        {superAdmin && (
          <span className={`px-3 py-1 rounded-full text-[13px] font-semibold ${
            isAllStores ? 'bg-[#e8f5e9] text-[#1b5e20]' : 'bg-[#e3f2fd] text-[#0d47a1]'
          }`}>
            {isAllStores ? '전체 매장' : (storeNameMap[currentStoreId!] || '선택된 매장')}
          </span>
        )}
        {!isAllStores && (
          <button
            onClick={() => fetchSessions(tables)}
            disabled={sessionLoading}
            className="ml-auto px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm cursor-pointer"
          >
            {sessionLoading ? '새로고침 중...' : '세션 새로고침'}
          </button>
        )}
      </div>

      {isAllStores ? (
        <div className="bg-[#fff8e1] border border-[#ffe082] rounded-xl px-5 py-4 mb-6 text-[#795548]">
          전체 보기 모드입니다. 테이블을 추가/삭제하려면 상단에서 매장을 선택해주세요.
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h3 className="mt-0 mb-3">테이블 추가</h3>
          <div className="flex gap-2">
            <input
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="테이블 번호"
              type="number"
              className="w-[120px] px-3 py-2 border border-[#ddd] rounded-lg"
            />
            <input
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="테이블 이름 (예: A-1)"
              className="flex-1 px-3 py-2 border border-[#ddd] rounded-lg"
            />
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-[#ff6b35] text-white border-none rounded-lg cursor-pointer"
            >
              추가
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {tables.map((table) => {
          const session = sessionMap[table.id];
          return (
            <div key={table.id} className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="m-0 mb-1 font-bold text-lg">{table.tableNumber}번</p>
                  <p className="m-0 mb-1 text-[#666]">{table.name}</p>
                  <p className="m-0 text-xs text-[#888]">최대 {table.capacity}인</p>
                  {isAllStores && table.storeId && storeNameMap[table.storeId] && (
                    <p className="mt-1 m-0 text-xs text-[#aaa]">{storeNameMap[table.storeId]}</p>
                  )}
                </div>
                {!isAllStores && (
                  <button
                    onClick={() => setDeleteTargetId(table.id)}
                    className="bg-transparent border-none text-[#bbb] cursor-pointer text-lg"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* 세션 상태 */}
              {!isAllStores && (
                <div className={`mt-3 p-2.5 rounded-lg text-xs ${
                  session
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-100'
                }`}>
                  {session ? (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        <span className="font-semibold text-green-700">사용 중</span>
                      </div>
                      <p className="m-0 text-gray-600">
                        PIN: <strong className="tracking-wider">{session.pin}</strong>
                      </p>
                      <p className="m-0 text-gray-600">
                        인원: {session.joinedCount}/{session.capacity}명
                      </p>
                      <p className="m-0 text-gray-500">
                        만료: {formatTime(session.expiresAt)}
                      </p>
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => { setMoveSourceId(table.id); setMoveTargetId(''); }}
                          className="flex-1 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs cursor-pointer"
                        >
                          이동
                        </button>
                        <button
                          onClick={() => setSessionDeleteTargetId(table.id)}
                          className="flex-1 px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded text-xs cursor-pointer"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                      <span className="text-gray-400">빈 테이블</span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setImageOpenId(imageOpenId === table.id ? null : table.id)}
                className={`mt-2.5 w-full px-2.5 py-1 border border-[#ff6b35] rounded-md cursor-pointer text-xs ${
                  imageOpenId === table.id ? 'bg-[#ff6b35] text-white' : 'bg-transparent text-brand'
                }`}
              >
                이미지 관리
              </button>
              {imageOpenId === table.id && (
                <div className="mt-2 border-t border-[#f0f0f0] pt-2">
                  <ImageManagerWidget entityType="tables" entityId={table.id} readonly={isAllStores} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 테이블 삭제 확인 */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="테이블 삭제"
        message={deleteTarget ? `${deleteTarget.tableNumber}번 테이블(${deleteTarget.name})을 삭제하시겠습니까?` : ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* 세션 삭제 확인 */}
      <ConfirmDialog
        isOpen={!!sessionDeleteTargetId}
        title="세션 강제 삭제"
        message={sessionDeleteTarget
          ? `${sessionDeleteTarget.tableNumber}번 테이블(${sessionDeleteTarget.name})의 활성 세션을 삭제하시겠습니까?\n고객의 세션이 종료되며, 진행 중인 주문은 유지됩니다.`
          : ''}
        onConfirm={handleSessionDeleteConfirm}
        onCancel={() => setSessionDeleteTargetId(null)}
      />

      {/* 세션 이동 모달 */}
      {moveSourceId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMoveSourceId(null)} />
          <div className="relative bg-white rounded-xl p-6 w-[360px] shadow-xl z-10">
            <h3 className="mt-0 mb-4">세션 이동</h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{tables.find((t) => t.id === moveSourceId)?.name}</strong>의 세션을 이동할 테이블을 선택하세요.
            </p>
            {availableTargets.length === 0 ? (
              <p className="text-sm text-red-500">이동 가능한 빈 테이블이 없습니다.</p>
            ) : (
              <select
                value={moveTargetId}
                onChange={(e) => setMoveTargetId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              >
                <option value="">대상 테이블 선택</option>
                {availableTargets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tableNumber}번 - {t.name} (최대 {t.capacity}인)
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setMoveSourceId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer bg-white"
              >
                취소
              </button>
              <button
                onClick={handleSessionMove}
                disabled={!moveTargetId || moveLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white border-none rounded-lg cursor-pointer disabled:opacity-50"
              >
                {moveLoading ? '이동 중...' : '이동'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
