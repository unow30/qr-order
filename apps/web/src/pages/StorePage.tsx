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

  const buildEntryUrl = (tableId: string, token: string) => {
    return `/entry?tableId=${tableId}&token=${token}`;
  };

  const buildEntryAbsoluteUrl = (tableId: string, token: string) => {
    return `${window.location.origin}${buildEntryUrl(tableId, token)}`;
  };

  // Store 상세 (테이블 목록)
  if (selectedStore) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 px-6 py-8 font-sans">
        <div className="mb-8">
          <button onClick={handleBack} className="bg-transparent border-none text-sky-400 text-sm font-semibold cursor-pointer p-0 mb-3 block">
            ← 매장 목록
          </button>
          <h1 className="text-2xl font-bold mb-2">🛠 {selectedStore.name}</h1>
          <p className="text-sm text-slate-400 m-0">
            {selectedStore.slug} — 테이블의 QR 코드를 스캔하거나 입장 링크를 클릭하면 고객 진입 화면으로 이동합니다.
          </p>
        </div>

        {tablesLoading && <p className="text-slate-400">불러오는 중...</p>}
        {error && <p className="text-red-400 bg-red-950 px-4 py-3 rounded-lg">{error}</p>}

        {!tablesLoading && !error && tables.length === 0 && (
          <p className="text-slate-400">등록된 테이블이 없습니다.</p>
        )}

        {!tablesLoading && !error && tables.length > 0 && (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {tables.map(({ table, token }) => (
              <div key={table.id} className={`bg-slate-800 rounded-xl p-5 border border-slate-700 ${!table.isActive ? 'opacity-45' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl font-bold">{table.tableNumber}번</span>
                  <span className="text-sm text-slate-400 flex-1">{table.name}</span>
                  {!table.isActive && <span className="text-[11px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">비활성</span>}
                </div>
                <p className="text-[13px] text-slate-500 mb-3">수용 인원: {table.capacity}명</p>
                {token ? (
                  <>
                    <div className="flex justify-center mb-3">
                      <div className="inline-block p-3 bg-white rounded-lg">
                        <QRCodeCanvas value={buildEntryAbsoluteUrl(table.id, token)} size={160} />
                      </div>
                    </div>
                    <a
                      href={buildEntryUrl(table.id, token)}
                      className="block text-center text-sm font-semibold text-sky-400 no-underline px-4 py-2 bg-sky-900 rounded-lg"
                    >
                      QR 입장 링크 →
                    </a>
                  </>
                ) : (
                  <p className="text-[13px] text-slate-500 italic">QR 토큰 없음</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Store 목록
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 px-6 py-8 font-sans">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">🛠 Dev — 매장 목록</h1>
        <p className="text-sm text-slate-400 m-0">매장을 선택하면 해당 매장의 테이블과 QR 코드를 확인할 수 있습니다.</p>
      </div>

      {loading && <p className="text-slate-400">불러오는 중...</p>}
      {error && <p className="text-red-400 bg-red-950 px-4 py-3 rounded-lg">{error}</p>}

      {!loading && !error && stores.length === 0 && (
        <p className="text-slate-400">등록된 매장이 없습니다.</p>
      )}

      {!loading && !error && stores.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {stores.map((store) => (
            <div
              key={store.id}
              className={`bg-slate-800 rounded-xl p-5 border border-slate-700 cursor-pointer transition-[border-color,transform] duration-150 ${!store.isActive ? 'opacity-45' : ''}`}
              onClick={() => store.isActive && handleSelectStore(store)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl font-bold flex-1">{store.name}</span>
                {!store.isActive && <span className="text-[11px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">비활성</span>}
              </div>
              <p className="text-[13px] text-slate-500 mb-3">{store.slug}</p>
              {store.isActive && (
                <span className="text-[13px] text-sky-400 font-medium">클릭하여 테이블 보기 →</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
