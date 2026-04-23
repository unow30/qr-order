import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface Store {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface TableWithToken {
  table: {
    id: string;
    tableNumber: number;
    name: string;
    capacity: number;
    isActive: boolean;
  };
  token: string | null;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function StorePage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [tables, setTables] = useState<TableWithToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/stores/list`)
      .then((res) => res.json())
      .then((data) => {
        setStores(data?.data ?? data);
        setLoading(false);
      })
      .catch(() => {
        setError('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.');
        setLoading(false);
      });
  }, []);

  const handleSelectStore = (store: Store) => {
    setSelectedStore(store);
    setTablesLoading(true);
    setTables([]);
    fetch(`${API_BASE}/tables/with-tokens?storeId=${store.id}`)
      .then((res) => res.json())
      .then((data) => {
        setTables(data?.data ?? data);
        setTablesLoading(false);
      })
      .catch(() => {
        setError('테이블 정보를 불러올 수 없습니다.');
        setTablesLoading(false);
      });
  };

  const handleBack = () => {
    setSelectedStore(null);
    setTables([]);
    setError(null);
  };

  const buildEntryUrl = (tableId: string, token: string) =>
    `/entry?tableId=${tableId}&token=${token}`;

  const buildEntryAbsoluteUrl = (tableId: string, token: string) =>
    `${window.location.origin}${buildEntryUrl(tableId, token)}`;

  // Store 상세 (테이블 목록)
  if (selectedStore) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <header className="px-4 py-3 bg-white border-b border-zinc-100 sticky top-0 z-10">
          <button
            onClick={handleBack}
            className="text-[11px] text-zinc-500 hover:text-zinc-800 mb-1"
          >
            ← 매장 목록
          </button>
          <p className="mb-0.5 text-[10px] font-semibold text-zinc-500 tracking-[0.2px]">
            🛠 Dev — {selectedStore.slug}
          </p>
          <h1 className="text-base font-extrabold text-zinc-900 tracking-[-0.3px]">
            {selectedStore.name}
          </h1>
          <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed">
            테이블의 QR 코드를 스캔하거나 입장 링크를 클릭하면 고객 진입 화면으로 이동합니다
          </p>
        </header>

        <div className="flex-1 px-4 py-4">
          {tablesLoading && (
            <div className="flex items-center justify-center py-10">
              <div
                className="w-11 h-11 rounded-full border-[3px] border-zinc-100 border-t-brand-500"
                style={{ animation: 'spin 1s linear infinite' }}
              />
            </div>
          )}
          {error && (
            <div className="px-4 py-2.5 bg-red-50 text-[11px] text-red-700 rounded-[10px] mb-3">
              {error}
            </div>
          )}

          {!tablesLoading && !error && tables.length === 0 && (
            <p className="text-[11px] text-zinc-500 text-center py-10">
              등록된 테이블이 없습니다
            </p>
          )}

          {!tablesLoading && !error && tables.length > 0 && (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
            >
              {tables.map(({ table, token }) => (
                <div
                  key={table.id}
                  className={`bg-white rounded-xl p-4 border border-zinc-200 ${
                    !table.isActive ? 'opacity-45' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-extrabold text-zinc-900 tracking-[-0.3px]">
                      {table.tableNumber}번
                    </span>
                    <span className="text-[11px] text-zinc-500 flex-1 truncate">{table.name}</span>
                    {!table.isActive && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-bold tracking-[0.2px]">
                        비활성
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mb-3">수용 인원: {table.capacity}명</p>
                  {token ? (
                    <>
                      <div className="flex justify-center mb-3">
                        <div className="inline-block p-3 bg-white rounded-[10px] border border-zinc-200">
                          <QRCodeCanvas
                            value={buildEntryAbsoluteUrl(table.id, token)}
                            size={140}
                          />
                        </div>
                      </div>
                      <a
                        href={buildEntryUrl(table.id, token)}
                        className="block text-center h-11 leading-[44px] rounded-xl bg-brand-500 text-white text-[13px] font-bold tracking-[-0.1px]"
                      >
                        테이블 입장 →
                      </a>
                    </>
                  ) : (
                    <p className="text-[11px] text-zinc-400 italic">QR 토큰 없음</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Store 목록
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-4 py-3 bg-white border-b border-zinc-100 sticky top-0 z-10">
        <p className="mb-0.5 text-[10px] font-semibold text-zinc-500 tracking-[0.2px]">
          🛠 Dev
        </p>
        <h1 className="text-base font-extrabold text-zinc-900 tracking-[-0.3px]">매장 목록</h1>
        <p className="mt-1 text-[11px] text-zinc-500 leading-relaxed">
          매장을 선택하면 해당 매장의 테이블과 QR 코드를 확인할 수 있습니다
        </p>
      </header>

      <div className="flex-1 px-4 py-4">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <div
              className="w-11 h-11 rounded-full border-[3px] border-zinc-100 border-t-brand-500"
              style={{ animation: 'spin 1s linear infinite' }}
            />
          </div>
        )}
        {error && (
          <div className="px-4 py-2.5 bg-red-50 text-[11px] text-red-700 rounded-[10px] mb-3">
            {error}
          </div>
        )}

        {!loading && !error && stores.length === 0 && (
          <p className="text-[11px] text-zinc-500 text-center py-10">등록된 매장이 없습니다</p>
        )}

        {!loading && !error && stores.length > 0 && (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {stores.map((store) => (
              <div
                key={store.id}
                onClick={() => store.isActive && handleSelectStore(store)}
                className={`bg-white rounded-xl p-4 border border-zinc-200 transition-colors ${
                  store.isActive
                    ? 'cursor-pointer active:bg-zinc-50 hover:border-zinc-300'
                    : 'opacity-45'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-extrabold text-zinc-900 tracking-[-0.3px] flex-1 truncate">
                    {store.name}
                  </span>
                  {!store.isActive && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-bold tracking-[0.2px]">
                      비활성
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mb-3">{store.slug}</p>
                {store.isActive && (
                  <span className="text-[11px] text-brand-700 font-bold">
                    클릭하여 테이블 보기 →
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
