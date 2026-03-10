import { useEffect, useState } from 'react';

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

export default function DevPage() {
  const [tables, setTables] = useState<TableWithToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tables/dev/with-tokens')
      .then((res) => res.json())
      .then((data) => {
        setTables(data?.data ?? data);
        setLoading(false);
      })
      .catch(() => {
        setError('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.');
        setLoading(false);
      });
  }, []);

  const buildEntryUrl = (tableId: string, token: string) => {
    return `/entry?tableId=${tableId}&token=${token}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🛠 Dev — QR 토큰 목록</h1>
        <p style={styles.subtitle}>각 테이블의 QR 링크를 클릭하면 고객 진입 화면으로 이동합니다.</p>
      </div>

      {loading && <p style={styles.status}>불러오는 중...</p>}
      {error && <p style={styles.error}>{error}</p>}

      {!loading && !error && (
        <div style={styles.grid}>
          {tables.map(({ table, token }) => (
            <div key={table.id} style={{ ...styles.card, opacity: table.isActive ? 1 : 0.45 }}>
              <div style={styles.cardHeader}>
                <span style={styles.tableNumber}>{table.tableNumber}번</span>
                <span style={styles.tableName}>{table.name}</span>
                {!table.isActive && <span style={styles.badge}>비활성</span>}
              </div>
              <p style={styles.capacity}>수용 인원: {table.capacity}명</p>
              {token ? (
                <>
                  <p style={styles.tokenText}>
                    <span style={styles.tokenLabel}>Token</span>
                    <code style={styles.tokenCode}>{token.slice(0, 18)}…</code>
                  </p>
                  <a href={buildEntryUrl(table.id, token)} style={styles.link}>
                    QR 입장 링크 →
                  </a>
                </>
              ) : (
                <p style={styles.noToken}>QR 토큰 없음</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    padding: '32px 24px',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  status: {
    color: '#94a3b8',
  },
  error: {
    color: '#f87171',
    backgroundColor: '#450a0a',
    padding: '12px 16px',
    borderRadius: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #334155',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  tableNumber: {
    fontSize: '20px',
    fontWeight: 700,
  },
  tableName: {
    fontSize: '14px',
    color: '#94a3b8',
    flex: 1,
  },
  badge: {
    fontSize: '11px',
    backgroundColor: '#374151',
    color: '#9ca3af',
    padding: '2px 8px',
    borderRadius: '9999px',
  },
  capacity: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 12px',
  },
  tokenText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 0 12px',
  },
  tokenLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  tokenCode: {
    fontSize: '12px',
    color: '#7dd3fc',
    backgroundColor: '#0f172a',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  link: {
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#38bdf8',
    textDecoration: 'none',
    padding: '8px 16px',
    backgroundColor: '#0c4a6e',
    borderRadius: '8px',
    transition: 'background-color 0.15s',
  },
  noToken: {
    fontSize: '13px',
    color: '#64748b',
    fontStyle: 'italic',
  },
};
