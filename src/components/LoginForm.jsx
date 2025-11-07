import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/authContext';
import './LoginForm.scss';
import axios from 'axios';

const LoginForm = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const messageTimeoutRef = useRef(null);
    
    // Khôi phục message từ sessionStorage nếu có (khi component bị unmount/remount)
    useEffect(() => {
        const savedMessage = sessionStorage.getItem('loginMessage');
        if (savedMessage) {
            try {
                const parsed = JSON.parse(savedMessage);
                if (parsed.text && parsed.text.trim()) {
                    setMessage(parsed);
                    // Set timeout để xóa message sau khi hiển thị
                    const timeout = parsed.type === 'success' ? 3000 : 5000;
                    messageTimeoutRef.current = setTimeout(() => {
                        setMessage({ type: '', text: '' });
                        sessionStorage.removeItem('loginMessage');
                        messageTimeoutRef.current = null;
                    }, timeout);
                } else {
                    sessionStorage.removeItem('loginMessage');
                }
            } catch (e) {
                sessionStorage.removeItem('loginMessage');
            }
        }
    }, []);

    // Clear message after delay
    const showMessage = (type, text) => {
        console.log('Showing message:', type, text);
        
        // Clear previous timeout
        if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
        }
        
        const messageData = { type, text };
        setMessage(messageData);
        
        // Lưu vào sessionStorage để khôi phục nếu component bị unmount
        sessionStorage.setItem('loginMessage', JSON.stringify(messageData));
        
        // Clear message after delay
        const timeout = type === 'success' ? 3000 : 5000;
        messageTimeoutRef.current = setTimeout(() => {
            setMessage(prev => {
                // Only clear if it's still the same message
                if (prev.text === text) {
                    sessionStorage.removeItem('loginMessage');
                    return { type: '', text: '' };
                }
                return prev;
            });
            messageTimeoutRef.current = null;
        }, timeout);
    };
    
    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
            }
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate input
        if (!username.trim() || !password.trim()) {
            showMessage('error', 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
            return;
        }

        setIsLoading(true);
        // Don't clear message immediately, let it show during loading

        try {
            console.log('Attempting login...');
            const result = await login(username.trim(), password);
            console.log('Login result:', result);
            
            if (result && result.success) {
                // showMessage('success', 'Đăng nhập thành công! Đang chuyển hướng...');
                // ProtectedRoute will automatically redirect after user is set
            } else {
                // Handle different error cases
                const errorMsg = result?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
                console.log('Login failed:', errorMsg);
                showMessage('error', errorMsg);
            }
        } catch (error) {
            console.error('Login error caught:', error);
            
            let errorMessage = 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
            
            // Check for specific error messages from authApi
            if (error.message === 'TIMEOUT') {
                errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.';
            } else if (error.message === 'NETWORK_ERROR') {
                errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.';
            } else if (error.message === 'SERVER_ERROR') {
                errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
            } else if (axios.isAxiosError(error)) {
                // Check for network/server connection errors
                if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                    errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.';
                } else if (error.code === 'ERR_NETWORK' || !error.response) {
                    errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng và thử lại.';
                } else if (error.response?.status === 401) {
                    errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
                } else if (error.response?.status >= 500) {
                    errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
                } else {
                    errorMessage = error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
                }
            }
            
            console.log('Setting error message:', errorMessage);
            showMessage('error', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <div className="login-header">
                    <h2>Đăng nhập</h2>
                    <p>Vui lòng nhập thông tin đăng nhập của bạn</p>
                </div>

                {message.text && message.text.trim() && (
                    <div 
                        className={`message ${message.type === 'success' ? 'success-message' : 'error-message'}`}
                        role="alert"
                        aria-live="polite"
                    >
                        <span>{message.text}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Tên đăng nhập</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Nhập tên đăng nhập"
                            disabled={isLoading}
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Mật khẩu</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            disabled={isLoading}
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;

