// Gemini AI API Service
// Lấy API key và model từ localStorage; fallback về biến môi trường/giá trị mặc định
import { applyMasking } from '../utils/privacyFilter';

const getLocalStorage = () => {
    try {
        return window?.localStorage;
    } catch (_) {
        return null;
    }
};

const getActiveApiKey = () => {
    const ls = getLocalStorage();
    if (!ls) return process.env.REACT_APP_GEMINI_API_KEY;
    try {
        const keys = JSON.parse(ls.getItem('gemini.api.keys') || '[]');
        const selectedId = ls.getItem('gemini.api.selectedKeyId') || '';
        const found = keys.find(k => k.id === selectedId);
        return (found && found.value) || process.env.REACT_APP_GEMINI_API_KEY;
    } catch (_) {
        return process.env.REACT_APP_GEMINI_API_KEY;
    }
};

const getModelFor = (feature /* 'quick' | 'smart' */) => {
    const ls = getLocalStorage();
    const defaultModel = 'gemini-flash-lite-latest';
    if (!ls) return defaultModel;
    try {
        if (feature === 'quick') {
            return ls.getItem('gemini.model.quick') || defaultModel;
        }
        if (feature === 'smart') {
            return ls.getItem('gemini.model.smart') || defaultModel;
        }
        return defaultModel;
    } catch (_) {
        return defaultModel;
    }
};

const buildApiUrl = (model, apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

/**
 * Search and find relevant links using Gemini AI (smart search)
 */
export const searchLinksWithGemini = async (links, searchQuery = '', privacyFilters = []) => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
        throw new Error('Gemini API key is not configured. Please set in Settings or REACT_APP_GEMINI_API_KEY.');
    }
    const model = getModelFor('smart');

    try {
        const maskedLinks = maskLinksArray(links, privacyFilters);
        const maskedQuery = applyMasking(searchQuery, privacyFilters).masked;
        const prompt = createSearchPrompt(maskedLinks, maskedQuery);
        const url = buildApiUrl(model, apiKey);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 12048,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content?.parts?.[0]?.text || '';
        } else {
            throw new Error('No response generated from Gemini AI');
        }
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
};

/**
 * Create a search prompt to find relevant links
 * @param {Array} links - Array of link objects
 * @param {string} searchQuery - User's search query
 * @returns {string} - Formatted prompt
 */
const createSearchPrompt = (links, searchQuery) => {
    return `
Bạn là một trợ lý tra cứu thông tin. Dựa vào danh sách các links Google Docs/Sheets/Forms sau đây, hãy tìm và trả về CHÍNH XÁC những links liên quan đến câu hỏi của người dùng.

DANH SÁCH LINKS HIỆN CÓ:
${links.map((link, index) => 
    `${index + 1}. Tiêu đề: "${link.title}"
   - Phòng ban: ${link.department}
   - Loại: ${link.type}
   - Mô tả: ${link.description || 'Không có mô tả'}
   - URL: ${link.url || '[URL bị ẩn - Không có quyền truy cập]'}
   - Ngày thêm: ${link.dateAdded}`
).join('\n\n')}

CÂU HỎI/YÊU CẦU TRA CỨU: "${searchQuery}"

HƯỚNG DẪN TRA CỨU:
- CHỈ trả về những links có liên quan trực tiếp đến câu hỏi
- KHÔNG đưa ra gợi ý chung chung hay lời khuyên
- KHÔNG trả lời những câu hỏi không liên quan đến các links có sẵn
- Nếu không tìm thấy link nào phù hợp, hãy nói rõ "Không tìm thấy link nào phù hợp"
- Format trả lời: Liệt kê các link phù hợp với tiêu đề, phòng ban, mô tả ngắn gọn

Trả lời bằng tiếng Việt:
`;
};

/**
 * Group links by department
 * @param {Array} links - Array of link objects
 * @returns {Object} - Links grouped by department
 */
const groupLinksByDepartment = (links) => {
    return links.reduce((acc, link) => {
        if (!acc[link.department]) {
            acc[link.department] = [];
        }
        acc[link.department].push(link);
        return acc;
    }, {});
};

/**
 * Group links by type
 * @param {Array} links - Array of link objects
 * @returns {Object} - Links grouped by type
 */
const groupLinksByType = (links) => {
    return links.reduce((acc, link) => {
        if (!acc[link.type]) {
            acc[link.type] = 0;
        }
        acc[link.type]++;
        return acc;
    }, {});
};

/**
 * Ask Gemini to search for specific links based on criteria (quick)
 */


/**
 * Ask Gemini to search for specific links based on criteria (quick)
 * Supports optional privacyFilters to mask sensitive fields in links and question
 */
export const askGeminiSpecificQuestion = async (question, links = [], privacyFilters = []) => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
        throw new Error('Gemini API key is not configured.');
    }
    const model = getModelFor('quick');

    try {
        const maskedLinks = maskLinksArray(links, privacyFilters);
        const maskedQuestion = applyMasking(question, privacyFilters).masked;
        let prompt = `
Bạn là trợ lý tra cứu links. Dựa vào danh sách links có sẵn, hãy tìm những links phù hợp với yêu cầu.

YÊU CẦU TRA CỨU: "${maskedQuestion}"

DANH SÁCH LINKS CÓ SẴN:
${maskedLinks.map((link, index) => `${index + 1}. "${link.title}" 
   - Phòng ban: ${link.department}
   - Loại: ${link.type} 
   - Mô tả: ${link.description || 'Không có'}
   - URL: ${link.url || '[URL bị ẩn - Không có quyền truy cập]'}`).join('\n\n')}

HƯỚNG DẪN:
- CHỈ trả lời về các links có trong danh sách trên
- KHÔNG đưa ra lời khuyên hay gợi ý chung
- Nếu không tìm thấy, nói "Không tìm thấy link phù hợp"
- Trả lời ngắn gọn, chỉ liệt kê links liên quan`;

        const url = buildApiUrl(model, apiKey);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 10024,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
        console.error('Error asking Gemini specific question:', error);
        throw error;
    }
};

