import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createSession } from '@web/api/session.api';
import { useSessionStore } from '@web/stores/sessionStore';

export default function EntryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const isSessionValid = useSessionStore((s) => s.isSessionValid);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tableId = searchParams.get('tableId');
    const qrToken = searchParams.get('token');

    if (!tableId || !qrToken) {
      setError('유효하지 않은 QR 코드입니다.');
      setLoading(false);
      return;
    }

    // 이미 유효한 세션이 있고 같은 테이블이면 메뉴로 이동
    if (isSessionValid() && useSessionStore.getState().tableId === tableId) {
      navigate('/menu', { replace: true });
      return;
    }

    createSession({ tableId, qrToken })
      .then((session) => {
        setSession(session);
        navigate('/menu', { replace: true });
      })
      .catch(() => {
        setError('QR 코드가 만료되었거나 유효하지 않습니다. 다시 스캔해 주세요.');
        setLoading(false);
      });
  }, []);

  if (loading && !error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>세션을 초기화하는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <p className="text-red-500">{error}</p>
        <p>QR 코드를 다시 스캔해 주세요.</p>
      </div>
    );
  }

  return null;
}
