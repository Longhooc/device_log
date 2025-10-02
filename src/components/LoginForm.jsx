import React, { useState } from 'react';
import { useAuth } from '../auth/authContext';
import './LoginForm.scss';

function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await login(username, password);
            if (!result.success) {
                setError(result.message);
            }
        } catch (error) {
            setError('Lỗi đăng nhập');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <div className="login-header">
                    <h2>🔐 Đăng Nhập Hệ Thống</h2>
                    <p>Vui lòng đăng nhập để truy cập hệ thống quản lý link</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Tên đăng nhập:</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Nhập tên đăng nhập"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Mật khẩu:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            ❌ {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
                    </button>
                </form>

                <div className="demo-accounts">
                    <h4>🔑 Tài khoản demo:</h4>
                    <div className="demo-account">
                        <strong>Admin:</strong> admin / password
                    </div>
                    <div className="demo-account">
                        <strong>Ban Giám Đốc:</strong> director / password
                    </div>
                    <div className="demo-account">
                        <strong>Quản Lý:</strong> manager / password
                    </div>
                    <div className="demo-account">
                        <strong>Nhân Viên:</strong> employee / password
                    </div>
                    <div className="demo-note">
                        <small>💡 Mật khẩu mặc định: admin123, director123, manager123, employee123</small>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginForm;
