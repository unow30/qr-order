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
    clearSession();
    clearCart();
    clearOrders();
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/store', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans px-6 text-center">
      <div className="text-6xl mb-6">🙏</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-3">감사합니다</h1>
      <p className="text-lg text-gray-600 mb-1">안녕히 가십시오</p>
      <p className="text-sm text-gray-400 mt-6">
        {countdown}초 후 처음 화면으로 이동합니다
      </p>
      <button
        onClick={() => navigate('/store', { replace: true })}
        className="mt-4 px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 cursor-pointer bg-transparent"
      >
        바로 이동
      </button>
    </div>
  );
}
