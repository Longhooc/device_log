// Gemini AI API Service
// Lấy API key và model từ localStorage; fallback về biến môi trường/giá trị mặc định
import { applyMasking } from '../utils/privacyFilter';

// Utility function để handle các edge cases trên nginx deployment
const safeStringCompare = (str1, str2) => {
    try {
        if (str1 === null || str1 === undefined || str2 === null || str2 === undefined) {
            return false;
        }
        return String(str1).trim().toLowerCase() === String(str2).trim().toLowerCase();
    } catch (error) {
        console.error('Error in string comparison:', error);
        return false;
    }
};

// Utility function để safely get localStorage item
const safeGetItem = (storage, key, defaultValue = null) => {
    try {
        if (!storage || !key) return defaultValue;
        const value = storage.getItem(key);
        return value !== null ? value : defaultValue;
    } catch (error) {
        console.error(`Error getting localStorage item ${key}:`, error);
        return defaultValue;
    }
};

const getLocalStorage = () => {
    try {
        // Check if we're in browser environment
        if (typeof window === 'undefined' || !window.localStorage) {
            console.log('localStorage not available - not in browser or localStorage disabled');
            return null;
        }

        // Test localStorage access
        const testKey = '__localStorage_test__';
        window.localStorage.setItem(testKey, 'test');
        window.localStorage.removeItem(testKey);

        console.log('localStorage access test successful');
        return window.localStorage;
    } catch (error) {
        console.error('localStorage access failed:', error);
        return null;
    }
};

const DEFAULT_GEMINI_API_URL = 'https://generativelanguage.googleapis.com';

const getConfiguredApiUrl = () => {
    const apiUrl = process.env.REACT_APP_GEMINI_API_URL || DEFAULT_GEMINI_API_URL;
    return String(apiUrl).replace(/\/+$/, '');
};

const isOpenAICompatibleApi = (apiUrl) => {
    const normalizedUrl = String(apiUrl || '').toLowerCase();
    return normalizedUrl.includes('/v1') && !normalizedUrl.includes('googleapis.com');
};

const getTextFromAiResponse = (data) => {
    if (data?.choices?.length > 0) {
        return data.choices[0]?.message?.content || data.choices[0]?.text || '';
    }

    if (data?.candidates?.length > 0) {
        return data.candidates[0]?.content?.parts?.[0]?.text || '';
    }

    return '';
};

const getActiveApiKey = () => {
    const ls = getLocalStorage();
    const fallbackKey = process.env.REACT_APP_GEMINI_API_KEY;

    console.log('getActiveApiKey - localStorage available:', !!ls);
    console.log('getActiveApiKey - fallback key available:', !!fallbackKey);

    if (fallbackKey) {
        console.log('Using API key from environment');
        return fallbackKey;
    }

    if (!ls) {
        console.log('Using fallback API key from environment');
        return fallbackKey;
    }

    try {
        const keysStr = ls.getItem('gemini.api.keys');
        const selectedId = ls.getItem('gemini.api.selectedKeyId') || '';

        console.log('Keys from localStorage:', keysStr);
        console.log('Selected ID:', selectedId);

        if (!keysStr) {
            console.log('No keys in localStorage, using fallback');
            return fallbackKey;
        }

        const keys = JSON.parse(keysStr);
        const found = keys.find(k => k.id === selectedId);

        if (found && found.value) {
            console.log('Using selected API key from localStorage');
            return found.value;
        }

        console.log('No valid key found, using fallback');
        return fallbackKey;
    } catch (error) {
        console.error('Error accessing API keys from localStorage:', error);
        console.log('Falling back to environment key');
        return fallbackKey;
    }
};

const getModelFor = (feature /* 'quick' | 'smart' */) => {
    const ls = getLocalStorage();
    const defaultModel = process.env.REACT_APP_GEMINI_MODEL || 'gemini-flash-lite-latest';

    if (process.env.REACT_APP_GEMINI_MODEL) {
        console.log('Using model from environment:', defaultModel);
        return defaultModel;
    }

    // Debug logging for nginx deployment
    console.log('getModelFor called with feature:', feature, 'type:', typeof feature);
    console.log('localStorage available:', !!ls);

    if (!ls) {
        console.log('localStorage not available, using default model:', defaultModel);
        return defaultModel;
    }

    try {
        // Use safe string comparison
        if (safeStringCompare(feature, 'quick')) {
            const quickModel = safeGetItem(ls, 'gemini.model.quick', defaultModel);
            console.log('Quick model from localStorage:', quickModel);
            return quickModel;
        }
        if (safeStringCompare(feature, 'smart')) {
            const smartModel = safeGetItem(ls, 'gemini.model.smart', defaultModel);
            console.log('Smart model from localStorage:', smartModel);
            return smartModel;
        }

        console.log('Unknown feature, using default model:', defaultModel);
        return defaultModel;
    } catch (error) {
        console.error('Error accessing localStorage in getModelFor:', error);
        console.log('Falling back to default model:', defaultModel);
        return defaultModel;
    }
};

