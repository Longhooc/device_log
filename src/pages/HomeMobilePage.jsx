import React from 'react';
import { Link } from 'react-router-dom';
import './BestlabPage.scss';

function HomeMobilePage() {
    return (
        <div>
            <div style={{ height: '120px', backgroundColor: 'red', display: 'block' }}>SPACER</div>
            <div className="bestlab-page mobile home-page">
                <div className="header bestlab-header">
                <div className="header-content">
                    <div className="header-text">
                        <div className="header-icon">🏠</div>
                        <div className="header-title">
                            <h1>HOME</h1>
                            <p>Bắt đầu nhanh (Mobile)</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="controls">
                <div className="action-buttons">
                    <Link className="btn-primary" to="/smartph">SMARTPH</Link>
                    <Link className="btn-primary" to="/bestlab">BESTLAB</Link>
                    <Link className="btn-primary" to="/link-manager">Quản lý Link</Link>
                    <Link className="btn-secondary" to="/device-management">Thiết bị</Link>
                </div>
                </div>
            </div>
        </div>
    );
}

export default HomeMobilePage;


