import React, { useState, useEffect } from 'react';
import './LinkManager.scss';
import { searchLinksWithGemini, askGeminiSpecificQuestion, findLinksByCriteria, deepSearchWithReference } from '../api/geminiApi';
import { fetchLinks, createLink, updateLink, deleteLink, toggleFavorite as toggleFavoriteAPI, incrementAccessCount } from '../api/linksApi';

function LinkManager() {
    const [links, setLinks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [showAddForm, setShowAddForm] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKeys, setApiKeys] = useState([]); // [{id,label,value}]
    const [selectedKeyId, setSelectedKeyId] = useState('');
    const [newApiKey, setNewApiKey] = useState('');
    const [newApiKeyLabel, setNewApiKeyLabel] = useState('');
    const [modelQuick, setModelQuick] = useState('gemini-flash-lite-latest');
    const [modelSmart, setModelSmart] = useState('gemini-flash-lite-latest');

    const [newLink, setNewLink] = useState({
        title: '',
        url: '',
        department: '',
        description: '',
        type: 'form' // form, sheet, doc
    });
    const [geminiResponse, setGeminiResponse] = useState('');
    const [isLoadingGemini, setIsLoadingGemini] = useState(false);
    const [displayedLines, setDisplayedLines] = useState([]);
    const [quickQuestion, setQuickQuestion] = useState('');
    const [showQuickAsk, setShowQuickAsk] = useState(false);
    const [showDeepSearch, setShowDeepSearch] = useState(false);
    const [deepSearchPrompt, setDeepSearchPrompt] = useState('');
    const [referenceUrl, setReferenceUrl] = useState('');
    const [deepSearchDepartment, setDeepSearchDepartment] = useState('all');
    const [analyzingProgress, setAnalyzingProgress] = useState('');
    const [favoriteLinks, setFavoriteLinks] = useState([]);
    const [geminiError, setGeminiError] = useState('');
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [scrapedContent, setScrapedContent] = useState('');

    // Typing effect: hiển thị từng dòng một
    useEffect(() => {
        if (!geminiResponse || typeof geminiResponse !== 'string') {
            setDisplayedLines([]);
            return;
        }
        setDisplayedLines([]);
        const lines = geminiResponse.split('\n');
        let idx = 0;
        const timer = setInterval(() => {
            setDisplayedLines(prev => [...prev, lines[idx]]);
            idx++;
            if (idx >= lines.length) clearInterval(timer);
        }, 100);
        return () => clearInterval(timer);
    }, [geminiResponse]);

    // Parse lỗi Gemini thành thông điệp thân thiện
    const getFriendlyGeminiError = (error) => {
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

    // Helper để render URL có thể click và preview
    const renderLineWithLinks = (line) => {
        if (!line || typeof line !== 'string') return <span></span>;
        const urlRegex = /(https?:\/\/[\w\-._~:\/?#[\]@!$&'()*+,;=%]+)/g;
        return line.split(urlRegex).map((part, i) =>
            urlRegex.test(part) ? (
                <span key={i} className="url-with-preview">
                    <a href={part} target="_blank" rel="noopener noreferrer">{part}</a>
                    <button
                        className="btn-preview-inline"
                        onClick={() => handlePreview(part)}
                        title="Xem trước"
                    >
                        👁️
                    </button>
                </span>
            ) : (
                <span key={i}>{part}</span>
            )
        );
    };

    // Sample data - trong thực tế sẽ load từ API hoặc localStorage
    const sampleLinks = [
        {
            id: 1,
            title: 'Báo cáo công việc hàng ngày',
            url: 'https://docs.google.com/forms/d/1234567890/edit',
            department: 'hr',
            description: 'Form báo cáo công việc hàng ngày cho nhân viên',
            type: 'form',
            dateAdded: '2024-01-15'
        },
        {
            id: 2,
            title: 'Danh sách thiết bị phòng IT',
            url: 'https://docs.google.com/spreadsheets/d/abcdef123456/edit',
            department: 'it',
            description: 'Bảng tính quản lý thiết bị IT',
            type: 'sheet',
            dateAdded: '2024-01-10'
        },
        {
            id: 3,
            title: 'Quy trình xin phép',
            url: 'https://docs.google.com/document/d/xyz789/edit',
            department: 'hr',
            description: 'Tài liệu hướng dẫn quy trình xin phép',
            type: 'doc',
            dateAdded: '2024-01-05'
        }
    ];

    useEffect(() => {
        loadLinks();
        loadSettings();
    }, []);

    const loadSettings = () => {
        try {
            const storedKeys = JSON.parse(localStorage.getItem('gemini.api.keys') || '[]');
            const storedSelectedId = localStorage.getItem('gemini.api.selectedKeyId') || '';
            const storedQuick = localStorage.getItem('gemini.model.quick') || 'gemini-flash-lite-latest';
            const storedSmart = localStorage.getItem('gemini.model.smart') || 'gemini-flash-lite-latest';
            setApiKeys(storedKeys);
            setSelectedKeyId(storedSelectedId);
            setModelQuick(storedQuick);
            setModelSmart(storedSmart);
        } catch (e) {
            console.error('Error loading settings', e);
        }
    };

    const persistSettings = (next = {}) => {
        const keys = next.apiKeys ?? apiKeys;
        const selId = next.selectedKeyId ?? selectedKeyId;
        const q = next.modelQuick ?? modelQuick;
        const s = next.modelSmart ?? modelSmart;
        localStorage.setItem('gemini.api.keys', JSON.stringify(keys));
        localStorage.setItem('gemini.api.selectedKeyId', selId);
        localStorage.setItem('gemini.model.quick', q);
        localStorage.setItem('gemini.model.smart', s);
    };

    const handleAddApiKey = () => {
        if (!newApiKey.trim()) { alert('Vui lòng nhập API key'); return; }
        const id = Date.now().toString();
        const label = newApiKeyLabel?.trim() || `Key ${apiKeys.length + 1}`;
        const updated = [...apiKeys, { id, label, value: newApiKey.trim() }];
        setApiKeys(updated);
        setSelectedKeyId(id);
        setNewApiKey('');
        setNewApiKeyLabel('');
        persistSettings({ apiKeys: updated, selectedKeyId: id });
    };

    const handleDeleteApiKey = (id) => {
        const updated = apiKeys.filter(k => k.id !== id);
        const nextSelected = selectedKeyId === id ? (updated[0]?.id || '') : selectedKeyId;
        setApiKeys(updated);
        setSelectedKeyId(nextSelected);
        persistSettings({ apiKeys: updated, selectedKeyId: nextSelected });
    };

    const handleSelectApiKey = (id) => {
        setSelectedKeyId(id);
        persistSettings({ selectedKeyId: id });
    };

    const handleSaveModels = () => {
        persistSettings({ modelQuick, modelSmart });
        alert('Đã lưu cài đặt model.');
    };

    const loadLinks = async () => {
        try {
            const linksData = await fetchLinks();
            setLinks(linksData);
            
            // Load favorites từ links data
            const favorites = linksData.filter(link => link.is_favorite).map(link => link.id);
            setFavoriteLinks(favorites);
        } catch (error) {
            console.error('Error loading links:', error);
            // Fallback to sample data
            setLinks(sampleLinks);
        }
    };

    const departments = [
        { value: 'all', label: 'Tất cả phòng ban' },
        { value: 'hr', label: 'Nhân sự' },
        { value: 'it', label: 'Công nghệ thông tin' },
        { value: 'finance', label: 'Tài chính' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'sales', label: 'Kinh doanh' },
        { value: 'admin', label: 'Hành chính' },
        { value: 'rd', label: 'R&D' },
        { value: 'sx', label: 'Sản xuất' },
        { value: 'xm', label: 'Xưởng mộc' },
        { value: 'ck', label: 'Cơ khí' },
        { value: 'vv', label: 'Khác' },
    ];

    const linkTypes = [
        { value: 'form', label: 'Google Form', icon: '📝' },
        { value: 'sheet', label: 'Google Sheet', icon: '📊' },
        { value: 'doc', label: 'Google Doc', icon: '📄' }
    ];

    const filteredLinks = links.filter(link => {
        const matchesSearch = link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            link.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDepartment = selectedDepartment === 'all' || link.department === selectedDepartment;
        return matchesSearch && matchesDepartment;
    });

    const handleAddLink = async () => {
        if (!newLink.title || !newLink.url || !newLink.department) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
            return;
        }

        try {
            const linkData = {
                ...newLink,
                created_by: 'admin' // Có thể lấy từ user context
            };

            await createLink(linkData);
            await loadLinks(); // Reload data from server

            // Reset form
            setNewLink({
                title: '',
                url: '',
                department: '',
                description: '',
                type: 'form'
            });
            setShowAddForm(false);
            alert('Thêm link thành công!');
        } catch (error) {
            console.error('Error adding link:', error);
            alert('Lỗi khi thêm link: ' + error.message);
        }
    };

    const handleDeleteLink = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa link này?')) {
            try {
                const authCode = prompt('Nhập mã xác thực để xóa:');
                if (!authCode) return;
                
                await deleteLink(id, authCode);
                await loadLinks(); // Reload data from server
                alert('Xóa link thành công!');
            } catch (error) {
                console.error('Error deleting link:', error);
                alert('Lỗi khi xóa link: ' + error.message);
            }
        }
    };

    const searchWithGemini = async () => {
        if (!searchTerm.trim()) {
            setGeminiResponse('❌ Vui lòng nhập từ khóa tìm kiếm');
            return;
        }

        setIsLoadingGemini(true);
        setGeminiError('');
        try {
            const response = await searchLinksWithGemini(links, searchTerm);
            setGeminiResponse(`🔍 **Kết quả tìm kiếm cho "${searchTerm}":**\n\n${response || 'Không có kết quả'}`);
        } catch (error) {
            console.error('Lỗi khi tìm kiếm với Gemini:', error);
            setGeminiError(getFriendlyGeminiError(error));
            setGeminiResponse('');
        } finally {
            setIsLoadingGemini(false);
        }
    };

    const askQuickQuestion = async () => {
        if (!quickQuestion.trim()) return;
        
        setIsLoadingGemini(true);
        setGeminiError('');
        try {
            const response = await askGeminiSpecificQuestion(quickQuestion, links);
            setGeminiResponse(`**Câu hỏi:** ${quickQuestion}\n\n**Kết quả:**\n${response || 'Không tìm thấy kết quả'}`);
            setQuickQuestion('');
            setShowQuickAsk(false);
        } catch (error) {
            console.error('Error asking quick question:', error);
            setGeminiError(getFriendlyGeminiError(error));
            setGeminiResponse('');
        } finally {
            setIsLoadingGemini(false);
        }
    };

    const toggleFavorite = async (linkId) => {
        try {
            const isCurrentlyFavorite = favoriteLinks.includes(linkId);
            await toggleFavoriteAPI(linkId, !isCurrentlyFavorite);
            
            // Update local state
            const updatedFavorites = isCurrentlyFavorite
                ? favoriteLinks.filter(id => id !== linkId)
                : [...favoriteLinks, linkId];
            
            setFavoriteLinks(updatedFavorites);
        } catch (error) {
            console.error('Error toggling favorite:', error);
            alert('Lỗi khi cập nhật yêu thích: ' + error.message);
        }
    };

    const handleLinkClick = async (linkId) => {
        try {
            await incrementAccessCount(linkId);
        } catch (error) {
            console.error('Error incrementing access count:', error);
            // Không hiển thị lỗi cho user vì không ảnh hưởng đến UX
        }
    };

    const convertToEmbedUrl = (url) => {
        if (!url) return null;
        
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
        
        return url; // Trả về URL gốc nếu không match
    };

    const handlePreview = (url) => {
        const embedUrl = convertToEmbedUrl(url);
        setPreviewUrl(embedUrl);
        setShowPreview(true);
    };

    const closePreview = () => {
        setShowPreview(false);
        setPreviewUrl(null);
    };

    // Cào nội dung từ Google Docs/Sheets thông qua export API
    const scrapeGoogleDocContent = async (url) => {
        try {
            let content = '';
            
            // Google Docs - export as plain text
            if (url.includes('docs.google.com/document')) {
                const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (match) {
                    const docId = match[1];
                    // Sử dụng published link nếu có
                    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
                    
                    try {
                        // Try với CORS proxy hoặc direct
                        const response = await fetch(exportUrl);
                        if (response.ok) {
                            content = await response.text();
                        }
                    } catch (corsError) {
                        // Nếu bị CORS, thử cách khác: published link
                        console.log('CORS error, trying alternative method');
                        return `Tài liệu Google Docs (ID: ${docId}). Vui lòng đảm bảo tài liệu được publish public.`;
                    }
                }
            }
            
            // Google Sheets - export as CSV/TSV
            if (url.includes('docs.google.com/spreadsheets')) {
                const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (match) {
                    const sheetId = match[1];
                    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=tsv`;
                    
                    try {
                        const response = await fetch(exportUrl);
                        if (response.ok) {
                            content = await response.text();
                        }
                    } catch (corsError) {
                        console.log('CORS error for sheets');
                        return `Bảng tính Google Sheets (ID: ${sheetId}). Vui lòng đảm bảo được chia sẻ public.`;
                    }
                }
            }

            return content;
        } catch (error) {
            console.error('Error scraping content:', error);
            return '';
        }
    };

    // Rút gọn nội dung xuống tối đa N từ
    const truncateContent = (content, maxWords = 100) => {
        if (!content) return '';
        
        // Loại bỏ ký tự đặc biệt, xuống dòng
        const cleanContent = content.replace(/[\r\n\t]+/g, ' ').trim();
        
        // Tách thành mảng từ
        const words = cleanContent.split(/\s+/);
        
        // Nếu ít hơn hoặc bằng maxWords thì giữ nguyên
        if (words.length <= maxWords) return cleanContent;
        
        // Cắt và thêm dấu ...
        return words.slice(0, maxWords).join(' ') + '...';
    };

    // Tính điểm tương đồng giữa prompt và nội dung (keyword matching)
    const calculateRelevanceScore = (prompt, content) => {
        if (!prompt || !content) return 0;
        
        // Chuẩn hóa text: lowercase, loại bỏ dấu câu
        const normalizeText = (text) => text.toLowerCase()
            .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2); // Bỏ từ quá ngắn

        const promptWords = normalizeText(prompt);
        const contentWords = normalizeText(content);
        
        // Đếm số từ khớp
        let matchCount = 0;
        const contentSet = new Set(contentWords);
        
        promptWords.forEach(word => {
            if (contentSet.has(word)) {
                matchCount++;
            }
        });
        
        // Tính tỷ lệ khớp
        const score = promptWords.length > 0 ? (matchCount / promptWords.length) * 100 : 0;
        return Math.round(score);
    };

    // Focus và lọc data theo keyword từ prompt
    const focusRelevantData = (scrapedData, prompt) => {
        console.log('🔍 Bắt đầu focus data theo prompt:', prompt);
        
        // Tính điểm cho từng data
        const scoredData = scrapedData.map(item => {
            const score = calculateRelevanceScore(prompt, item.content);
            console.log(`  📊 ${item.title}: ${score}% khớp`);
            return { ...item, relevanceScore: score };
        });
        
        // Sắp xếp theo điểm giảm dần
        const sorted = scoredData.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        // Lọc những data có điểm > 20% (có liên quan)
        const relevant = sorted.filter(item => item.relevanceScore > 20);
        
        console.log(`✨ Kết quả: ${relevant.length}/${scrapedData.length} tài liệu phù hợp`);
        
        return relevant;
    };

    const findByDepartment = async () => {
        if (selectedDepartment === 'all') {
            setGeminiResponse('❌ Vui lòng chọn một phòng ban cụ thể để tra cứu');
            return;
        }

        setIsLoadingGemini(true);
        setGeminiError('');
        try {
            const deptName = departments.find(d => d.value === selectedDepartment)?.label;
            const response = await findLinksByCriteria(links, `phòng ban ${deptName}`);
            setGeminiResponse(`**📋 Links của phòng ${deptName}:**\n\n${response || 'Không có links nào'}`);
        } catch (error) {
            console.error('Error finding links by department:', error);
            setGeminiError(getFriendlyGeminiError(error));
            setGeminiResponse('');
        } finally {
            setIsLoadingGemini(false);
        }
    };

    const handleDeepSearch = async () => {
        if (!deepSearchPrompt.trim() && !referenceUrl.trim()) {
            alert('Vui lòng nhập mô tả tìm kiếm hoặc URL tham chiếu');
            return;
        }

        // Lọc danh sách links theo phòng ban
        const linksToSearch = deepSearchDepartment === 'all' 
            ? links
            : links.filter(l => l.department === deepSearchDepartment);

        if (linksToSearch.length === 0) {
            alert('Không có tài liệu nào trong phạm vi đã chọn');
            return;
        }

        setIsLoadingGemini(true);
        setGeminiError('');
        
        // Hiệu ứng phân tích phức tạp
        const progressSteps = [
            '📥 Cào nội dung từ tất cả tài liệu...',
            '🔍 Phân tích và lọc keyword...',
            '🎯 Focus data phù hợp nhất...',
            '📊 Đưa data vào prompt cho AI...',
            '⚡ AI đang xử lý...',
            '✨ Hoàn tất!'
        ];

        let currentStep = 0;
        const progressInterval = setInterval(() => {
            if (currentStep < progressSteps.length) {
                setAnalyzingProgress(progressSteps[currentStep]);
                currentStep++;
            }
        }, 1500);

        try {
            // BƯỚC 1: Cào nội dung từ TẤT CẢ URL trong phạm vi
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📥 BƯỚC 1: Cào nội dung từ tất cả tài liệu');
            console.log(`   Phạm vi: ${deepSearchDepartment === 'all' ? 'Tất cả phòng ban' : departments.find(d => d.value === deepSearchDepartment)?.label}`);
            console.log(`   Số lượng: ${linksToSearch.length} tài liệu`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            setAnalyzingProgress(`📥 Đang cào ${linksToSearch.length} tài liệu...`);
            
            const scrapedData = [];
            for (let i = 0; i < linksToSearch.length; i++) {
                const linkItem = linksToSearch[i];
                try {
                    console.log(`\n[${i+1}/${linksToSearch.length}] Đang cào: ${linkItem.title}`);
                    const rawContent = await scrapeGoogleDocContent(linkItem.url);
                    
                    if (rawContent && rawContent.length > 10) {
                        const truncated = truncateContent(rawContent, 100);
                        scrapedData.push({
                            id: linkItem.id,
                            title: linkItem.title,
                            url: linkItem.url,
                            department: linkItem.department,
                            type: linkItem.type,
                            content: truncated,
                            fullContent: rawContent
                        });
                        console.log(`✅ Thành công: ${truncated.substring(0, 100)}...`);
                    } else {
                        console.log(`⚠️ Không có nội dung hoặc bị CORS`);
                    }
                } catch (err) {
                    console.error(`❌ Lỗi cào ${linkItem.url}:`, err.message);
                }
            }
            
            console.log(`\n📊 Tổng kết cào: ${scrapedData.length}/${linksToSearch.length} tài liệu thành công`);
            
            // BƯỚC 2: Focus data theo keyword từ prompt
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔍 BƯỚC 2: Lọc data theo keyword từ prompt');
            console.log(`   Prompt: "${deepSearchPrompt.trim()}"`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            setAnalyzingProgress('🔍 Đang phân tích và lọc keyword...');
            
            const focusedData = focusRelevantData(scrapedData, deepSearchPrompt.trim());
            
            // BƯỚC 3: Lấy data phù hợp nhất làm bối cảnh
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎯 BƯỚC 3: Chọn data phù hợp nhất làm bối cảnh');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            setAnalyzingProgress('🎯 Đang tạo bối cảnh từ data phù hợp...');
            
            let contextData = '';
            if (focusedData.length > 0) {
                // Lấy top 3 data phù hợp nhất
                const topData = focusedData.slice(0, 3);
                
                contextData = '--- BỐI CẢNH TỪ DATA ĐÃ CÀO ---\n\n';
                topData.forEach((item, idx) => {
                    contextData += `[${idx + 1}] ${item.title} (Độ khớp: ${item.relevanceScore}%)\n`;
                    contextData += `${item.content}\n\n`;
                    console.log(`  ✅ Chọn #${idx + 1}: ${item.title} (${item.relevanceScore}%)`);
                });
                
                setScrapedContent(contextData);
            } else {
                console.log('  ⚠️ Không có data nào đủ điểm liên quan (>20%)');
                contextData = '--- Không tìm thấy data liên quan từ các tài liệu đã cào ---\n';
            }
            
            // Ghép prompt với context
            let finalPrompt = deepSearchPrompt.trim();
            if (contextData) {
                finalPrompt = `${finalPrompt}\n\n${contextData}`;
            }
            
            // BƯỚC 4: Gửi cho AI
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📤 BƯỚC 4: Gửi prompt + context cho AI');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            setAnalyzingProgress('⚡ AI đang phân tích...');
            
            const response = await deepSearchWithReference(
                linksToSearch, 
                '', // Không dùng referenceUrl nữa
                finalPrompt
            );
            
            clearInterval(progressInterval);
            setAnalyzingProgress('');
            
            const deptLabel = deepSearchDepartment === 'all' 
                ? 'tất cả phòng ban' 
                : departments.find(d => d.value === deepSearchDepartment)?.label;
            
            console.log('\n✅ Phản hồi từ AI:', response.substring(0, 200) + '...');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            
            setGeminiResponse(
                `**🔍 TÌM KIẾM CHUYÊN SÂU**\n\n` +
                `📝 **Prompt:** ${deepSearchPrompt.trim()}\n` +
                `📊 **Data đã cào:** ${scrapedData.length}/${linksToSearch.length} tài liệu\n` +
                `🎯 **Data phù hợp:** ${focusedData.length} tài liệu (>20% khớp)\n` +
                `📋 **Phạm vi:** ${deptLabel}\n\n` +
                `---\n\n${response}`
            );
            setShowDeepSearch(false);
            setDeepSearchPrompt('');
            setReferenceUrl('');
            setScrapedContent('');
        } catch (error) {
            clearInterval(progressInterval);
            setAnalyzingProgress('');
            console.error('Error in deep search:', error);
            setGeminiError(getFriendlyGeminiError(error));
            setGeminiResponse('');
        } finally {
            setIsLoadingGemini(false);
        }
    };

    return (
        <div className="link-manager">


            {geminiError && (
                <div className="gemini-alert">
                    <strong>⚠️ Lỗi:</strong>
                    <span>{` ${geminiError}`}</span>
                </div>
            )}

            {showSettings && (
                <div className="settings-panel">
                    <div className="settings-header">
                        <h3>⚙️ Cài đặt AI</h3>
                        <button className="btn-close" onClick={() => setShowSettings(false)}>✖️</button>
                    </div>

                    <div className="settings-section">
                        <h4>API Keys</h4>
                        <div className="api-keys">
                            <div className="add-key">
                                <input
                                    type="text"
                                    placeholder="Nhãn (ví dụ: Key Công ty)"
                                    value={newApiKeyLabel}
                                    onChange={(e) => setNewApiKeyLabel(e.target.value)}
                                />
                                <input
                                    type="password"
                                    placeholder="Dán API key mới..."
                                    value={newApiKey}
                                    onChange={(e) => setNewApiKey(e.target.value)}
                                />
                                <button className="btn-success" onClick={handleAddApiKey}>➕ Thêm</button>
                            </div>

                            <div className="keys-list">
                                {apiKeys.length === 0 ? (
                                    <p className="muted">Chưa có API key nào. Hãy thêm mới.</p>
                                ) : (
                                    apiKeys.map(k => (
                                        <div key={k.id} className={`key-item ${selectedKeyId === k.id ? 'selected' : ''}`}>
                                            <div className="key-info" onClick={() => handleSelectApiKey(k.id)}>
                                                <span className="key-label">{k.label}</span>
                                                <span className="key-value">••••••••</span>
                                            </div>
                                            <button className="btn-delete" onClick={() => handleDeleteApiKey(k.id)}>🗑️</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h4>Models</h4>
                        <div className="models-grid">
                            <div className="model-item">
                                <label>Tra cứu nhanh</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: gemini-flash-lite-latest"
                                    value={modelQuick}
                                    onChange={(e) => setModelQuick(e.target.value)}
                                />
                            </div>
                            <div className="model-item">
                                <label>Tìm kiếm thông minh</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: gemini-2.0-flash-exp"
                                    value={modelSmart}
                                    onChange={(e) => setModelSmart(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="settings-actions">
                            <button className="btn-primary" onClick={handleSaveModels}>💾 Lưu cài đặt</button>
                        </div>
                    </div>
                </div>
            )}



            <div className="header">
                <h1>🔗 Quản lý Link Google Docs/Sheets</h1>
                <p>Tập trung hóa tất cả các link Google Form, Sheet, Doc của các phòng ban</p>
            </div>

            <div className="controls">
                <div className="search-filter">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="🔍 Tìm kiếm link..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="department-filter"
                    >
                        {departments.map(dept => (
                            <option key={dept.value} value={dept.value}>
                                {dept.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="action-buttons">
                    <button
                        className="btn-primary"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        ➕ Thêm Link
                    </button>
                    
                    <button
                        className="btn-secondary"
                        onClick={() => setShowQuickAsk(!showQuickAsk)}
                    >
                        ❓ Tra cứu nhanh AI
                    </button>

                    <button
                        className="btn-deep-search"
                        onClick={() => setShowDeepSearch(!showDeepSearch)}
                    >
                        🎯 Tìm kiếm chuyên sâu
                    </button>
                    
                    <button
                        className="btn-settings"
                        onClick={() => setShowSettings(true)}
                    >
                        ⚙️ Cài đặt
                    </button>

                    <button
                        className="btn-info"
                        onClick={findByDepartment}
                        disabled={isLoadingGemini}
                    >
                        📋 Tra cứu theo phòng ban
                    </button>
                    
                    <button
                        className="btn-gemini"
                        onClick={searchWithGemini}
                        disabled={isLoadingGemini || !searchTerm.trim()}
                    >
                        {isLoadingGemini ? '⏳ Đang tìm...' : '🔍 Tìm kiếm thông minh'}
                    </button>
                </div>
            </div>
            {isLoadingGemini && (
                <div className="thinking">
                    <div className="spinner"></div>
                    <p>{analyzingProgress || '🤔 Đang suy nghĩ...'}</p>
                </div>
            )}
            {!isLoadingGemini && displayedLines.length > 0 && (
                <div className="gemini-response">
                    <h3>🔍 Kết quả tra cứu</h3>
                    <div className="response-content">
                        {displayedLines.map((line, idx) => (
                            <p key={idx}>{renderLineWithLinks(line)}</p>
                        ))}
                    </div>
                    <button className="btn-close" onClick={() => setGeminiResponse('')}>✖️</button>
                </div>
            )}
            {showAddForm && (
                <div className="add-form">
                    <h3>Thêm Link Mới</h3>
                    <div className="form-grid">
                        <input
                            type="text"
                            placeholder="Tiêu đề *"
                            value={newLink.title}
                            onChange={(e) => setNewLink({...newLink, title: e.target.value})}
                        />
                        
                        <input
                            type="url"
                            placeholder="URL link *"
                            value={newLink.url}
                            onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                        />
                        
                        <select
                            value={newLink.department}
                            onChange={(e) => setNewLink({...newLink, department: e.target.value})}
                        >
                            <option value="">Chọn phòng ban *</option>
                            {departments.slice(1).map(dept => (
                                <option key={dept.value} value={dept.value}>
                                    {dept.label}
                                </option>
                            ))}
                        </select>
                        
                        <select
                            value={newLink.type}
                            onChange={(e) => setNewLink({...newLink, type: e.target.value})}
                        >
                            {linkTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                </option>
                            ))}
                        </select>
                        
                        <textarea
                            placeholder="Mô tả (tùy chọn)"
                            value={newLink.description}
                            onChange={(e) => setNewLink({...newLink, description: e.target.value})}
                            className="description-input"
                        />
                    </div>
                    
                    <div className="form-buttons">
                        <button className="btn-success" onClick={handleAddLink}>
                            ✅ Thêm Link
                        </button>
                        <button className="btn-cancel" onClick={() => setShowAddForm(false)}>
                            ❌ Hủy
                        </button>
                    </div>
                </div>
            )}

            {showQuickAsk && (
                <div className="quick-ask-form">
                    <h3>❓ Tra cứu nhanh</h3>
                    <div className="quick-ask-input">
                        <input
                            type="text"
                            placeholder="Ví dụ: Tìm form báo cáo của phòng HR, link nào dùng để xin phép?"
                            value={quickQuestion}
                            onChange={(e) => setQuickQuestion(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && askQuickQuestion()}
                        />
                        <button 
                            className="btn-ask" 
                            onClick={askQuickQuestion}
                            disabled={isLoadingGemini || !quickQuestion.trim()}
                        >
                            {isLoadingGemini ? '⏳' : '🔍 Tìm'}
                        </button>
                        <button 
                            className="btn-close-ask"
                            onClick={() => setShowQuickAsk(false)}
                        >
                            ✖️
                        </button>
                    </div>
                </div>
            )}

            {showDeepSearch && (
                <div className="deep-search-form">
                    <h3>🎯 Tìm kiếm chuyên sâu</h3>
                    <p className="form-description">Nhập yêu cầu tìm kiếm và đính kèm URL (tùy chọn), AI sẽ phân tích và tìm tài liệu phù hợp</p>
                    <div className="deep-search-inputs">
                        <div className="prompt-input-wrapper">
                            <label>📝 Mô tả yêu cầu tìm kiếm:</label>
                            <textarea
                                placeholder="Ví dụ: Tìm các biểu mẫu báo cáo công việc hàng tháng của phòng kỹ thuật..."
                                value={deepSearchPrompt}
                                onChange={(e) => setDeepSearchPrompt(e.target.value)}
                                rows={3}
                                className="prompt-textarea"
                            />
                        </div>

                        <div className="url-input-wrapper">
                            <label>🔗 URL tham chiếu (tùy chọn):</label>
                            <div className="url-input-group">
                                <input
                                    type="url"
                                    placeholder="https://docs.google.com/... (Nhập URL Google Docs/Sheets)"
                                    value={referenceUrl}
                                    onChange={(e) => setReferenceUrl(e.target.value)}
                                    className="url-input"
                                />
                                <button
                                    className="btn-scrape"
                                    onClick={() => handlePreview(referenceUrl)}
                                    disabled={!referenceUrl.trim()}
                                    title="Xem trước và cào nội dung"
                                >
                                    👁️ Preview
                                </button>
                            </div>
                            <small className="input-hint">
                                💡 Nhập URL Google Docs/Sheets. Click "Preview" để xem trước. Hệ thống sẽ tự động cào nội dung khi tìm kiếm.
                            </small>
                            {scrapedContent && (
                                <div className="scraped-preview">
                                    <strong>📄 Nội dung đã cào ({scrapedContent.split(/\s+/).length} từ):</strong>
                                    <p>{scrapedContent.substring(0, 200)}...</p>
                                </div>
                            )}
                        </div>

                        <div className="filter-department">
                            <label>🏢 Tìm kiếm trong phạm vi:</label>
                            <select
                                value={deepSearchDepartment}
                                onChange={(e) => setDeepSearchDepartment(e.target.value)}
                                className="department-select"
                            >
                                <option value="all">Tất cả phòng ban</option>
                                {departments.slice(1).map(dept => (
                                    <option key={dept.value} value={dept.value}>
                                        {dept.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="deep-search-actions">
                            <button 
                                className="btn-search" 
                                onClick={handleDeepSearch}
                                disabled={isLoadingGemini || (!deepSearchPrompt.trim() && !referenceUrl.trim())}
                            >
                                {isLoadingGemini ? '⏳ Đang phân tích...' : '🔍 Tìm kiếm với AI'}
                            </button>
                            <button 
                                className="btn-cancel"
                                onClick={() => {
                                    setShowDeepSearch(false);
                                    setDeepSearchPrompt('');
                                    setReferenceUrl('');
                                    setDeepSearchDepartment('all');
                                }}
                            >
                                ✖️ Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="stats">
                <div className="stat-item">
                    <span className="stat-number">{links.length}</span>
                    <span className="stat-label">Tổng số links</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{filteredLinks.length}</span>
                    <span className="stat-label">Đang hiển thị</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{departments.length - 1}</span>
                    <span className="stat-label">Phòng ban</span>
                </div>
            </div>

            <div className="links-grid">
                {filteredLinks.length === 0 ? (
                    <div className="no-results">
                        <p>🔍 Không tìm thấy link nào phù hợp với tiêu chí tìm kiếm</p>
                    </div>
                ) : (
                    filteredLinks.map(link => (
                        <div key={link.id} className={`link-card ${link.type}`}>
                            <div className="card-header">
                                <span className="link-type">
                                    {linkTypes.find(t => t.value === link.type)?.icon} 
                                    {linkTypes.find(t => t.value === link.type)?.label}
                                </span>
                                <div className="header-right">
                                    <button
                                        className={`btn-favorite ${favoriteLinks.includes(link.id) ? 'favorited' : ''}`}
                                        onClick={() => toggleFavorite(link.id)}
                                        title={favoriteLinks.includes(link.id) ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                                    >
                                        {favoriteLinks.includes(link.id) ? '⭐' : '☆'}
                                    </button>
                                    <span className="department-badge">
                                        {departments.find(d => d.value === link.department)?.label}
                                    </span>
                                </div>
                            </div>
                            
                            <h3 className="link-title">{link.title}</h3>
                            <p className="link-description">{link.description}</p>
                            
                            <div className="card-footer">
                                <div className="link-info">
                                    <small>Thêm vào: {link.dateAdded}</small>
                                </div>
                                <div className="card-actions">
                                    <button
                                        className="btn-preview"
                                        onClick={() => handlePreview(link.url)}
                                        title="Xem trước"
                                    >
                                        👁️ Xem
                                    </button>
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-open"
                                        onClick={() => handleLinkClick(link.id)}
                                    >
                                        🔗 Mở
                                    </a>
                                    <button
                                        className="btn-delete"
                                        onClick={() => handleDeleteLink(link.id)}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Preview Popup */}
            {showPreview && (
                <div className="preview-overlay" onClick={closePreview}>
                    <div className="preview-container" onClick={(e) => e.stopPropagation()}>
                        <div className="preview-header">
                            <h3>👁️ Xem trước tài liệu</h3>
                            <button className="btn-close-preview" onClick={closePreview}>
                                ✖️ Đóng
                            </button>
                        </div>
                        <div className="preview-content">
                            {previewUrl ? (
                                <iframe
                                    src={previewUrl}
                                    title="Document Preview"
                                    className="preview-iframe"
                                    frameBorder="0"
                                    allowFullScreen
                                />
                            ) : (
                                <div className="preview-error">
                                    <p>❌ Không thể xem trước tài liệu này</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LinkManager;
