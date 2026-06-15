import React, { useState, useEffect, useRef } from 'react';
import './AICustomerSupport.scss';
import { validateGoogleDocsUrl, getDocumentTypeFromUrl, formatUrl } from '../api/aiCustomerSupportApi';
import { scrapeGoogleDocContent } from '../utils/contentScraper';
import { askCustomerSupport } from '../api/geminiApi';
import { useIsMobile } from '../hooks/useIsMobile';

const AICustomerSupport = () => {
    // State management
    const [documentUrl, setDocumentUrl] = useState('https://docs.google.com/document/d/1DOcPaJclGEsDiVJtszw2cN0ykgtMyVOLBkoJ-DvLtvQ/edit?usp=sharing');
    const [documentData, setDocumentData] = useState(null);
    const [isReading, setIsReading] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [showKnowledge, setShowKnowledge] = useState(false);

    // Refs
    const chatContainerRef = useRef(null);
    const textareaRef = useRef(null);

    // Responsive mode
    const isMobile = useIsMobile(768);

    // Auto scroll to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    // Auto load document on mount
    useEffect(() => {
        if (documentUrl && !documentData) {
            handleReadGoogleDoc();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentUrl]);

    // Auto resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
        }
    }, [currentQuestion]);

    /**
     * Đọc Google Docs
     */
    const handleReadGoogleDoc = async () => {
        if (!documentUrl.trim()) {
            alert('Vui lòng nhập URL Google Docs');
            return;
        }
        if (!validateGoogleDocsUrl(documentUrl)) {
            alert('URL không hợp lệ. Vui lòng nhập URL Google Docs/Sheets/Slides/Forms');
            return;
        }

        setIsReading(true);
        try {
            const content = await scrapeGoogleDocContent(documentUrl);
            if (content && content.length > 0) {
                const docInfo = {
                    title: getDocumentTypeFromUrl(documentUrl) + ' Document',
                    documentType: getDocumentTypeFromUrl(documentUrl)
                };
                const payload = {
                    documentUrl,
                    documentInfo: docInfo,
                    content: content,
                    contentLength: content.length,
                    readAt: new Date().toISOString()
                };
                setDocumentData(payload);
            } else {
                alert('Không thể cào nội dung. Có thể tài liệu chưa public hoặc bị CORS.');
            }
        } catch (error) {
            alert(`Lỗi khi cào nội dung: ${error.message}`);
        } finally {
            setIsReading(false);
        }
    };

    /**
     * Xử lý câu hỏi khách hàng với AI
     */
    const handleAskQuestion = async () => {
        if (!currentQuestion.trim()) return;
        if (!documentData) {
            alert('Vui lòng đọc Google Docs trước');
            return;
        }

        setIsProcessing(true);

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: currentQuestion,
            timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, userMessage]);
        setCurrentQuestion('');

        try {
            const compactContent = (documentData.content || '')
                .replace(/(\s)\1{2,}/g, '$1')
                .replace(/([-=_])\1{4,}/g, '$1$1$1')
                .slice(0, 600000);

            const recentHistory = chatHistory
                .filter(msg => msg.type === 'user' || msg.type === 'ai')
                .slice(-10)
                .map(msg => {
                    if (msg.type === 'user') return `Khách hàng: ${msg.content}`;
                    if (msg.type === 'ai') return `Chuyên viên: ${msg.content}`;
                    return '';
                })
                .filter(msg => msg.trim())
                .join('\n');

            const isFollowUp = chatHistory.filter(m => m.type === 'user' || m.type === 'ai').length > 0;
            const contextPrompt = `
Bạn là CHUYÊN VIÊN HỖ TRỢ KHÁCH HÀNG của doanh nghiệp. Hãy trả lời CHÍNH XÁC, NGẮN GỌN, THÂN THIỆN. Tham khảo bối cảnh của công ty. Không được nói gì về Tài liệu mà mình được đính kèm.
YÊU CẦU TRẢ LỜI:
- Nếu câu hỏi không có căn cứ rõ trong NỘI DUNG TÀI LIỆU DOANH NGHIỆP, hãy trả lời: "Hiện tôi chưa rõ ý bạn hoặc chưa có đủ thông tin để trả lời chính xác." và đề nghị khách hàng cung cấp thêm chi tiết hoặc hướng dẫn liên hệ bộ phận/phòng ban phù hợp.
- Tham khảo nội dung tài liệu và thông tin cung cấp; nếu có, đưa ra các bước tiếp theo ngắn gọn.
- Trình bày rõ ràng, gạch đầu dòng khi phù hợp, tiếng Việt.
- Tham khảo lịch sử cuộc trò chuyện để hiểu ngữ cảnh và trả lời phù hợp.
- QUY TẮC CHÀO HỎI: ${isFollowUp ? 'Đây là lượt hội thoại TIẾP THEO trong cùng cuộc trò chuyện. TUYỆT ĐỐI KHÔNG chào hỏi lại từ đầu (như "Chào bạn", "Xin chào", "Rất vui được hỗ trợ",...), KHÔNG tự giới thiệu lại tên công ty. Hãy đi thẳng vào giải đáp câu hỏi một cách tự nhiên và liên tục như đang trong một cuộc hội thoại.' : 'Đây là câu hỏi ĐẦU TIÊN, có thể chào hỏi ngắn gọn và tự nhiên.'}
- QUY TẮC KHEN NGỢI: Chỉ khen ngợi khách hàng khi thực sự phù hợp với ngữ cảnh. Nếu có khen, hãy thay đổi câu chữ linh hoạt, tự nhiên, tinh tế — tránh lặp lại cùng một kiểu khen ở mọi câu trả lời. Không cần ép buộc chèn lời khen vào mỗi tin nhắn.

LỊCH SỬ CUỘC TRÒ CHUYỆN:
${recentHistory || 'Đây là câu hỏi đầu tiên trong cuộc trò chuyện.'}

CÂU HỎI HIỆN TẠI CỦA KHÁCH HÀNG:
"${userMessage.content}"

NỘI DUNG TÀI LIỆU DOANH NGHIỆP :
${compactContent}

`;

            // Lọc response
            const sanitizeAiResponse = (text) => {
                if (!text) return '';
                const lines = text.split(/\r?\n/);
                const docKeywords = /(tài liệu|document|google\s*docs|nội dung\s*tài\s*liệu|văn\s*bản|tư\s*liệu)/i;
                const stripMd = (s) => s.replace(/\*\*|__/g, '').replace(/`/g, '');
                const filtered = lines.filter(line => {
                    const l = stripMd(line || '').trim();
                    if (!l) return false;
                    if (docKeywords.test(l)) return false;
                    return true;
                });
                return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
            };

            // Thinking message
            const thinkingId = Date.now() + 1;
            setChatHistory(prev => [...prev, {
                id: thinkingId,
                type: 'ai',
                content: '🤔 AI Thinking...',
                timestamp: new Date(),
                isThinking: true
            }]);

            const thinkingMessages = [
                '🤔 AI Thinking...',
                '🔍 📚 Finding in knowledge...',
                '💭 Processing question...',
                '🧠 AI is learning...',
                '⚡ Summarizing information...',
                '🎯 Preparing answer...'
            ];
            let thinkingIndex = 0;
            const thinkingInterval = setInterval(() => {
                thinkingIndex = (thinkingIndex + 1) % thinkingMessages.length;
                setChatHistory(prev => prev.map(m =>
                    m.id === thinkingId ? { ...m, content: thinkingMessages[thinkingIndex] } : m
                ));
            }, 1500);

            const fullTextRaw = await askCustomerSupport(contextPrompt);
            clearInterval(thinkingInterval);
            setChatHistory(prev => prev.filter(m => m.id !== thinkingId));

            const fullText = sanitizeAiResponse(fullTextRaw || '');
            const aiId = Date.now() + 2;
            setChatHistory(prev => [...prev, {
                id: aiId,
                type: 'ai',
                content: '',
                timestamp: new Date(),
            }]);

            // Typewriter effect
            let i = 0;
            const step = () => {
                i = Math.min(i + 3, fullText.length);
                setChatHistory(prev => prev.map(m => m.id === aiId ? { ...m, content: fullText.slice(0, i) } : m));
                if (i < fullText.length) {
                    requestAnimationFrame(step);
                }
            };
            step();

        } catch (error) {
            setChatHistory(prev => [...prev, {
                id: Date.now() + 1,
                type: 'error',
                content: `Lỗi: ${error.message}`,
                timestamp: new Date()
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClearSession = () => {
        setChatHistory([]);
        setCurrentQuestion('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAskQuestion();
        }
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`ai-support-page ${isMobile ? 'mobile' : 'desktop'}`}>

            {/* ===== HEADER ===== */}
            <div className="ais-header">
                <div className="ais-header-left">
                    <div className="ais-avatar">🤖</div>
                    <div className="ais-title-block">
                        <h1 className="ais-title">AI Hỗ Trợ Khách Hàng</h1>
                        <span className={`ais-status-dot ${documentData ? 'online' : 'loading'}`}>
                            {documentData ? '● Sẵn sàng' : isReading ? '● Đang tải...' : '● Chưa kết nối'}
                        </span>
                    </div>
                </div>
                <div className="ais-header-actions">
                    {/* Knowledge badge */}
                    <button
                        className={`ais-knowledge-btn ${documentData ? 'loaded' : ''}`}
                        onClick={() => setShowKnowledge(true)}
                        title="Xem tri thức đào tạo"
                    >
                        <span className="ais-kb-icon">📚</span>
                        <span className="ais-kb-label">
                            {documentData ? `${Math.round(documentData.contentLength / 1000)}k ký tự` : 'Tri thức'}
                        </span>
                        {documentData && <span className="ais-kb-check">✓</span>}
                    </button>
                    <button className="ais-clear-btn" onClick={handleClearSession} title="Xóa cuộc trò chuyện">
                        🗑️
                    </button>
                </div>
            </div>

            {/* ===== KNOWLEDGE MODAL ===== */}
            {showKnowledge && (
                <div className="ais-modal-overlay" onClick={() => setShowKnowledge(false)}>
                    <div className="ais-modal" onClick={e => e.stopPropagation()}>
                        <div className="ais-modal-header">
                            <h3>📚 Tri thức đào tạo</h3>
                            <button className="ais-modal-close" onClick={() => setShowKnowledge(false)}>✕</button>
                        </div>
                        <div className="ais-modal-body">
                            <div className="ais-doc-input-row">
                                <input
                                    type="url"
                                    placeholder="Nhập URL Google Docs..."
                                    value={documentUrl}
                                    onChange={(e) => setDocumentUrl(e.target.value)}
                                    className="ais-doc-url-input"
                                />
                                <button
                                    onClick={handleReadGoogleDoc}
                                    disabled={isReading}
                                    className="ais-doc-read-btn"
                                >
                                    {isReading ? '⏳ Đang đọc...' : '📖 Tải lại'}
                                </button>
                            </div>
                            {documentData ? (
                                <div className="ais-doc-info">
                                    <div className="ais-doc-stat">
                                        <span>📄 Loại:</span><strong>{documentData.documentInfo.documentType}</strong>
                                    </div>
                                    <div className="ais-doc-stat">
                                        <span>📏 Độ dài:</span><strong>{documentData.contentLength.toLocaleString()} ký tự</strong>
                                    </div>
                                    <div className="ais-doc-stat">
                                        <span>🕐 Cập nhật:</span><strong>{new Date(documentData.readAt).toLocaleString('vi-VN')}</strong>
                                    </div>
                                    <div className="ais-doc-stat url-stat">
                                        <span>🔗 URL:</span>
                                        <a href={documentData.documentUrl} target="_blank" rel="noreferrer" className="ais-doc-link">
                                            {formatUrl(documentData.documentUrl)}
                                        </a>
                                    </div>
                                    <div className="ais-doc-preview">
                                        <p className="ais-doc-preview-label">Xem trước nội dung:</p>
                                        <div className="ais-doc-preview-text">
                                            {documentData.content.substring(0, 300)}...
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="ais-doc-empty">
                                    <p>{isReading ? '⏳ Đang tải nội dung...' : '⚠️ Chưa có tài liệu nào được tải'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== CHAT AREA ===== */}
            <div className="ais-chat-area" ref={chatContainerRef}>
                {chatHistory.length === 0 ? (
                    <div className="ais-welcome">
                        <div className="ais-welcome-icon">💬</div>
                        <h2>Xin chào! Tôi có thể giúp gì cho bạn?</h2>
                        <p>Hãy đặt câu hỏi và AI sẽ tư vấn dựa trên tri thức doanh nghiệp.</p>
                        <div className="ais-suggestions">
                            {['Quy trình làm việc của công ty?', 'Chính sách bảo hành sản phẩm?', 'Thông tin liên hệ hỗ trợ?'].map((s, i) => (
                                <button key={i} className="ais-suggestion-chip" onClick={() => setCurrentQuestion(s)}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="ais-messages">
                        {chatHistory.map((msg) => (
                            <div key={msg.id} className={`ais-msg ais-msg--${msg.type} ${msg.isThinking ? 'is-thinking' : ''}`}>
                                {msg.type !== 'user' && (
                                    <div className="ais-msg-avatar">🤖</div>
                                )}
                                <div className="ais-msg-bubble">
                                    <div className="ais-msg-content">
                                        {msg.content}
                                        {msg.isThinking && <span className="ais-thinking-dots"><span>.</span><span>.</span><span>.</span></span>}
                                    </div>
                                    <div className="ais-msg-time">{formatTimestamp(msg.timestamp)}</div>
                                </div>
                                {msg.type === 'user' && (
                                    <div className="ais-msg-avatar user-avatar">👤</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ===== INPUT BAR ===== */}
            <div className="ais-input-bar">
                <div className="ais-input-wrapper">
                    <textarea
                        ref={textareaRef}
                        className="ais-textarea"
                        placeholder={documentData ? 'Nhập câu hỏi... (Enter để gửi, Shift+Enter xuống dòng)' : '⏳ Đang tải tri thức doanh nghiệp...'}
                        value={currentQuestion}
                        onChange={(e) => setCurrentQuestion(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isProcessing || !documentData}
                        rows={1}
                    />
                    <button
                        className={`ais-send-btn ${currentQuestion.trim() && documentData && !isProcessing ? 'active' : ''}`}
                        onClick={handleAskQuestion}
                        disabled={isProcessing || !currentQuestion.trim() || !documentData}
                        title="Gửi (Enter)"
                    >
                        {isProcessing ? (
                            <span className="ais-send-spinner">⟳</span>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="22" y1="2" x2="11" y2="13"/>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                        )}
                    </button>
                </div>
                <p className="ais-input-hint">AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.</p>
            </div>

        </div>
    );
};

export default AICustomerSupport;
