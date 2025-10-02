/**
 * Clean scraped content - remove excessive whitespace, tabs, newlines
 */
const cleanScrapedContent = (content) => {
    if (!content) return '';
    
    return content
        // Replace multiple tabs with single space
        .replace(/\t+/g, ' ')
        // Replace multiple spaces with single space
        .replace(/ +/g, ' ')
        // Replace multiple newlines with double newline
        .replace(/\n\n+/g, '\n\n')
        // Replace \r\n with \n
        .replace(/\r\n/g, '\n')
        // Remove lines that are just "0" repeated
        .replace(/^0+$/gm, '')
        // Remove empty lines with only whitespace
        .replace(/^\s*$/gm, '')
        // Trim each line
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
};

/**
 * Scrape content from Google Docs/Sheets via export API
 */
export const scrapeGoogleDocContent = async (url) => {
    try {
        let content = '';
        
        // Google Docs - export as plain text
        if (url.includes('docs.google.com/document')) {
            const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (match) {
                const docId = match[1];
                const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
                
                try {
                    const response = await fetch(exportUrl);
                    if (response.ok) {
                        const rawContent = await response.text();
                        content = cleanScrapedContent(rawContent);
                    }
                } catch (corsError) {
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
                        const rawContent = await response.text();
                        content = cleanScrapedContent(rawContent);
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

/**
 * Scrape content from multiple links in parallel
 */
export const scrapeMultipleLinks = async (linksToSearch) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 BƯỚC 1: Cào nội dung từ tất cả tài liệu (SONG SONG)');
    console.log(`   Số lượng: ${linksToSearch.length} tài liệu`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Create array of promises to scrape all links in parallel
    const scrapePromises = linksToSearch.map(async (linkItem, i) => {
        try {
            console.log(`\n[${i+1}/${linksToSearch.length}] Đang cào: ${linkItem.title}`);
            const rawContent = await scrapeGoogleDocContent(linkItem.url);
            
            if (rawContent && rawContent.length > 10) {
                console.log(`✅ Thành công - Length: ${rawContent.length} chars`);
                console.log(`   Preview (cleaned): ${rawContent.substring(0, 200)}...`);
                console.log(`   Full content logged below:`);
                console.log('─'.repeat(80));
                console.log(rawContent);
                console.log('─'.repeat(80));
                
                return {
                    id: linkItem.id,
                    title: linkItem.title,
                    url: linkItem.url,
                    department: linkItem.department,
                    type: linkItem.type,
                    content: rawContent,
                    fullContent: rawContent
                };
            } else {
                console.log(`⚠️ Không có nội dung hoặc bị CORS`);
                return null;
            }
        } catch (err) {
            console.error(`❌ Lỗi cào ${linkItem.url}:`, err.message);
            return null;
        }
    });
    
    // Execute all scraping operations in parallel
    const results = await Promise.all(scrapePromises);
    
    // Filter out null results (failed scrapes)
    const scrapedData = results.filter(item => item !== null);
    
    console.log(`\n📊 Tổng kết cào: ${scrapedData.length}/${linksToSearch.length} tài liệu thành công`);
    
    return scrapedData;
};

