# 🔐 AI Search với Permissions (Chỉ Filter Khi Cào)

## 🎯 Tính năng mới

### **1. Smart Permission Filter**
- ✅ **Quick Ask**: AI nhận metadata TẤT CẢ links (không cào content)
- ✅ **Deep Search**: AI nhận metadata tất cả, **CHỈ cào content** từ links có quyền
- ✅ Log chi tiết: metadata vs scraped, user, role
- ✅ Phân biệt rõ: "AI nhìn thấy" vs "Được cào"

### **2. Data Cleaning**
- ✅ Loại bỏ tabs thừa (`\t\t\t...` → ` `)
- ✅ Loại bỏ newlines thừa (`\r\n\r\n...` → `\n\n`)
- ✅ Loại bỏ dòng chỉ có số 0 (`0\t\t0\t\t0` → removed)
- ✅ Loại bỏ whitespace thừa
- ✅ Trim mỗi dòng

### **3. Enhanced Logging**
- ✅ Log full scraped content với separator
- ✅ Log permission filtering: accessible vs total
- ✅ Log user info: name, role, department
- ✅ Log cleaned data preview (200 chars)

---

## 📝 Cách hoạt động

### **Flow 1: Quick Ask (Hỏi nhanh)**

```
User: Employee "Nguyễn Văn A"
Input: "Danh sách thiết bị phòng IT?"

1. AI nhận metadata:
   - Total links: 10
   - AI thấy: metadata 10 links (title, url, department, type)

2. Không cào content:
   - Quick Ask KHÔNG cào nội dung
   - AI trả lời dựa trên metadata (title, description)

3. Response:
   "Câu hỏi: Danh sách thiết bị phòng IT?
    Phạm vi: 10 tài liệu
    
    Kết quả:
    [AI response từ metadata 10 links]"
```

### **Flow 2: Deep Search (Tìm kiếm sâu)**

```
User: Manager "Trần Thị B"
Input: "Tìm thông tin về tuyển dụng"
Department: "Nhân sự"

1. Department Filter:
   - Total links: 10
   - Filter by dept "Nhân sự": 5 links
   - AI nhận metadata: 5 links

2. Permission Filter (CHỈ cho scraping):
   - Trong 5 links Nhân sự
   - Manager có quyền cào: 4 links
   - Blocked từ cào: 1 link (admin only)

3. Scraping:
   - Cào nội dung từ 4 links có quyền
   - Clean data (remove tabs, newlines, etc.)
   - Log full content

4. Keyword Filtering:
   - Extract keywords: "tuyển dụng", "nhân viên"
   - Filter relevant data (>20% match)
   - Select top 3 most relevant

5. AI Analysis:
   - Metadata: 5 links (title, department, etc.)
   - Context: Content từ 4 links đã cào
   - Prompt: User query + metadata + content
   - Response: AI answer
```

---

## 🔧 Code Changes

### **1. `src/hooks/useGeminiAI.js`**

**Không filter permissions cho metadata, CHỈ filter khi scrape:**

**Quick Ask:**
```javascript
const askQuickQuestion = async (links, quickQuestion, privacyFilters = []) => {
    // AI nhận metadata TẤT CẢ links (không cào content)
    console.log(`❓ Quick Ask - Using all ${links.length} links metadata (no scraping)`);
    
    const responseMasked = await askGeminiSpecificQuestion(maskedQ, links, privacyFilters);
    // ...
}
```

**Deep Search:**
```javascript
const handleDeepSearch = async (links, departments, deepSearchPrompt, deepSearchDepartment, privacyFilters = []) => {
    // BƯỚC 1: Filter by department (for metadata)
    const linksToSearch = deepSearchDepartment === 'all' 
        ? links
        : links.filter(l => l.department === deepSearchDepartment);
    
    console.log(`📊 Total links for AI: ${linksToSearch.length}`);
    
    // BƯỚC 2: Filter by permissions (CHỈ cho scraping)
    const accessibleLinks = linksToSearch.filter(link => canAccessLink(link.permissions));
    
    console.log(`🔐 Permission Filter for Scraping:`);
    console.log(`   Links to scrape: ${accessibleLinks.length}/${linksToSearch.length}`);
    console.log(`   Blocked from scraping: ${linksToSearch.length - accessibleLinks.length}`);
    
    // BƯỚC 3: Scrape ONLY accessible links
    const scrapedData = await scrapeMultipleLinks(accessibleLinks);
    
    // AI nhận:
    // - Metadata: linksToSearch (tất cả trong dept)
    // - Content: scrapedData (chỉ có quyền)
}
```

### **2. `src/utils/contentScraper.js`**

