import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@web/stores/sessionStore';
import { useCartStore } from '@web/stores/cartStore';
import { useOrderStore } from '@web/stores/orderStore';

const REDIRECT_SECONDS = 10;

export default function PaymentCompletePage() {
  const navigate = useNavigate();
  const clearSession = useSessionStore((s) => s.clearSession);
  const clearCart = useCartStore((s) => s.clearCart);
  const clearOrders = useOrderStore((s) => s.clearOrders);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    clearCart();
    clearOrders();
  }, []);

  const goToStore = () => {
    clearSession();
    navigate('/store', { replace: true });
  };

  useEffect(() => {
    if (countdown <= 0) {
      goToStore();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 text-center gap-2">
      <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center text-2xl mb-2">
        🙏
      </div>
      <h1 className="text-lg font-extrabold text-zinc-900 tracking-[-0.3px]">결제가 완료되었습니다</h1>
      <p className="text-[13px] text-zinc-700">감사합니다 · 안녕히 가십시오</p>
      <p className="text-[11px] text-zinc-500 mt-4">
        {countdown}초 후 처음 화면으로 이동합니다
      </p>
      <button
        onClick={goToStore}
        className="mt-3 px-5 h-11 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-bold tracking-[-0.1px]"
      >
        바로 이동
      </button>
    </div>
  );
}
