document.addEventListener('DOMContentLoaded', function() {

    const dataURL = 'data.csv';
    
    const placeholderImageURL = 'images/image001.jpg';

    const portfolioGrid = document.getElementById('portfolio-grid');
    
    // 獲取 DOM 元素
    const searchBar = document.getElementById('search-bar');
    const categoryDropdown = document.getElementById('category-dropdown');
    // 【新增】獲取標籤雲容器
    const tagCloudContainer = document.getElementById('tag-cloud-container'); 
    
    let allItems = []; // 儲存所有從 CSV 讀取的資料
    
    // 【新增】儲存目前選中的分類（標籤雲和下拉選單共用狀態）
    let currentSelectedCategory = '全部'; 
    
    async function fetchData() {
        try {
            const response = await fetch(dataURL);
            if (!response.ok) throw new Error('網路回應錯誤，找不到 data.csv 檔案');
            
            const csvText = await response.text();
            
            allItems = parseCSV(csvText);

            if (allItems.length === 0) {
                 throw new Error('CSV 檔案為空或格式不符，無法解析出任何項目。');
            }
            
            populateFilters(); // 填充下拉選單和標籤雲
            displayItems(allItems); // 初始顯示所有項目

            // 為搜尋框和下拉選單綁定事件
            searchBar.addEventListener('input', filterAndDisplay);
            // 下拉選單變動時，更新 currentSelectedCategory 並篩選
            categoryDropdown.addEventListener('change', function() {
                currentSelectedCategory = categoryDropdown.value;
                updateTagCloudActiveState(currentSelectedCategory); // 更新標籤雲狀態
                filterAndDisplay();
            });

            // 【新增】為標籤雲容器綁定點擊事件 (事件委派)
            tagCloudContainer.addEventListener('click', handleTagClick);

        } catch (error) {
            console.error('載入資料失敗:', error);
            portfolioGrid.innerHTML = `<p style="text-align: center; color: red;">作品載入失敗：${error.message}</p>`;
        }
    }

    function parseCSV(text) {
        const normalizedText = text.replace(/\r\n?/g, '\n');
        const rows = normalizedText.split('\n').slice(1).filter(row => row.trim() !== '');
        
        return rows.map(row => {
            const columns = row.split(',');
            if (columns.length >= 4) {
                const categories = columns[3].trim().split('、').map(c => c.trim()).filter(c => c.length > 0);

                return {
                    name: columns[0].trim(),
                    url: columns[1].trim(),
                    imageUrl: columns[2].trim(),
                    categories: categories 
                };
            }
            return null;
        }).filter(item => item && item.name && item.url && item.categories.length > 0);
    }

    /**
     * 【重要修改】同時填充下拉選單和建立標籤雲
     */
    function populateFilters() {
        categoryDropdown.innerHTML = ''; // 清空舊選項
        tagCloudContainer.innerHTML = ''; // 清空標籤雲

        // 1. 獲取所有不重複的分類
        const allCategories = allItems.flatMap(item => item.categories);
        const uniqueCategories = [...new Set(allCategories)];
        uniqueCategories.sort(); 

        // 2. 建立「全部分類」標籤和選項
        const allFilter = { value: '全部', text: '全部分類' };
        
        // 生成下拉選單選項
        [allFilter, ...uniqueCategories.map(c => ({ value: c, text: c }))].forEach(filter => {
            const option = document.createElement('option');
            option.value = filter.value;
            option.textContent = filter.text;
            categoryDropdown.appendChild(option);
        });

        // 生成標籤雲按鈕
        [allFilter, ...uniqueCategories.map(c => ({ value: c, text: c }))].forEach(filter => {
            const tag = document.createElement('span');
            tag.className = 'tag-cloud-tag';
            tag.textContent = filter.text;
            tag.dataset.category = filter.value; // 使用 data 屬性儲存分類值
            tagCloudContainer.appendChild(tag);
        });
        
        // 初始設定「全部分類」為啟用狀態
        updateTagCloudActiveState(currentSelectedCategory);
    }

    /**
     * 【新增】處理標籤雲點擊事件
     */
    function handleTagClick(event) {
        if (event.target.classList.contains('tag-cloud-tag')) {
            const category = event.target.dataset.category;
            
            // 更新選中的分類狀態
            currentSelectedCategory = category;
            
            // 讓下拉選單與標籤雲同步
            categoryDropdown.value = category; 
            updateTagCloudActiveState(category);
            
            // 執行篩選
            filterAndDisplay();
        }
    }
    
    /**
     * 【新增】更新標籤雲中活躍（active）標籤的樣式
     */
    function updateTagCloudActiveState(activeCategory) {
        const tags = tagCloudContainer.querySelectorAll('.tag-cloud-tag');
        tags.forEach(tag => {
            if (tag.dataset.category === activeCategory) {
                tag.classList.add('active');
            } else {
                tag.classList.remove('active');
            }
        });
    }

    /**
     * 核心篩選函式（邏輯不變，但使用 currentSelectedCategory）
     */
    function filterAndDisplay() {
        const searchTerm = searchBar.value.toLowerCase();
        // 使用共用的狀態變數
        const selectedCategory = currentSelectedCategory; 

        let filteredItems = allItems;

        // 步驟 1：依分類篩選
        if (selectedCategory !== '全部') {
            filteredItems = filteredItems.filter(item => 
                item.categories.includes(selectedCategory)
            );
        }

        // 步驟 2：依搜尋關鍵字篩選 (從已分類的結果中)
        if (searchTerm) {
            filteredItems = filteredItems.filter(item => 
                item.name.toLowerCase().includes(searchTerm)
            );
        }

        // 顯示最終篩選結果
        displayItems(filteredItems);
    }

    function displayItems(items) {
        portfolioGrid.innerHTML = ''; 

        if (items.length === 0) {
            portfolioGrid.innerHTML = `<p style="text-align: center; color: #555;">找不到符合條件的作品。</p>`;
            return; 
        }

        items.forEach(item => {
            const card = document.createElement('a');
            card.className = 'card';
            card.href = item.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            
            const imageToDisplay = item.imageUrl ? item.imageUrl : placeholderImageURL;

            card.innerHTML = `
                <img 
                    src="${imageToDisplay}" 
                    alt="${item.name}" 
                    class="card-image" 
                    onerror="this.onerror=null; this.src='${placeholderImageURL}';"
                >
                <div class="card-content">
                    <h3 class="card-title">${item.name}</h3>
                </div>
            `;
            portfolioGrid.appendChild(card);
        });
    }

    // 執行程式
    fetchData();
});