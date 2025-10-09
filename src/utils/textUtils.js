import React from 'react';

/**
 * Render text line with clickable URLs and permission checks
 */
export const renderLineWithLinks = (line, onPreview, linksWithPermissions = [], canAccessLink = () => true, canPreviewLink = () => true) => {
    if (!line || typeof line !== 'string') return <span></span>;
    
    const urlRegex = /(https?:\/\/[\w\-._~:\/?#[\]@!$&'()*+,;=%]+)/g;
    
    // Process the line to add highlighting for headers and [Locked]
    const processedLine = line
        // Highlight headers like **#1 - TITLE (Độ khớp: XX%)** (Deep Search)
        .replace(/\*\*#(\d+) - ([^*]+) \(Độ khớp: (\d+)%\)\*\*/g, 
            '<strong style="color: #2c3e50; background: linear-gradient(90deg, #e8f4fd, #f0f8ff); padding: 4px 8px; border-radius: 4px; border-left: 4px solid #3498db;">#$1 - $2 <span style="color: #e74c3c; font-weight: bold;">(Độ khớp: $3%)</span></strong>')
        // Highlight simple headers like "1. TITLE" (Quick Ask)
        .replace(/^(\d+)\.\s+"([^"]+)"/gm, 
            '<div style="color: #2c3e50; background: linear-gradient(90deg, #e8f4fd, #f0f8ff); padding: 4px 8px; border-radius: 4px; border-left: 4px solid #3498db; margin: 8px 0; font-weight: bold;">$1. "$2"</div>')
        // Highlight [Locked] text in response
        .replace(/\[Locked\]/g, '<span style="color: #e74c3c; background: #ffe6e6; padding: 2px 6px; border-radius: 3px; font-weight: bold; border: 1px solid #f5c6cb;">🔒</span>')
        // Highlight other important markers
        .replace(/📌 Nội dung khớp:/g, '<span style="color: #27ae60; font-weight: bold;">📌 Nội dung khớp:</span>')
        .replace(/🔗 URL:/g, '<span style="color: #3498db; font-weight: bold;">🔗 URL:</span>')
        .replace(/📊 TỔNG KẾT:/g, '<span style="color: #8e44ad; font-weight: bold; background: #f4f0f7; padding: 4px 8px; border-radius: 4px;">📊 TỔNG KẾT:</span>')
        // Highlight Quick Ask specific markers
        .replace(/Phòng ban:/g, '<span style="color: #8e44ad; font-weight: bold;">Phòng ban:</span>')
        .replace(/Loại:/g, '<span style="color: #e67e22; font-weight: bold;">Loại:</span>')
        .replace(/Mô tả:/g, '<span style="color: #27ae60; font-weight: bold;">Mô tả:</span>')
        .replace(/URL:/g, '<span style="color: #3498db; font-weight: bold;">URL:</span>');
    
    return processedLine.split(urlRegex).map((part, i) => {
        if (urlRegex.test(part)) {
            // Tìm link tương ứng trong danh sách
            // ✅ SECURITY FIX: Check URL null trước khi gọi .includes()
            const matchingLink = linksWithPermissions.find(link => 
                link.url === part || 
                (link.url && link.url.includes(part)) || 
                (link.url && part.includes(link.url))
            );
            
            // Kiểm tra quyền truy cập
            // Tạo permissions object với has_user_access từ link object
            const linkPermissions = matchingLink ? {
                ...matchingLink.permissions,
                has_user_access: matchingLink.has_user_access
            } : null;
            
            const hasAccess = matchingLink ? canAccessLink(linkPermissions) : true;
            const canPreview = matchingLink ? canPreviewLink(linkPermissions) : true;
            
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
                            title="Link bị khóa"
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
                            (Locked)
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
            // Check if part contains HTML tags (from our highlighting)
            if (part.includes('<')) {
                return <span key={i} dangerouslySetInnerHTML={{__html: part}} />;
            }
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

