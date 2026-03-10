import { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { getTables, generateQrToken, getQrToken } from '../api/table.api';
import { Table } from '@qr-order/shared-types';

export default function QRGeneratePage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [qrData, setQrData] = useState<{ token: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    getTables().then(setTables);
  }, []);

  const handleSelectTable = async (table: Table) => {
    setSelectedTable(table);
    try {
      const existing = await getQrToken(table.id);
      setQrData(existing);
    } catch {
      setQrData(null);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTable) return;
    const token = await generateQrToken(selectedTable.id);
    setQrData(token);
  };

  const getQrUrl = () => {
    if (!selectedTable || !qrData) return '';
    return `${window.location.origin.replace(':3002', ':3001')}/entry?tableId=${selectedTable.id}&token=${qrData.token}`;
  };

  const handleDownload = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-table-${selectedTable?.tableNumber}.png`;
    a.click();
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 24px' }}>QR 코드 생성</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 테이블 선택 */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px' }}>테이블 선택</h3>
          {tables.map((table) => (
            <div
              key={table.id}
              onClick={() => handleSelectTable(table)}
              style={{
                padding: '12px 16px', borderRadius: 8, marginBottom: 8, cursor: 'pointer',
                border: '1px solid', borderColor: selectedTable?.id === table.id ? '#ff6b35' : '#eee',
                background: selectedTable?.id === table.id ? '#fff5f2' : '#fff',
              }}
            >
              <span style={{ fontWeight: 600 }}>{table.tableNumber}번 - {table.name}</span>
            </div>
          ))}
        </div>

        {/* QR 코드 */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 16px' }}>QR 코드</h3>
          {selectedTable ? (
            <>
              {qrData ? (
                <>
                  <div style={{ display: 'inline-block', padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
                    <QRCodeCanvas value={getQrUrl()} size={200} />
                  </div>
                  <p style={{ fontSize: 12, color: '#888', marginTop: 8, wordBreak: 'break-all' }}>{getQrUrl()}</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                    <button onClick={handleDownload} style={{ padding: '8px 16px', background: '#3f51b5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                      다운로드
                    </button>
                    <button onClick={handleGenerate} style={{ padding: '8px 16px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                      재발급
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: 32 }}>
                  <p style={{ color: '#888', marginBottom: 16 }}>QR 코드가 없습니다.</p>
                  <button onClick={handleGenerate} style={{ padding: '10px 20px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                    QR 코드 발급
                  </button>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: '#888', padding: 32 }}>왼쪽에서 테이블을 선택하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
