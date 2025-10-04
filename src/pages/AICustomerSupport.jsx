import React, { useState, useEffect, useRef } from 'react';
import './AICustomerSupport.scss';
import { validateGoogleDocsUrl, getDocumentTypeFromUrl, formatUrl } from '../api/aiCustomerSupportApi';
import { scrapeGoogleDocContent } from '../utils/contentScraper';
import { askCustomerSupport } from '../api/geminiApi';

const AICustomerSupport = () => {
    // console.log('🎯 [AI Support] Component initialized');
    
    // State management
    const [documentUrl, setDocumentUrl] = useState('https://docs.google.com/document/d/1DOcPaJclGEsDiVJtszw2cN0ykgtMyVOLBkoJ-DvLtvQ/edit?usp=sharing');
    const [documentData, setDocumentData] = useState(null);
    const [isReading, setIsReading] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showHistory, setShowHistory] = useState(true);
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        email: '',
        phone: ''
    });
    
    // console.log('📊 [AI Support] Initial state:', {
    //     documentUrl,
    //     documentData: !!documentData,
    //     isReading,
    //     currentQuestion,
    //     chatHistoryLength: chatHistory.length
    // });
    
    // Refs
    const chatContainerRef = useRef(null);
    const questionInputRef = useRef(null);

    // Auto scroll to bottom when new messages are added
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    // Auto load document when component mounts
    useEffect(() => {
        // console.log('🔄 [AI Support] Component mounted, checking auto-load...');
        // console.log('📋 [AI Support] documentUrl:', documentUrl);
        // console.log('📋 [AI Support] documentData:', documentData);
        
        if (documentUrl && !documentData) {
            console.log('🚀 [AI Support] Auto-loading document...');
            handleReadGoogleDoc();
        } else {
            console.log('⏭️ [AI Support] Skip auto-load - URL:', !!documentUrl, 'Data:', !!documentData);
        }
    }, [documentUrl]);

    /**
     * Đọc Google Docs có bảo mật
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
            console.log('🔍 [AI Support] Bắt đầu cào data từ URL:', documentUrl);
            const content = await scrapeGoogleDocContent(documentUrl);
            console.log('📄 [AI Support] Data cào được (full content):', content);
            console.log('📊 [AI Support] Độ dài content:', content?.length || 0, 'ký tự');
            
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
                
                console.log('✅ [AI Support] Setup document data thành công:', payload);
                // alert(`Cào nội dung thành công!\nĐộ dài: ${content.length} ký tự`);
            } else {
                console.log('⚠️ [AI Support] Không thể cào nội dung - content rỗng');
                alert('Không thể cào nội dung. Có thể tài liệu chưa public hoặc bị CORS.');
            }
        } catch (error) {
            console.error('❌ [AI Support] Error reading Google Doc:', error);
            alert(`Lỗi khi cào nội dung: ${error.message}`);
        } finally {
            setIsReading(false);
        }
    };

    /**
     * Xử lý câu hỏi khách hàng với AI
     */
    const handleAskQuestion = async () => {
        if (!currentQuestion.trim()) {
            alert('Vui lòng nhập câu hỏi');
            return;
        }

        if (!documentData) {
            alert('Vui lòng đọc Google Docs trước');
            return;
        }

        setIsProcessing(true);
        setShowHistory(true);
        
        // Add user question to chat
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: currentQuestion,
            timestamp: new Date(),
            documentUrl: documentUrl
        };
        
        setChatHistory(prev => [...prev, userMessage]);

        try {
            // Tạo prompt cho AI dựa trên dữ liệu Google Docs
            // Làm gọn nội dung đính kèm, loại bỏ ký tự lặp dài
            const compactContent = (documentData.content || '')
                .replace(/(\s)\1{2,}/g, '$1')
                .replace(/([\-=_])\1{4,}/g, '$1$1$1')
                .slice(0, 600000);

            console.log('📝 [AI Support] Compact content (600000 chars):', compactContent);
            console.log('📊 [AI Support] Compact content length:', compactContent.length);

            // Tạo lịch sử cuộc trò chuyện (chỉ lấy 5 cuộc hội thoại gần nhất)
            const recentHistory = chatHistory
                .filter(msg => msg.type === 'user' || msg.type === 'ai')
                .slice(-10) // Lấy 10 tin nhắn gần nhất (5 cặp Q&A)
                .map(msg => {
                    if (msg.type === 'user') {
                        return `Khách hàng: ${msg.content}`;
                    } else if (msg.type === 'ai') {
                        return `Chuyên viên: ${msg.content}`;
                    }
                    return '';
                })
                .filter(msg => msg.trim())
                .join('\n');

            console.log('💬 [AI Support] Recent chat history:', recentHistory);
            console.log('📊 [AI Support] History length:', recentHistory.length, 'ký tự');

            // Prompt theo thứ tự: Vai trò -> Lịch sử -> Câu hỏi -> Nội dung đính kèm
            const contextPrompt = `
Bạn là CHUYÊN VIÊN HỖ TRỢ KHÁCH HÀNG của doanh nghiệp. Hãy trả lời CHÍNH XÁC, NGẮN GỌN, THÂN THIỆN và PHẢI NỊNH KHÁCH HÀNG.tham khảo bối cảnh của công ty. Không được nói là gì về Tài liệu mà mi được đính kèm
YÊU CẦU TRẢ LỜI:
- Nếu câu hỏi không có căn cứ rõ trong NỘI DUNG TÀI LIỆU DOANH NGHIỆP, hãy trả lời: "Hiện tôi chưa rõ ý bạn hoặc chưa có đủ thông tin để trả lời chính xác." và đề nghị khách hàng cung cấp thêm chi tiết hoặc hướng dẫn liên hệ bộ phận/phòng ban phù hợp.
- tham khảo trên nội dung tài liệu và thông tin cung cấp; nếu có, đưa ra các bước tiếp theo ngắn gọn.
- Trình bày rõ ràng, gạch đầu dòng khi phù hợp, tiếng Việt.
- Tham khảo lịch sử cuộc trò chuyện để hiểu ngữ cảnh và trả lời phù hợp.

LỊCH SỬ CUỘC TRÒ CHUYỆN:
${recentHistory || 'Đây là câu hỏi đầu tiên trong cuộc trò chuyện.'}

CÂU HỎI HIỆN TẠI CỦA KHÁCH HÀNG:
"${currentQuestion}"

THÔNG TIN BỔ SUNG (nếu có):
- Tên: ${customerInfo.name || 'Không có'}
- Email: ${customerInfo.email || 'Không có'}
- Số điện thoại: ${customerInfo.phone || 'Không có'}

NỘI DUNG TÀI LIỆU DOANH NGHIỆP :
${compactContent}


`;
            console.log('🚀 [AI Support] Full context prompt để gửi API:', contextPrompt);
            console.log('📏 [AI Support] Prompt length:', contextPrompt.length, 'ký tự');

            // Lọc response: loại bỏ bullet nói về "tài liệu"
            const sanitizeAiResponse = (text) => {
                if (!text) return '';
                const lines = text.split(/\r?\n/);
                const docKeywords = /(tài liệu|document|google\s*docs|nội dung\s*tài\s*liệu|văn\s*bản|tư\s*liệu)/i;
                const isBullet = (s) => /^(\s*([\-\*•]|\d+[\)\.-]))\s+/.test(s);
                const stripMd = (s) => s.replace(/\*\*|__/g, '').replace(/`/g, '');
                const filtered = lines.filter(line => {
                    const raw = line || '';
                    const l = stripMd(raw).trim();
                    if (!l) return false; // bỏ dòng trống
                    // Bỏ mọi dòng (bullet hoặc thường) có nhắc tới tài liệu
                    if (docKeywords.test(l)) return false;
                    return true;
                });
                return filtered.join('\n')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();
            };

            // Gọi AI và phát dần ký tự (hiệu ứng chữ chạy)
            setIsTyping(true);
            setShowHistory(true);
            
            // Tạo message thinking trước
            const thinkingId = Date.now() + 1;
            const thinkingMessage = {
                id: thinkingId,
                type: 'ai',
                content: '',
                timestamp: new Date(),
                documentUrl: documentUrl,
                isThinking: true
            };
            setChatHistory(prev => [...prev, thinkingMessage]);

            // Hiệu ứng thinking với các câu loading
            const thinkingMessages = [
                "🤔 Đang suy nghĩ...",
                "🔍 📚 Đang tìm kiếm trong tri thức...",
                "💭 Đang xử lý câu hỏi...",
                "🧠 AI đang học hỏi...",
                "⚡ Đang tổng hợp thông tin...",
                "🎯 Đang chuẩn bị câu trả lời..."
            ];
            
            let thinkingIndex = 0;
            const thinkingInterval = setInterval(() => {
                thinkingIndex = (thinkingIndex + 1) % thinkingMessages.length;
                setChatHistory(prev => prev.map(m => 
                    m.id === thinkingId ? { ...m, content: thinkingMessages[thinkingIndex] } : m
                ));
            }, 1500);

            // Gọi API AI
            const fullTextRaw = await askCustomerSupport(contextPrompt);
            clearInterval(thinkingInterval);
            
            // Xóa thinking message và thêm response thật
            setChatHistory(prev => prev.filter(m => m.id !== thinkingId));
            
            const fullText = sanitizeAiResponse(fullTextRaw || '');
            const aiId = Date.now() + 2;
            const baseMessage = {
                id: aiId,
                type: 'ai',
                content: '',
                timestamp: new Date(),
                documentUrl: documentUrl
            };
            setChatHistory(prev => [...prev, baseMessage]);

            const reveal = (text) => {
                let i = 0;
                const step = () => {
                    i = Math.min(i + 3, text.length);
                    setChatHistory(prev => prev.map(m => m.id === aiId ? { ...m, content: text.slice(0, i) } : m));
                    if (i < text.length) {
                        requestAnimationFrame(step);
                    } else {
                        setIsTyping(false);
                    }
                };
                step();
            };
            reveal(fullText || '');

            // Clear current question
            setCurrentQuestion('');
        } catch (error) {
            // Add error message to chat
            const errorMessage = {
                id: Date.now() + 1,
                type: 'error',
                content: `Lỗi: ${error.message}`,
                timestamp: new Date()
            };
            
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Clear current session
     */
    const handleClearSession = () => {
        setCurrentQuestion('');
        setDocumentUrl('');
        setDocumentData(null);
        setChatHistory([]);
        setCustomerInfo({ name: '', email: '', phone: '' });
    };

    /**
     * Handle Enter key press
     */
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAskQuestion();
        }
    };

    /**
     * Format timestamp for display
     */
    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString('vi-VN');
    };

    return (
        <div className="ai-customer-support">
            <div className="ai-header">
                <h2>🤖 AI Hỗ Trợ Khách Hàng</h2>
                <p>Trả lời khách hàng chuyên nghiệp dựa trên Google Docs doanh nghiệp</p>
            </div>

            <div className="ai-main-content">
                {/* Google Docs Reading Section */}
                <div className="document-section">
                    <h3>📄 Tri thức đào tạo(link Google Docs)</h3>
                    <div className="document-input-group">
                        <input
                            type="url"
                            placeholder="Nhập URL Google Docs có bảo mật..."
                            value={documentUrl}
                            onChange={(e) => setDocumentUrl(e.target.value)}
                            className="document-url-input"
                        />
                        <button
                            onClick={handleReadGoogleDoc}
                            disabled={isReading}
                            className="read-btn"
                        >
                            {isReading ? '⏳ Đang đọc...' : '📖 Đọc Google Docs'}
                        </button>
                    </div>
                    
                    {documentData && (
                        <div className="document-info">
                            <h4>✅ Google Docs đã đọc:</h4>
                            <p><strong>Tiêu đề:</strong> {documentData.documentInfo.title}</p>
                            <p><strong>Loại:</strong> {documentData.documentInfo.documentType}</p>
                            <p><strong>URL:</strong> {formatUrl(documentData.documentUrl)}</p>
                            <p><strong>Độ dài:</strong> {documentData.contentLength} ký tự</p>
                            <p><strong>Thời gian:</strong> {formatTimestamp(documentData.readAt)}</p>
                            <div className="content-preview">
                                <strong>Nội dung:</strong>
                                <div className="content-text">
                                    {documentData.content.substring(0, 200)}...
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Customer Information Section */}
                <div className="customer-section">
                    <h3>👤 Thông Tin Khách Hàng</h3>
                    <div className="customer-inputs">
                        <input
                            type="text"
                            placeholder="Tên khách hàng"
                            value={customerInfo.name}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={customerInfo.email}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        />
                        <input
                            type="tel"
                            placeholder="Số điện thoại"
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        />
                    </div>
                </div>

                {/* Chat Interface */}
                <div className="chat-section">
                    <div className="chat-header">
                        <h3>💬 Trò Chuyện Với AI</h3>
                        <div className="chat-controls">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="history-btn"
                            >
                                {showHistory ? '📝 Ẩn lịch sử' : '📚 Xem lịch sử'}
                            </button>
                            <button
                                onClick={handleClearSession}
                                className="clear-btn"
                            >
                                🗑️ Xóa phiên
                            </button>
                        </div>
                    </div>

                    {/* Chat History */}
                    {showHistory && (
                        <div className="chat-history" ref={chatContainerRef}>
                            <h4>📚 Lịch sử trò chuyện</h4>
                            <div className="history-list">
                                {chatHistory.length === 0 ? (
                                    <p className="no-history">Chưa có lịch sử trò chuyện</p>
                                ) : (
                                    chatHistory.map((message) => (
                                        <div key={message.id} className={`message ${message.type} ${message.isThinking ? 'thinking' : ''}`}>
                                            <div className="message-header">
                                                <span className="message-type">
                                                    {message.type === 'user' ? '👤 Khách hàng' : 
                                                     message.type === 'ai' ? '🤖 AI' : '❌ Lỗi'}
                                                </span>
                                                <span className="message-time">
                                                    {formatTimestamp(message.timestamp)}
                                                </span>
                                            </div>
                                            <div className="message-content">
                                                {message.content}
                                            </div>
                                            {message.documentUrl && (
                                                <div className="message-document">
                                                    📄 Google Docs: {formatUrl(message.documentUrl)}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Chat Input */}
                    <div className="chat-input-section">
                        <textarea
                            ref={questionInputRef}
                            placeholder="Nhập câu hỏi của khách hàng..."
                            value={currentQuestion}
                            onChange={(e) => setCurrentQuestion(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="question-input"
                            rows={3}
                        />
                        <button
                            onClick={handleAskQuestion}
                            disabled={isProcessing || !currentQuestion.trim() || !documentData}
                            className="ask-btn"
                        >
                            {isProcessing ? '⏳ Đang xử lý...' : '🚀 Gửi câu hỏi'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AICustomerSupport;