const buildApiUrl = (model, apiKey) => {
    const apiUrl = getConfiguredApiUrl();

    if (isOpenAICompatibleApi(apiUrl)) {
        return `${apiUrl}/chat/completions`;
    }

    const geminiApiVersion = apiUrl.endsWith('/v1') ? 'v1' : 'v1beta';
    const baseUrl = apiUrl.includes('googleapis.com') ? DEFAULT_GEMINI_API_URL : apiUrl;
    return `${baseUrl}/${geminiApiVersion}/models/${model}:generateContent?key=${apiKey}`;
};

const callAiApi = async (prompt, model, apiKey, generationConfig = {}, safetySettings = null) => {
    const apiUrl = getConfiguredApiUrl();
    const url = buildApiUrl(model, apiKey);
    const useOpenAICompatibleApi = isOpenAICompatibleApi(apiUrl);

    const response = await fetch(url, {
        method: 'POST',
        headers: useOpenAICompatibleApi
            ? {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
            : { 'Content-Type': 'application/json' },
        body: JSON.stringify(
            useOpenAICompatibleApi
                ? {
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: generationConfig.temperature ?? 0.7,
                    top_p: generationConfig.topP ?? 0.95,
                    max_tokens: generationConfig.maxOutputTokens ?? 12048
                }
                : {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 12048,
                        ...generationConfig
                    },
                    ...(safetySettings ? { safetySettings } : {})
                }
        )
    });

    if (!response.ok) {
        let errorMessage = response.statusText;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorData.message || JSON.stringify(errorData);
        } catch (_) {
            errorMessage = await response.text();
        }
        throw new Error(`AI API error (${response.status}): ${errorMessage || response.statusText}`);
    }

    const data = await response.json();
    const text = getTextFromAiResponse(data);

    if (!text) {
        throw new Error('No response generated from AI API');
    }

    return text;
};

/**
 * Search and find relevant links using Gemini AI (smart search)
 */
export const searchLinksWithGemini = async (links, searchQuery = '', privacyFilters = []) => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
        throw new Error('Gemini API key is not configured. Please set in Settings or REACT_APP_GEMINI_API_KEY.');
    }
    const model = getModelFor('defaultModel');

    try {
        const maskedLinks = maskLinksArray(links, privacyFilters);
        const maskedQuery = applyMasking(searchQuery, privacyFilters).masked;
        const prompt = createSearchPrompt(maskedLinks, maskedQuery);
        return await callAiApi(
            prompt,
            model,
            apiKey,
            { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 12048 },
            [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
            ]
        );
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
   - URL: ${link.url || '[Locked]'}
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
    const model = getModelFor('defaultModel');

    try {
        const maskedLinks = maskLinksArray(links, privacyFilters);
        const maskedQuestion = applyMasking(question, privacyFilters).masked;
        let prompt = `
Bạn là trợ lý tra cứu links. Dựa vào danh sách links có sẵn, hãy tìm những links phù hợp với yêu cầu.

YÊU CẦU TRA CỨU: "${maskedQuestion}"
HƯỚNG DẪN:
- CHỈ trả lời về các links có trong danh sách trên (có url đính kèm)
- KHÔNG đưa ra lời khuyên hay gợi ý chung
- Nếu không tìm thấy, nói "Không tìm thấy link phù hợp"
- Trả lời ngắn gọn, chỉ liệt kê links liên quan
DANH SÁCH LINKS CÓ SẴN:
${maskedLinks.map((link, index) => `${index + 1}. "${link.title}" 
   - Phòng ban: ${link.department}
   - Loại: ${link.type} 
   - Mô tả: ${link.description || 'Không có'}
   - URL: ${link.url || '[Locked]'}`).join('\n\n')}

`;

        return await callAiApi(prompt, model, apiKey, {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 10024,
        });
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
${maskedLinks.map((link, i) => `${i + 1}. "${link.title}"
   - Phòng ban: ${link.department}
   - Loại: ${link.type}
   - Mô tả: ${link.description || 'Không có'}
   - URL: ${link.url || '[Locked]'}`).join('\n\n')}

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
    const model = getModelFor('defaultModel');

    try {
        // Kiểm tra xem searchContext có chứa nội dung đã cào không
        const hasScrapedContent = searchContext && searchContext.includes('--- NỘI DUNG TÀI LIỆU THAM CHIẾU ---');

        const maskedLinks = maskLinksArray(links, privacyFilters);
        let prompt = `
Bạn là chuyên gia phân tích và so sánh tài liệu. 

${searchContext ? `${searchContext}\n` : ''}

DANH SÁCH TÀI LIỆU CẦN SO SÁNH:
${maskedLinks.map((link, i) => `${i + 1}. "${link.title}"
   - URL: ${link.url || '[Locked]'}
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

        return await callAiApi(prompt, model, apiKey, {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 12048,
        });
    } catch (error) {
        console.error('Error in deep search:', error);
        throw error;
    }
};

/**
 * Ask Gemini for customer support style answer with a provided prompt
 * The prompt should already include company context and user question
 */
export const askCustomerSupport = async (prompt) => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
        throw new Error('Gemini API key is not configured.');
    }
    const model = getModelFor('smart');

    try {
        return await callAiApi(prompt, model, apiKey, {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 12048,
        });
    } catch (error) {
        console.error('Error asking customer support:', error);
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
        return await callAiApi(prompt, model, apiKey, {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 12048,
        });
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