**Thêm clean function:**
```javascript
const cleanScrapedContent = (content) => {
    return content
        .replace(/\t+/g, ' ')         // Tabs → space
        .replace(/ +/g, ' ')          // Multiple spaces → single
        .replace(/\n\n+/g, '\n\n')    // Multiple newlines → double
        .replace(/\r\n/g, '\n')       // Windows newlines → Unix
        .replace(/^0+$/gm, '')        // Remove "0" lines
        .replace(/^\s*$/gm, '')       // Remove empty lines
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
};
```

**Áp dụng cleaning:**
```javascript
const rawContent = await response.text();
content = cleanScrapedContent(rawContent);
```

**Enhanced logging:**
```javascript
console.log(`✅ Thành công - Length: ${rawContent.length} chars`);
console.log(`   Preview (cleaned): ${rawContent.substring(0, 200)}...`);
console.log(`   Full content logged below:`);
console.log('─'.repeat(80));
console.log(rawContent);  // Full content
console.log('─'.repeat(80));
```

### **3. `src/pages/LinkManager.jsx`**

**Pass permissions vào hook:**
```javascript
const { user, hasPermission, canAccessLink, canPreviewLink } = useAuth();
const gemini = useGeminiAI(canAccessLink, user);
```

---

## 📊 Console Logs

### **Quick Ask Example:**

```
❓ Quick Ask - Using all 10 links metadata (no scraping)
```

### **Deep Search Example:**

```
📊 Deep Search Scope:
   Department filter: Nhân sự
   Total links for AI: 5/10

🔐 Permission Filter for Scraping:
   User: Trần Thị B (manager)
   Links to scrape: 4/5
   Blocked from scraping: 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 BƯỚC 1: Cào nội dung từ tất cả tài liệu (SONG SONG)
   Số lượng: 4 tài liệu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/4] Đang cào: Danh sách thiết bị IT
✅ Thành công - Length: 1234 chars
   Preview (cleaned): Danh sách thiết bị phòng IT...
   Full content logged below:
────────────────────────────────────────────────────────────────────────────────
Danh sách thiết bị phòng IT
STT Tên thiết bị Mã số Serial
1 Laptop Dell ABC123
2 Màn hình LG XYZ456
────────────────────────────────────────────────────────────────────────────────
```

---

## 🧪 Testing

### **Test Case 1: Quick Ask với tất cả links**

**Quick Ask:**
```
Input: "Danh sách thiết bị?"
Expected: 
- Search trong 10/10 links (tất cả)
- Show "Tài liệu: 10 links"
- AI trả lời từ tất cả data
```

### **Test Case 2: Deep Search filter theo department**

**Deep Search:**
```
Input: "Tìm thông tin laptop"
Department: "IT"
Expected: 
- Total: 10 links
- Filter dept "IT": 3 links
- Scrape: 3 links
- Result: AI answer từ 3 links trong IT
```

### **Test Case 3: Deep Search tất cả departments**

**Deep Search:**
```
Input: "Tìm doanh thu"
Department: "Tất cả"
Expected: 
- Total: 10 links
- Filter: Không filter
- Scrape: 10 links
- Result: AI answer từ tất cả data
```

### **Test Case 3: Data Cleaning**

**Before:**
```
STT\t\t\t\tTên\t\t\t\tGiá
0\t\t\t\t\t\t\t\t\t\t0\t\t\t\t\t0\r\n\r\n
1\t\tLaptop\t\t10000000
```

**After:**
```
STT Tên Giá
1 Laptop 10000000
```

---

## ✅ Benefits

1. **Smart Filtering**: AI thấy metadata tất cả, chỉ cào content có quyền
2. **Security**: Nội dung nhạy cảm không bị cào bởi unauthorized users
3. **Clean Data**: Loại bỏ noise, AI dễ hiểu hơn
4. **Transparency**: Phân biệt rõ "metadata" vs "content"
5. **Debug-friendly**: Full logging để troubleshoot

---

## 📝 Notes

- **Metadata không filter** → AI biết tất cả links tồn tại (title, type, department)
- **Content có filter** → AI chỉ cào nội dung từ links có quyền
- **Quick Ask**: Không cào content, chỉ dùng metadata
- **Deep Search**: Cào content + metadata, filter permissions khi cào
- **Data cleaning** áp dụng cho cả Docs và Sheets
- **Logging** full content để debug
- **Permissions áp dụng** cho:
  - ✅ UI (LinkCard) - show/hide buttons
  - ✅ Scraping (Deep Search) - cào content
  - ❌ Metadata (AI prompt) - không filter

---

## 🚀 Next Steps

1. Test với real data từ Google Docs/Sheets
2. Verify permissions hoạt động đúng cho tất cả roles
3. Check logs trong Console (F12)
4. Điều chỉnh clean function nếu cần (thêm patterns)

