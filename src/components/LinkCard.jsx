import React from 'react';
import { useAuth } from '../auth/authContext';

/**
 * Card component to display a single link with permission controls
 */
function LinkCard({ 
    link, 
    departments, 
    linkTypes, 
    isFavorite, 
    onToggleFavorite, 
    onPreview, 
    onLinkClick, 
    onDelete 
}) {
    const { user, canAccessLink, canPreviewLink } = useAuth();
    
    // Kiểm tra quyền truy cập link
    const hasAccess = canAccessLink(link.permissions);
    const canPreview = canPreviewLink(link.permissions);
    return (
        <div className={`link-card ${link.type} ${!hasAccess ? 'restricted' : ''}`}>
            <div className="card-header">
                <span className="link-type">
                    {linkTypes.find(t => t.value === link.type)?.icon} 
                    {linkTypes.find(t => t.value === link.type)?.label}
                </span>
                <div className="header-right">
                    <button
                        className={`btn-favorite ${isFavorite ? 'favorited' : ''}`}
                        onClick={() => onToggleFavorite(link.id)}
                        title={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                    >
                        {isFavorite ? '⭐' : '☆'}
                    </button>
                    <span className="department-badge">
                        {departments.find(d => d.value === link.department)?.label}
                    </span>
                </div>
            </div>
            
            <h3 className="link-title">{link.title}</h3>
            <p className="link-description">{link.description}</p>
            
            {/* Hiển thị trạng thái quyền truy cập */}
            {!hasAccess && (
                <div className="access-restricted">
                    <div className="restricted-icon">🔒</div>
                    <div className="restricted-text">
                        <strong>Không có quyền truy cập</strong>
                        <p>Liên hệ quản trị viên để được cấp quyền</p>
                    </div>
                </div>
            )}
            
            <div className="card-footer">
                <div className="link-info">
                    <small>
                        Thêm vào: {link.created_at 
                            ? new Date(link.created_at).toLocaleDateString('vi-VN') 
                            : 'N/A'}
                    </small>
                </div>
                <div className="card-actions">
                    <button
                        className={`btn-preview ${!canPreview ? 'disabled' : ''}`}
                        onClick={() => canPreview && onPreview(link.url)}
                        title={canPreview ? "Xem trước" : "Không có quyền xem trước"}
                        disabled={!canPreview}
                    >
                        👁️ Xem
                    </button>
                    <a
                        href={hasAccess ? link.url : '#'}
                        target={hasAccess ? "_blank" : "_self"}
                        rel={hasAccess ? "noopener noreferrer" : ""}
                        className={`btn-open ${!hasAccess ? 'disabled' : ''}`}
                        onClick={(e) => {
                            if (hasAccess) {
                                onLinkClick(link.id);
                            } else {
                                e.preventDefault();
                                alert('Bạn không có quyền truy cập link này!');
                            }
                        }}
                        title={hasAccess ? "Mở link" : "Không có quyền truy cập"}
                    >
                        🔗 Mở
                    </a>
                    <button
                        className="btn-delete"
                        onClick={() => onDelete(link.id)}
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LinkCard;

