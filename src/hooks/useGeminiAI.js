import { useState, useEffect } from 'react';
import { 
    searchLinksWithGemini, 
    askGeminiSpecificQuestion, 
    findLinksByCriteria, 
    deepSearchWithReference 
} from '../api/geminiApi';
import { getFriendlyGeminiError } from '../utils/textUtils';
import { applyMasking, revertMasking } from '../utils/privacyFilter';
import { scrapeMultipleLinks } from '../utils/contentScraper';
import { focusRelevantData } from '../utils/relevanceScorer';

/**
 * Custom hook to manage Gemini AI operations
 * @param {Function} canAccessLink - Function to check if user can access a link
 * @param {Object} user - Current logged in user
 */
export const useGeminiAI = (canAccessLink = () => true, user = null) => {
    const [geminiResponse, setGeminiResponse] = useState('');
    const [isLoadingGemini, setIsLoadingGemini] = useState(false);
    const [displayedLines, setDisplayedLines] = useState([]);
    const [geminiError, setGeminiError] = useState('');
    const [analyzingProgress, setAnalyzingProgress] = useState('');
    const [scrapedContent, setScrapedContent] = useState('');

    // Typing effect: display lines one by one
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

    const clearResponse = () => {
        setGeminiResponse('');
        setGeminiError('');
        setDisplayedLines([]);
    };

    const searchWithGemini = async (links, searchTerm, privacyFilters = []) => {
        if (!searchTerm.trim()) {
            setGeminiResponse('❌ Vui lòng nhập từ khóa tìm kiếm');
            return;
        }

        setIsLoadingGemini(true);
        setGeminiError('');
        
        try {
            const { masked: maskedQuery } = applyMasking(searchTerm, privacyFilters);
            const responseMasked = await searchLinksWithGemini(links, maskedQuery, privacyFilters);
            const response = revertMasking(responseMasked, privacyFilters);
            const shownQuery = revertMasking(maskedQuery, privacyFilters);
            setGeminiResponse(`🔍 **Kết quả tìm kiếm cho "${shownQuery}":**\n\n${response || 'Không có kết quả'}`);
        } catch (error) {
            console.error('Lỗi khi tìm kiếm với Gemini:', error);
            setGeminiError(getFriendlyGeminiError(error));
            setGeminiResponse('');
        } finally {
            setIsLoadingGemini(false);
        }
    };

    const askQuickQuestion = async (links, quickQuestion, privacyFilters = []) => {
        if (!quickQuestion.trim()) return;
        
        console.log(`\n❓ Quick Ask - Using all ${links.length} links metadata (no scraping)`);
        
        setIsLoadingGemini(true);
        setGeminiError('');
        
        try {
            // AI nhận metadata TẤT CẢ links (không cào content)
            const { masked: maskedQ } = applyMasking(quickQuestion, privacyFilters);
            const responseMasked = await askGeminiSpecificQuestion(maskedQ, links, privacyFilters);
            const response = revertMasking(responseMasked, privacyFilters);
            const shownQ = revertMasking(maskedQ, privacyFilters);
            setGeminiResponse(
                `**Câu hỏi:** ${shownQ}\n` +
                `**Phạm vi:** ${links.length} tài liệu\n\n` +
                `**Kết quả:**\n${response || 'Không tìm thấy kết quả'}`
            );
        } catch (error) {
            console.error('Error asking quick question:', error);
            setGeminiError(getFriendlyGeminiError(error));
            setGeminiResponse('');
        } finally {
            setIsLoadingGemini(false);
        }
    };

    const findByDepartment = async (links, departments, selectedDepartment, privacyFilters = []) => {
        if (selectedDepartment === 'all') {
            setGeminiResponse('❌ Vui lòng chọn một phòng ban cụ thể để tra cứu');
            return;
        }

        setIsLoadingGemini(true);
        setGeminiError('');
        
        try {
            const deptName = departments.find(d => d.value === selectedDepartment)?.label;
            const { masked: maskedCriteria } = applyMasking(`phòng ban ${deptName}`, privacyFilters);
            const responseMasked = await findLinksByCriteria(links, maskedCriteria, privacyFilters);
            const response = revertMasking(responseMasked, privacyFilters);
            setGeminiResponse(`**📋 Links của phòng ${deptName}:**\n\n${response || 'Không có links nào'}`);
        } catch (error) {
            console.error('Error finding links by department:', error);
            setGeminiError(getFriendlyGeminiError(error));
            setGeminiResponse('');
        } finally {
            setIsLoadingGemini(false);
        }
    };

    const handleDeepSearch = async (links, departments, deepSearchPrompt, deepSearchDepartment, privacyFilters = []) => {
        if (!deepSearchPrompt.trim()) {
            alert('Vui lòng nhập mô tả tìm kiếm');
            return false;
        }

        // Filter links by department (for prompt context)
        const linksToSearch = deepSearchDepartment === 'all' 
            ? links
            : links.filter(l => l.department === deepSearchDepartment);

        console.log(`\n📊 Deep Search Scope:`);
        console.log(`   Department filter: ${deepSearchDepartment === 'all' ? 'Tất cả' : departments.find(d => d.value === deepSearchDepartment)?.label}`);
        console.log(`   Total links for AI: ${linksToSearch.length}/${links.length}`);

        if (linksToSearch.length === 0) {
            alert('Không có tài liệu nào trong phạm vi đã chọn');
            return false;
        }

        setIsLoadingGemini(true);
        setGeminiError('');
        
        // Complex analysis progress effect
        const progressSteps = [
            '📥 Cào nội dung từ tất cả tài liệu (song song)...',
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
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`   Phạm vi: ${deepSearchDepartment === 'all' ? 'Tất cả phòng ban' : departments.find(d => d.value === deepSearchDepartment)?.label}`);
            
            // STEP 1: Parse permissions và filter by permissions for SCRAPING
            console.log(`\n🔐 Permission Filter for Scraping:`);
            console.log(`   User: ${user?.name || 'Unknown'} (${user?.role || 'no-role'})`);
            console.log(`   Total links in scope: ${linksToSearch.length}`);
            
            // Parse permissions (convert snake_case to camelCase and parse JSON strings)
            const linksWithParsedPermissions = linksToSearch.map(link => {
                let permissions = link.permissions || {};
                
                // Parse allowed_roles if it's a JSON string
                if (permissions && permissions.allowed_roles && typeof permissions.allowed_roles === 'string') {
                    try {
                        permissions = {
                            ...permissions,
                            allowedRoles: JSON.parse(permissions.allowed_roles)
                        };
                    } catch (e) {
                        console.error(`Error parsing permissions for ${link.title}:`, e);
                        permissions = {
                            ...permissions,
                            allowedRoles: ['admin', 'director']  // default
                        };
                    }
                } else if (permissions && permissions.allowed_roles && Array.isArray(permissions.allowed_roles)) {
                    // Already array, just rename
                    permissions = {
                        ...permissions,
                        allowedRoles: permissions.allowed_roles
                    };
                }
                
                // Add has_user_access from link object to permissions
                permissions = {
                    ...permissions,
                    has_user_access: link.has_user_access
                };
                
                return {
                    ...link,
                    permissions
                };
            });
            
            // Debug: Check each link
            if (process.env.NODE_ENV === 'development') {
                linksWithParsedPermissions.forEach((link, idx) => {
                    const hasAccess = canAccessLink(link.permissions);
                    console.log(`   [${idx + 1}] ${link.title}:`);
                    console.log(`       allowedRoles:`, link.permissions?.allowedRoles);
                    console.log(`       has_user_access:`, link.permissions?.has_user_access);
                    console.log(`       Full permissions:`, link.permissions);
                    console.log(`       Can access: ${hasAccess}`);
                });
            }
            
            const accessibleLinks = linksWithParsedPermissions.filter(link => canAccessLink(link.permissions));
            
            console.log(`\n   ✅ Links có quyền cào: ${accessibleLinks.length}/${linksToSearch.length}`);
            console.log(`   ❌ Blocked từ cào: ${linksToSearch.length - accessibleLinks.length}`);
            
            if (accessibleLinks.length === 0) {
                alert('Bạn không có quyền cào nội dung từ tài liệu nào trong phạm vi này');
                clearInterval(progressInterval);
                return false;
            }
            
            setAnalyzingProgress(`📥 Đang cào ${accessibleLinks.length}/${linksToSearch.length} tài liệu có quyền (song song)...`);
            
            // STEP 2: Scrape content ONLY from accessible links
            const scrapedData = await scrapeMultipleLinks(accessibleLinks);
            
            // STEP 3: Focus data by keywords from prompt
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔍 BƯỚC 3: Lọc data theo keyword từ prompt');
            console.log(`   Prompt: "${deepSearchPrompt.trim()}"`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            setAnalyzingProgress('🔍 Đang phân tích và lọc keyword...');
            
            const focusedData = focusRelevantData(scrapedData, deepSearchPrompt.trim());
            console.log(' focusedData', focusedData);
            
            // STEP 4: Get most relevant data as context
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎯 BƯỚC 4: Chọn data phù hợp nhất làm bối cảnh');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            setAnalyzingProgress('🎯 Đang tạo bối cảnh từ data phù hợp...');
            
            let contextData = '';
            if (focusedData.length > 0) {
                // Get top 3 most relevant data
                const topData = focusedData.slice(0, 3);
                
                contextData = '--- BỐI CẢNH TỪ DATA ĐÃ CÀO ---\n\n';
                topData.forEach((item, idx) => {
                    // Mask title and content with privacy filters before sending to AI
                    const maskedTitle = applyMasking(item.title || '', privacyFilters).masked;
                    const maskedContent = applyMasking(item.content || '', privacyFilters).masked;
                    contextData += `[${idx + 1}] ${maskedTitle} (Độ khớp: ${item.relevanceScore}%)\n`;
                    contextData += `${maskedContent}\n\n`;
                    console.log(`  ✅ Chọn #${idx + 1}: ${item.title} (${item.relevanceScore}%)`);
                });
                
                setScrapedContent(contextData);
            } else {
                console.log('  ⚠️ Không có data nào đủ điểm liên quan (>20%)');
                contextData = '--- Không tìm thấy data liên quan từ các tài liệu đã cào ---\n';
            }
            console.log(' contextData', contextData);
            
            // Combine prompt with context
            // Mask sensitive data in prompt + context before sending to AI
            let finalPrompt = deepSearchPrompt.trim();
            if (contextData) {
                finalPrompt = `${finalPrompt}\n\n${contextData}`;
            }
            const { masked: maskedPrompt } = applyMasking(finalPrompt, privacyFilters);
            console.log(' finalPrompt (masked)', maskedPrompt);
            
            // STEP 5: Send to AI
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📤 BƯỚC 5: Gửi prompt + context cho AI');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            setAnalyzingProgress('⚡ AI đang phân tích...');
            
            const responseMasked = await deepSearchWithReference(
                linksToSearch, 
                '', // Don't use referenceUrl anymore
                maskedPrompt,
                privacyFilters
            );
            const response = revertMasking(responseMasked, privacyFilters);
            
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
                `📊 **Metadata AI nhìn thấy:** ${linksToSearch.length} tài liệu\n` +
                `🔐 **Data được cào:** ${accessibleLinks.length}/${linksToSearch.length} tài liệu có quyền\n` +
                `🎯 **Data phù hợp:** ${focusedData.length} tài liệu (>20% khớp)\n` +
                `📋 **Phạm vi:** ${deptLabel}\n\n` +
                `---\n\n${response}`
            );
            
            setScrapedContent('');
            
            return true;
        } catch (error) {
            clearInterval(progressInterval);
            setAnalyzingProgress('');
            console.error('Error in deep search:', error);
            setGeminiError(getFriendlyGeminiError(error));
            setGeminiResponse('');
            
            return false;
        } finally {
            setIsLoadingGemini(false);
        }
    };

    return {
        geminiResponse,
        isLoadingGemini,
        displayedLines,
        geminiError,
        analyzingProgress,
        scrapedContent,
        clearResponse,
        searchWithGemini,
        askQuickQuestion,
        findByDepartment,
        handleDeepSearch
    };
};

