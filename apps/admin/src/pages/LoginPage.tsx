import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@admin/api/auth.api';
import { useAuthStore } from '@admin/stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      setAuth(result.accessToken, username, result.role, result.storeIds);
      navigate('/dashboard');
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm box-border';

  return (
    <div className="flex justify-center items-center h-screen bg-[#f5f7fa]">
      <div className="bg-white p-10 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] w-90">
        <h1 className="mb-2 text-2xl">QR 오더 어드민</h1>
        <p className="mb-8 text-gray-400">관리자 로그인</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-semibold">아이디</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" className={inputCls} required />
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-sm font-semibold">비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} required />
          </div>
          {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 bg-brand text-white border-none rounded-lg text-base cursor-pointer ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
