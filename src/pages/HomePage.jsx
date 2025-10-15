import React from 'react';
import { Link } from 'react-router-dom';
import './BestlabPage.scss';

function HomePage() {
    return (
        <div className="bestlab-page home-page" style={{ paddingTop: '120px' }}>
            <div className="header bestlab-header">
                <div className="header-content">
                    <div className="header-text">
                        <div className="header-icon">🏠</div>
                        <div className="header-title">
                            <h1>HOME</h1>
                            <p>Điểm bắt đầu nhanh</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="controls">
                <div className="action-buttons">
                    <Link className="btn-primary" to="/smartph">Vào SMARTPH</Link>
                    <Link className="btn-primary" to="/bestlab">Vào BESTLAB</Link>
                    <Link className="btn-primary" to="/link-manager">Quản lý Link</Link>
                    <Link className="btn-secondary" to="/device-management">Quản lý thiết bị</Link>
                </div>
            </div>

            <div className="stats">
                <div className="stat-item">
                    <span className="stat-number">🚀</span>
                    <span className="stat-label">Truy cập nhanh</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">🔗</span>
                    <span className="stat-label">Quản lý link</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">📊</span>
                    <span className="stat-label">Thiết bị</span>
                </div>
            </div>
        </div>
    );
}

export default HomePage;