/**
 * Find links by department or type using Gemini AI (smart)
 */
export const findLinksByCriteria = async (links, criteria, privacyFilters = []) => {
    const maskedLinks = maskLinksArray(links, privacyFilters);
    const maskedCriteria = applyMasking(criteria, privacyFilters).masked;
    const prompt = `
Dựa vào danh sách ${links.length} links sau đây, hãy tìm những links phù hợp với tiêu chí: "${criteria}"

DANH SÁCH LINKS:
${maskedLinks.map((link, i) => `${i+1}. "${link.title}"
   - Phòng ban: ${link.department}
   - Loại: ${link.type}
   - Mô tả: ${link.description || 'Không có'}
   - URL: ${link.url || '[URL bị ẩn - Không có quyền truy cập]'}`).join('\n\n')}

YÊU CẦU:
- CHỈ liệt kê những links khớp với tiêu chí "${maskedCriteria}"
- KHÔNG thêm gợi ý hay lời khuyên
- Nếu không tìm thấy, trả lời "Không có link nào phù hợp với tiêu chí này"
- Format: Số thứ tự, tên link, phòng ban, loại

Trả lời bằng tiếng Việt:
`;

    return await callGeminiWithPrompt(prompt, 'smart');
};

/**
 * Tìm kiếm chuyên sâu với link tài liệu đính kèm
 * @param {Array} links - Danh sách links hiện có
 * @param {string} referenceUrl - URL tài liệu tham chiếu
 * @param {string} searchContext - Bối cảnh tìm kiếm (tùy chọn)
 * @returns {Promise<string>} - Kết quả phân tích độ khớp
 */
export const deepSearchWithReference = async (links, referenceUrl = '', searchContext = '', privacyFilters = []) => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
        throw new Error('Gemini API key is not configured.');
    }
    const model = getModelFor('smart');

    try {
        // Kiểm tra xem searchContext có chứa nội dung đã cào không
        const hasScrapedContent = searchContext && searchContext.includes('--- NỘI DUNG TÀI LIỆU THAM CHIẾU ---');
        
        const maskedLinks = maskLinksArray(links, privacyFilters);
        let prompt = `
Bạn là chuyên gia phân tích và so sánh tài liệu. 

${searchContext ? `${searchContext}\n` : ''}

DANH SÁCH TÀI LIỆU CẦN SO SÁNH:
${maskedLinks.map((link, i) => `${i+1}. "${link.title}"
   - URL: ${link.url || '[URL bị ẩn - Không có quyền truy cập]'}
   - Phòng ban: ${link.department}
   - Loại: ${link.type}
   - Mô tả: ${link.description || 'Không có mô tả'}`).join('\n\n')}

YÊU CẦU PHÂN TÍCH:
1. ${hasScrapedContent ? 'Dựa vào NỘI DUNG TÀI LIỆU THAM CHIẾU ở trên để hiểu chủ đề, mục đích' : 'Phân tích yêu cầu tìm kiếm'}
2. So sánh nội dung/yêu cầu với DANH SÁCH TÀI LIỆU CẦN SO SÁNH
3. XẾP HẠNG các tài liệu theo độ khớp (cao → thấp)
4. CHỈ hiển thị những tài liệu CÓ liên quan (>30% độ khớp)
5. Tài liệu KHÔNG liên quan KHÔNG được liệt kê

FORMAT TRẢ LỜI:
🏆 **XẾP HẠNG ĐỘ KHỚP:**

**#1 - Tên tài liệu (Độ khớp: XX%)**
📌 Nội dung khớp: [Tóm tắt ngắn gọn nội dung/mục đích tương đồng]
🔗 URL: [link]

**#2 - Tên tài liệu (Độ khớp: XX%)**
📌 Nội dung khớp: [Tóm tắt...]
🔗 URL: [link]

[Tiếp tục với các tài liệu khác nếu có...]

📊 **TỔNG KẾT:**
- Tìm thấy X tài liệu liên quan
- Không tìm thấy tài liệu phù hợp nào (nếu không có)

Trả lời bằng tiếng Việt, ngắn gọn, chỉ hiển thị thông tin quan trọng:
`;

        const url = buildApiUrl(model, apiKey);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 12048,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Không tìm thấy tài liệu nào phù hợp.';
    } catch (error) {
        console.error('Error in deep search:', error);
        throw error;
    }
};

/**
 * Helper function to call Gemini with a custom prompt
 */
const callGeminiWithPrompt = async (prompt, feature = 'smart') => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
        throw new Error('Gemini API key is not configured.');
    }
    const model = getModelFor(feature);

    try {
        const url = buildApiUrl(model, apiKey);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 12048,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
        console.error('Error calling Gemini:', error);
        throw error;
    }
};

// Helpers to mask link fields by privacy filters
const maskLink = (link, rules = []) => {
    if (!link) return link;
    return {
        ...link,
        title: applyMasking(link.title || '', rules).masked,
        description: applyMasking(link.description || '', rules).masked,
        url: applyMasking(link.url || '', rules).masked,
        department: applyMasking(link.department || '', rules).masked,
        type: applyMasking(link.type || '', rules).masked
    };
};

const maskLinksArray = (links = [], rules = []) => links.map(l => maskLink(l, rules));
