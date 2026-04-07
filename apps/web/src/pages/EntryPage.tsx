import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createSession, joinSession, moveSession, deleteSessionApi } from '@web/api/session.api';
import { useSessionStore } from '@web/stores/sessionStore';
import type { SessionConflictResponse } from '@qr-order/shared-types';

export default function EntryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const isSessionValid = useSessionStore((s) => s.isSessionValid);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // PIN 입력 상태
  const [pinRequired, setPinRequired] = useState(false);
  const [tableInfo, setTableInfo] = useState<SessionConflictResponse | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // 자리이동 확인 상태
  const [moveConfirm, setMoveConfirm] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ tableId: string; qrToken: string } | null>(null);
  const [moving, setMoving] = useState(false);

  const tableIdRef = useRef<string>('');
  const qrTokenRef = useRef<string>('');

  useEffect(() => {
    const tableId = searchParams.get('tableId');
    const qrToken = searchParams.get('token');

    if (!tableId || !qrToken) {
      setError('유효하지 않은 QR 코드입니다.');
      setLoading(false);
      return;
    }

    tableIdRef.current = tableId;
    qrTokenRef.current = qrToken;

    // 이미 유효한 세션이 있고 같은 테이블이면 메뉴로 이동
    if (isSessionValid() && useSessionStore.getState().tableId === tableId) {
      navigate('/menu', { replace: true });
      return;
    }

    // 유효한 세션이 있고 다른 테이블 → 자리이동 확인 요청
    if (isSessionValid() && useSessionStore.getState().tableId !== tableId) {
      setMoveTarget({ tableId, qrToken });
      setMoveConfirm(true);
      setLoading(false);
      return;
    }

    // 세션 없음 → 새 세션 생성
    attemptCreateSession(tableId, qrToken);
  }, []);

  /** 서버 세션 삭제 후 로컬 세션 정리 */
  const cleanupSession = async () => {
    try {
      await deleteSessionApi();
    } catch {
      // 이미 만료된 세션이면 무시
    }
    useSessionStore.getState().clearSession();
  };

  /** 자리이동 실행 */
  const handleMoveConfirm = async () => {
    if (!moveTarget) return;
    setMoving(true);

    try {
      const res = await moveSession({ qrToken: moveTarget.qrToken });
      setSession({
        sessionToken: res.sessionToken,
        tableId: res.tableId,
        tableNumber: res.tableNumber,
        tableName: res.tableName,
        storeId: res.storeId,
        storeName: res.storeName,
        expiresAt: res.expiresAt,
        pin: res.pin,
      });
      navigate('/menu', { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      const messagePayload = data?.message;
      const errorCode =
        typeof messagePayload === 'object' ? messagePayload?.code : undefined;

      if (status === 409 && messagePayload?.requirePin) {
        // 이동 대상 테이블에 이미 세션 존재 → 기존 세션 정리 후 PIN 입력
        await cleanupSession();
        setPinRequired(true);
        setTableInfo(messagePayload as SessionConflictResponse);
        setMoveConfirm(false);
      } else if (errorCode === 'CROSS_STORE_BLOCKED') {
        const text =
          (typeof messagePayload === 'object' && messagePayload?.message) ||
          '다른 매장의 테이블로는 이동할 수 없습니다. 결제 완료 후 새 매장의 QR을 다시 스캔해주세요.';
        if (typeof window !== 'undefined') window.alert(text);
        setMoveConfirm(false);
        navigate('/menu', { replace: true });
      } else {
        // 기타 오류 → 기존 세션 정리 후 새 세션 생성
        await cleanupSession();
        setMoveConfirm(false);
        attemptCreateSession(moveTarget.tableId, moveTarget.qrToken);
      }
    } finally {
      setMoving(false);
    }
  };

  /** 자리이동 취소 → 기존 테이블로 복귀 */
  const handleMoveCancel = () => {
    setMoveConfirm(false);
    navigate('/menu', { replace: true });
  };

  const attemptCreateSession = (tableId: string, qrToken: string) => {
    createSession({ tableId, qrToken })
      .then((session) => {
        setSession(session);
        navigate('/menu', { replace: true });
      })
      .catch((err) => {
        const status = err.response?.status;
        const data = err.response?.data;

        if (status === 409 && data?.message?.requirePin) {
          setPinRequired(true);
          setTableInfo(data.message as SessionConflictResponse);
          setLoading(false);
        } else {
          setError('QR 코드가 만료되었거나 유효하지 않습니다. 다시 스캔해 주세요.');
          setLoading(false);
        }
      });
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setPinError('6자리 PIN 번호를 입력해 주세요.');
      return;
    }

    setJoining(true);
    setPinError(null);

    try {
      const session = await joinSession({
        tableId: tableIdRef.current,
        qrToken: qrTokenRef.current,
        pin,
      });
      setSession(session);
      navigate('/menu', { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        setPinError('PIN 번호가 일치하지 않습니다.');
      } else if (status === 400) {
        setPinError(err.response?.data?.message || '세션 참여에 실패했습니다.');
      } else {
        setPinError('오류가 발생했습니다. 다시 시도해 주세요.');
      }
      setJoining(false);
    }
  };

  // 자리이동 확인 다이얼로그
  if (moveConfirm && moveTarget) {
    const currentTable = useSessionStore.getState();
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-6 px-6">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">자리를 이동하시겠습니까?</h2>
          <p className="text-gray-600 mb-1">
            현재 <strong>{currentTable.tableName || `${currentTable.tableNumber}번 테이블`}</strong>에 착석 중입니다.
          </p>
          <p className="text-gray-600">
            새 테이블로 이동하면 기존 장바구니가 함께 이동됩니다.
          </p>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={handleMoveCancel}
            className="flex-1 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-600 bg-white"
          >
            취소
          </button>
          <button
            onClick={handleMoveConfirm}
            disabled={moving}
            className="flex-1 py-3 bg-[#ff6b35] text-white rounded-lg font-medium disabled:opacity-50"
          >
            {moving ? '이동 중...' : '이동하기'}
          </button>
        </div>
      </div>
    );
  }

  if (loading && !error && !pinRequired) {
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

  if (pinRequired && tableInfo) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-6 px-6">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">
            {tableInfo.tableName || `${tableInfo.tableNumber}번 테이블`}
          </h2>
          <p className="text-gray-600">
            이미 사용 중인 테이블입니다.
          </p>
          <p className="text-gray-600">
            테이블 PIN 번호를 입력하여 참여하세요.
          </p>
        </div>

        <form onSubmit={handlePinSubmit} className="w-full max-w-xs flex flex-col gap-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              setPin(v);
              setPinError(null);
            }}
            placeholder="6자리 PIN 입력"
            className="w-full text-center text-2xl tracking-[0.5em] border-2 border-gray-300 rounded-lg py-3 px-4 focus:border-[#ff6b35] focus:outline-none"
            autoFocus
          />
          {pinError && (
            <p className="text-red-500 text-sm text-center">{pinError}</p>
          )}
          <button
            type="submit"
            disabled={joining || pin.length !== 6}
            className="w-full bg-[#ff6b35] text-white py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {joining ? '참여 중...' : '테이블 참여'}
          </button>
        </form>
      </div>
    );
  }

  return null;
}
