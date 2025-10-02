/**
 * Calculate relevance score between prompt and content (keyword matching)
 */
export const calculateRelevanceScore = (prompt, content) => {
    if (!prompt || !content) return 0;
    
    // Normalize text: lowercase, remove punctuation
    const normalizeText = (text) => text.toLowerCase()
        .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2); // Remove too short words

    const promptWords = normalizeText(prompt);
    const contentWords = normalizeText(content);
    
    // Count matching words
    let matchCount = 0;
    const contentSet = new Set(contentWords);
    
    promptWords.forEach(word => {
        if (contentSet.has(word)) {
            matchCount++;
        }
    });
    
    // Calculate match ratio
    const score = promptWords.length > 0 ? (matchCount / promptWords.length) * 100 : 0;
    return Math.round(score);
};

/**
 * Focus and filter data by keywords from prompt
 */
export const focusRelevantData = (scrapedData, prompt) => {
    console.log('🔍 Bắt đầu focus data theo prompt:', prompt);
    
    // Calculate score for each data item
    const scoredData = scrapedData.map(item => {
        const score = calculateRelevanceScore(prompt, item.content);
        console.log(`  📊 ${item.title}: ${score}% khớp`);
        return { ...item, relevanceScore: score };
    });
    
    // Sort by score descending
    const sorted = scoredData.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Filter data with score > 20% (relevant)
    const relevant = sorted.filter(item => item.relevanceScore > 20);
    
    console.log(`✨ Kết quả: ${relevant.length}/${scrapedData.length} tài liệu phù hợp`);
    
    return relevant;
};

