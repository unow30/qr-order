import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth.api';
import { useAuthStore } from '../stores/authStore';

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

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f7fa' }}>
      <div style={{ background: '#fff', padding: 40, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', width: 360 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>QR 오더 어드민</h1>
        <p style={{ margin: '0 0 32px', color: '#888' }}>관리자 로그인</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              required
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              required
            />
          </div>
          {error && <p style={{ color: '#e53935', marginBottom: 16, fontSize: 14 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 14, background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
