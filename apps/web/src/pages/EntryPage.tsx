import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createSession, joinSession, moveSession, deleteSessionApi } from '@web/api/session.api';
import { useSessionStore } from '@web/stores/sessionStore';
import { getMyOrders } from '@web/api/order.api';
import type { SessionConflictResponse } from '@qr-order/shared-types';

export default function EntryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const isSessionValid = useSessionStore((s) => s.isSessionValid);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [pinRequired, setPinRequired] = useState(false);
  const [tableInfo, setTableInfo] = useState<SessionConflictResponse | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

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

    if (isSessionValid() && useSessionStore.getState().tableId === tableId) {
      navigate('/menu', { replace: true });
      return;
    }

    if (isSessionValid() && useSessionStore.getState().tableId !== tableId) {
      setMoveTarget({ tableId, qrToken });
      setMoveConfirm(true);
      setLoading(false);
      return;
    }

    const { sessionToken } = useSessionStore.getState();

    if (sessionToken) {
      getMyOrders()
        .then((orders) => {
          if (orders.length > 0) {
            navigate('/order-history', { replace: true });
          } else {
            attemptCreateSession(tableId, qrToken);
          }
        })
        .catch(() => {
          attemptCreateSession(tableId, qrToken);
        });
    } else {
      attemptCreateSession(tableId, qrToken);
    }
  }, []);

  const cleanupSession = async () => {
    try {
      await deleteSessionApi();
    } catch {
      // 이미 만료된 세션이면 무시
    }
    useSessionStore.getState().clearSession();
  };

  const handleMoveConfirm = async () => {
    if (!moveTarget) return;
    setMoving(true);

    try {
      const res = await moveSession({ qrToken: moveTarget.qrToken });
      setSession(res);
      navigate('/menu', { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 409 && data?.requirePin) {
        await cleanupSession();
        setPinRequired(true);
        setTableInfo(data as SessionConflictResponse);
      } else if (data?.code === 'CROSS_STORE_BLOCKED') {
        window.alert(
          data?.message ||
          '다른 매장의 테이블로는 이동할 수 없습니다. 결제 완료 후 새 매장의 QR을 다시 스캔해주세요.',
        );
        navigate('/menu', { replace: true });
      } else {
        await cleanupSession();
        attemptCreateSession(moveTarget.tableId, moveTarget.qrToken);
      }
    } finally {
      setMoving(false);
      setMoveConfirm(false);
    }
  };

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

        if (status === 409 && data?.requirePin) {
          setPinRequired(true);
          setTableInfo(data as SessionConflictResponse);
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

  // 자리이동 확인
  if (moveConfirm && moveTarget) {
    const currentTable = useSessionStore.getState();
    return (
      <div className="flex flex-col justify-center h-screen gap-7 px-6">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-12 h-12 rounded-[10px] bg-blue-50 flex items-center justify-center text-xl">
            🔄
          </div>
          <h2 className="text-[17px] font-extrabold text-zinc-900 tracking-[-0.3px] text-center">
            자리를 이동하시겠습니까?
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed text-center">
            현재 <b className="text-zinc-800">{currentTable.tableName || `${currentTable.tableNumber}번 테이블`}</b>에 착석 중입니다
            <br />
            새 테이블로 이동 시 장바구니가 함께 이동돼요
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleMoveCancel}
            className="flex-1 h-11 rounded-xl bg-zinc-100 text-zinc-800 font-bold text-[13px] tracking-[-0.1px]"
          >
            취소
          </button>
          <button
            onClick={handleMoveConfirm}
            disabled={moving}
            className="flex-1 h-11 rounded-xl bg-zinc-900 text-white font-bold text-[13px] tracking-[-0.1px] disabled:opacity-50"
          >
            {moving ? '이동 중...' : '이동하기'}
          </button>
        </div>
      </div>
    );
  }

  // 로딩
  if (loading && !error && !pinRequired) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-5 px-6">
        <div
          className="w-11 h-11 rounded-full border-[3px] border-zinc-100 border-t-brand-500"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-bold text-zinc-800">세션을 초기화 중입니다</p>
          <p className="text-[11px] text-zinc-500">잠시만 기다려 주세요</p>
        </div>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-3 px-6 text-center">
        <div className="w-12 h-12 rounded-[10px] bg-red-50 flex items-center justify-center text-xl">⚠️</div>
        <p className="text-[15px] font-bold text-zinc-900">{error}</p>
        <p className="text-xs text-zinc-500">QR 코드를 다시 스캔해 주세요</p>
      </div>
    );
  }

  // PIN 입력
  if (pinRequired && tableInfo) {
    return (
      <div className="flex flex-col justify-center h-screen gap-6 px-6">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-12 h-12 rounded-[10px] bg-brand-50 flex items-center justify-center text-xl">
            🔒
          </div>
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-lg font-extrabold text-zinc-900 tracking-[-0.4px]">
              {tableInfo.tableName || `${tableInfo.tableNumber}번 테이블`}
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed text-center">
              이미 사용 중인 테이블입니다
              <br />
              PIN 번호를 입력하여 참여하세요
            </p>
          </div>
        </div>

        <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
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
            placeholder="• • • • • •"
            className="w-full h-14 text-center text-2xl font-extrabold tracking-[0.5em] border-2 border-zinc-200 rounded-[10px] focus:border-zinc-900 focus:outline-none bg-white"
            autoFocus
          />
          {pinError && <p className="text-red-600 text-xs text-center">{pinError}</p>}
          <button
            type="submit"
            disabled={joining || pin.length !== 6}
            className="w-full h-[52px] rounded-xl bg-zinc-900 text-white font-bold text-sm tracking-[-0.1px] disabled:opacity-50"
          >
            {joining ? '참여 중...' : '테이블 참여하기'}
          </button>
        </form>
      </div>
    );
  }

  return null;
}
