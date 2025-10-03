import React from 'react';

/**
 * Render text line with clickable URLs and permission checks
 */
export const renderLineWithLinks = (line, onPreview, linksWithPermissions = [], canAccessLink = () => true, canPreviewLink = () => true) => {
    if (!line || typeof line !== 'string') return <span></span>;
    
    const urlRegex = /(https?:\/\/[\w\-._~:\/?#[\]@!$&'()*+,;=%]+)/g;
    
    return line.split(urlRegex).map((part, i) => {
        if (urlRegex.test(part)) {
            // Tìm link tương ứng trong danh sách
            // ✅ SECURITY FIX: Check URL null trước khi gọi .includes()
            const matchingLink = linksWithPermissions.find(link => 
                link.url === part || 
                (link.url && link.url.includes(part)) || 
                (link.url && part.includes(link.url))
            );
            
            // Kiểm tra quyền truy cập
            const hasAccess = matchingLink ? canAccessLink(matchingLink.permissions) : true;
            const canPreview = matchingLink ? canPreviewLink(matchingLink.permissions) : true;
            
            // Nếu không có quyền, hiển thị ổ khóa thay vì URL
            if (!hasAccess) {
                return (
                    <span key={i} className="url-locked">
                        <span 
                            className="locked-url"
                            onClick={(e) => {
                                e.preventDefault();
                                alert('Bạn không có quyền truy cập link này!');
                            }}
                            title="Link bị khóa - Không có quyền truy cập"
                            style={{
                                color: '#e74c3c',
                                cursor: 'not-allowed',
                                padding: '2px 8px',
                                background: '#ffe6e6',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                userSelect: 'none'
                            }}
                        >
                            🔒 [Link bị khóa]
                        </span>
                        <span className="access-denied-text" style={{color: '#e74c3c', fontSize: '12px', marginLeft: '5px'}}>
                            (Không có quyền truy cập)
                        </span>
                    </span>
                );
            }
            
            // Nếu có quyền, hiển thị link bình thường
            return (
                <span key={i} className="url-with-preview">
                    <a 
                        href={part} 
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Mở link"
                        style={{ 
                            color: '#3498db',
                            textDecoration: 'underline'
                        }}
                    >
                        {part}
                    </a>
                    {onPreview && canPreview && (
                        <button
                            className="btn-preview-inline"
                            onClick={() => onPreview(part)}
                            title="Xem trước"
                        >
                            👁️
                        </button>
                    )}
                </span>
            );
        } else {
            return <span key={i}>{part}</span>;
        }
    });
};

/**
 * Truncate content to max words
 */
export const truncateContent = (content, maxWords = 100) => {
    if (!content) return '';
    
    // Remove special characters and newlines
    const cleanContent = content.replace(/[\r\n\t]+/g, ' ').trim();
    
    // Split into words
    const words = cleanContent.split(/\s+/);
    
    // If less than or equal maxWords, keep as is
    if (words.length <= maxWords) return cleanContent;
    
    // Truncate and add ellipsis
    return words.slice(0, maxWords).join(' ') + '...';
};

/**
 * Parse Gemini error to friendly message
 */
export const getFriendlyGeminiError = (error) => {
    const raw = (error?.message || '').toLowerCase();
    
    if (raw.includes('quota') || raw.includes('429')) {
        return 'Đã vượt quá hạn mức sử dụng API (quota exceeded). Vui lòng thử lại sau hoặc nâng hạn mức.';
    }
    if (raw.includes('api key') || raw.includes('unauthorized') || raw.includes('permission')) {
        return 'API key không hợp lệ hoặc thiếu quyền. Kiểm tra REACT_APP_GEMINI_API_KEY và quyền truy cập.';
    }
    if (raw.includes('billing') || raw.includes('payment')) {
        return 'Tài khoản chưa bật thanh toán/billing cho Gemini API. Vui lòng kích hoạt billing.';
    }
    if (raw.includes('network') || raw.includes('failed to fetch') || raw.includes('timeout')) {
        return 'Sự cố kết nối mạng tới Gemini. Kiểm tra internet hoặc thử lại sau.';
    }
    
    return 'Có lỗi khi gọi Gemini AI. Vui lòng thử lại sau.';
};

/**
 * Convert URL to embed format
 */
export const convertToEmbedUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    
    // Google Docs
    if (url.includes('docs.google.com/document')) {
        return url.replace(/\/edit.*/, '/preview');
    }
    
    // Google Sheets
    if (url.includes('docs.google.com/spreadsheets')) {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
            return `https://docs.google.com/spreadsheets/d/${match[1]}/preview`;
        }
    }
    
    // Google Forms
    if (url.includes('docs.google.com/forms')) {
        return url.replace(/\/edit.*/, '/viewform?embedded=true');
    }
    
    // Google Slides
    if (url.includes('docs.google.com/presentation')) {
        return url.replace(/\/edit.*/, '/preview');
    }
    
    // Google Drive file
    if (url.includes('drive.google.com/file')) {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
            return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
    }
    
    return url;
};

