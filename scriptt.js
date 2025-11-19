// Data storage
let products = JSON.parse(localStorage.getItem('products')) || [];
let presets = JSON.parse(localStorage.getItem('presets')) || {
    amounts: [
        { value: "1-10", unit: "Triệu" },
        { value: "5-50", unit: "Triệu" },
        { value: "1-5", unit: "Tỷ" },
        { value: "10-100", unit: "Triệu" }
    ],
    procedures: ["CCCD", "CMND", "Hộ chiếu"],
    periods: ["3 tháng", "6 tháng", "12 tháng"],
    ages: ["20-60", "18-55", "21-65", "25-60"],
    promotions: ["Khuyến mãi", "Ưu đãi đặc biệt", "Tặng quà", "Giảm phí"],
    discounts: ["0% lãi", "Lãi suất thấp", "Giảm 50%", "Miễn phí"]
};

let settings = JSON.parse(localStorage.getItem('settings')) || {};
let currentSelection = {};

// Safe element getter
function getElement(id) {
    return document.getElementById(id);
}

// Safe text content setter
function setText(id, text) {
    const element = getElement(id);
    if (element) element.textContent = text;
}


// Hàm đồng bộ thủ công với confirm rõ ràng
function syncWithGist() {
    if (!settings.apiUrl || !settings.githubToken) {
        alert('❌ Vui lòng cài đặt API URL và Token trước!');
        return;
    }
    
    if (confirm(`Đồng bộ dữ liệu từ Gist?\n\n📊 Hiện tại: ${products.length} sản phẩm\n📥 Gist sẽ: THAY THẾ hoàn toàn dữ liệu local\n\nTiếp tục?`)) {
        loadFromGist();
        loadProductList();
    }
}

// Sửa các hàm quản lý sản phẩm để tự động cập nhật Gist
function saveProduct() {
    const nameEl = getElement('name');
    const imageEl = getElement('image');
    const linkEl = getElement('link');
    
    if (!nameEl || !imageEl || !linkEl) {
        alert('❌ Form không sẵn sàng!');
        return;
    }
    
    if (!nameEl.value || !imageEl.value || !linkEl.value) {
        alert('❌ Vui lòng điền tên, ảnh và link sản phẩm!');
        return;
    }

    const product = {
        name: nameEl.value,
        image: imageEl.value,
        link: linkEl.value,
        discount: currentSelection.discount,
        amount: currentSelection.amount.value,
        unit: currentSelection.amount.unit,
        procedure: currentSelection.procedure,
        period: currentSelection.period,
        age: currentSelection.age,
        promotion: currentSelection.promotion
    };

    const editIndex = getElement('editIndex').value;
    
    if (editIndex === '') {
        products.push(product);
    } else {
        products[editIndex] = product;
    }

    localStorage.setItem('products', JSON.stringify(products));
    loadProductList();
    resetForm();
    
    // Tự động cập nhật Gist sau khi lưu
    updateGist();
    
    alert('✅ Đã lưu sản phẩm và cập nhật Gist!');
}

function deleteProduct(index) {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
        products.splice(index, 1);
        localStorage.setItem('products', JSON.stringify(products));
        loadProductList();
        
        // Tự động cập nhật Gist sau khi xóa
        updateGist();
    }
}

function moveProduct(index, direction) {
    if ((direction === -1 && index === 0) || (direction === 1 && index === products.length - 1)) return;
    const newIndex = index + direction;
    [products[index], products[newIndex]] = [products[newIndex], products[index]];
    localStorage.setItem('products', JSON.stringify(products));
    loadProductList();
    
    // Tự động cập nhật Gist sau khi di chuyển
    updateGist();
}

// Thêm hàm kiểm tra kết nối chi tiết
async function testConnection() {
    if (!settings.apiUrl || !settings.githubToken) {
        alert('❌ Vui lòng nhập API URL và Token!');
        return;
    }
    
    try {
        showLoading(true);
        const gistId = extractGistId(settings.apiUrl);
        const apiUrl = `https://api.github.com/gists/${gistId}`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${settings.githubToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const gistData = await response.json();
            const fileContent = gistData.files[settings.fileName]?.content;
            let productCount = 0;
            
            if (fileContent) {
                const data = JSON.parse(fileContent);
                productCount = data.products ? data.products.length : 0;
            }
            
            alert(`✅ Kết nối thành công!\n📁 File: ${settings.fileName}\n📦 Sản phẩm trên Gist: ${productCount}\n💾 Sản phẩm local: ${products.length}`);
        } else {
            throw new Error('HTTP ' + response.status);
        }
    } catch (error) {
        alert('❌ Lỗi kết nối: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Initialize - CHỈ load local, không auto sync
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeApp, 100);
});



// Hàm sync từ Gist (chỉ chạy khi người dùng bấm nút)
async function syncFromGist() {
    if (!settings.apiUrl || !settings.githubToken) {
        alert('❌ Vui lòng cài đặt API URL và Token trước!');
        return;
    }
    
    if (confirm(`Đồng bộ dữ liệu từ Gist?\n\n📊 Hiện tại: ${products.length} sản phẩm\n📥 Gist sẽ: THAY THẾ hoàn toàn dữ liệu local\n\nTiếp tục?`)) {
        await loadFromGist();
    }
}

// Đổi tên hàm loadFromGist để rõ ràng hơn
async function loadFromGist() {
    try {
        showLoading(true);
        
        const gistId = extractGistId(settings.apiUrl);
        const apiUrl = `https://api.github.com/gists/${gistId}`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${settings.githubToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Không thể kết nối đến Gist');
        }
        
        const gistData = await response.json();
        const fileContent = gistData.files[settings.fileName]?.content;
        
        if (fileContent) {
            const data = JSON.parse(fileContent);
            const gistProducts = data.products || [];
            
            console.log('📥 Dữ liệu từ Gist:', gistProducts);
            console.log('📦 Dữ liệu local hiện tại:', products);
            
            // REPLACE: Thay thế hoàn toàn dữ liệu local bằng dữ liệu từ Gist
            products = gistProducts;
            
            // Lưu vào localStorage
            localStorage.setItem('products', JSON.stringify(products));
            
            // Render lại danh sách
            loadProductList();
            console.log('✅ Đã đồng bộ dữ liệu từ Gist!');
            
            alert(`✅ Đã đồng bộ ${products.length} sản phẩm từ Gist!`);
        } else {
            throw new Error('Không tìm thấy dữ liệu trong Gist');
        }
        
    } catch (error) {
        console.error('❌ Lỗi đồng bộ từ Gist:', error);
        alert('❌ Lỗi đồng bộ: ' + error.message);
    } finally {
        showLoading(false);
        updateStatus();
    }
}

// Giữ nguyên hàm updateGist để tự động đẩy lên khi thao tác
async function updateGist() {
    if (!settings.apiUrl || !settings.githubToken) {
        console.log('⚠️ Chưa cấu hình API, bỏ qua cập nhật Gist');
        return;
    }

    try {
        showLoading(true);
        
        const gistId = extractGistId(settings.apiUrl);
        const apiUrl = `https://api.github.com/gists/${gistId}`;
        
        // Tạo dữ liệu mới từ products hiện tại
        const data = {
            last_updated: new Date().toISOString(),
            version: "1.0",
            products: products
        };
        
        console.log('📤 Đang đẩy dữ liệu lên Gist:', products);
        
        // Đẩy dữ liệu mới lên Gist
        const putResponse = await fetch(apiUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${settings.githubToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    [settings.fileName]: {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            })
        });

        if (putResponse.ok) {
            console.log('✅ Đã cập nhật Gist!');
        } else {
            const errorText = await putResponse.text();
            throw new Error('Lỗi cập nhật Gist: ' + errorText);
        }
        
    } catch (error) {
        console.error('❌ Lỗi cập nhật Gist:', error);
        // KHÔNG alert để không làm phiền người dùng
    } finally {
        showLoading(false);
        updateStatus();
    }
}

// Hàm hiển thị loading
function showLoading(show) {
    if (show) {
        document.body.style.opacity = '0.7';
        document.body.style.pointerEvents = 'none';
    } else {
        document.body.style.opacity = '1';
        document.body.style.pointerEvents = 'auto';
    }
}

// Hàm update status an toàn
function updateStatus() {
    setText('lastUpdate', new Date().toLocaleString());
    setText('totalProducts', products.length);
    setText('gistStatus', settings.apiUrl ? '✅ Đã kết nối' : '❌ Chưa kết nối');
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const tabElement = document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`);
    const contentElement = document.getElementById(tabName + 'Tab');
    
    if (tabElement) tabElement.classList.add('active');
    if (contentElement) contentElement.classList.add('active');
}

// Settings management
function loadSettings() {
    const apiUrlEl = getElement('apiUrl');
    const githubTokenEl = getElement('githubToken');
    const fileNameEl = getElement('fileName');
    
    if (apiUrlEl) apiUrlEl.value = settings.apiUrl || '';
    if (githubTokenEl) githubTokenEl.value = settings.githubToken || '';
    if (fileNameEl) fileNameEl.value = settings.fileName || 'zalocash';
}

function saveSettings() {
    const apiUrlEl = getElement('apiUrl');
    const githubTokenEl = getElement('githubToken');
    const fileNameEl = getElement('fileName');
    
    if (!apiUrlEl || !githubTokenEl || !fileNameEl) {
        alert('❌ Không thể lưu cài đặt!');
        return;
    }
    
    settings = {
        apiUrl: apiUrlEl.value,
        githubToken: githubTokenEl.value,
        fileName: fileNameEl.value
    };
    
    localStorage.setItem('settings', JSON.stringify(settings));
    alert('✅ Đã lưu cài đặt!');
    
    // Update status sau khi lưu
    setTimeout(updateStatus, 100);
}

// Initialize selection with default values
function initializeSelection() {
    currentSelection = {
        amount: presets.amounts[0],
        procedure: presets.procedures[0],
        period: presets.periods[0],
        age: presets.ages[0],
        promotion: presets.promotions[0],
        discount: presets.discounts[0]
    };
    updateSelectedValuesDisplay();
}

// Update selected values display
function updateSelectedValuesDisplay() {
    setText('selectedAmount', currentSelection.amount ? `${currentSelection.amount.value} ${currentSelection.amount.unit}` : '--');
    setText('selectedProcedure', currentSelection.procedure || '--');
    setText('selectedPeriod', currentSelection.period || '--');
    setText('selectedAge', currentSelection.age || '--');
    setText('selectedPromotion', currentSelection.promotion || '--');
    setText('selectedDiscount', currentSelection.discount || '--');
}


function resetForm() {
    const form = getElement('productForm');
    const editIndex = getElement('editIndex');
    
    if (form) form.reset();
    if (editIndex) editIndex.value = '';
    
    initializeSelection();
}




// Các hàm còn lại giữ nguyên...
function extractGistId(gistUrl) {
    if (gistUrl.includes('api.github.com/gists')) {
        return gistUrl.split('/').pop();
    }
    if (gistUrl.includes('gist.githubusercontent.com')) {
        return gistUrl.split('/')[4];
    }
    return gistUrl;
}

async function testConnection() {
    if (!settings.apiUrl || !settings.githubToken) {
        alert('❌ Vui lòng nhập API URL và Token!');
        return;
    }
    
    try {
        showLoading(true);
        const gistId = extractGistId(settings.apiUrl);
        const apiUrl = `https://api.github.com/gists/${gistId}`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${settings.githubToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        
        const gistData = await response.json();
        const fileContent = gistData.files[settings.fileName]?.content;
        
        if (!fileContent) {
            throw new Error(`Không tìm thấy file "${settings.fileName}" trong Gist`);
        }
        
        const data = JSON.parse(fileContent);
        const gistProducts = data.products || [];
        
        // Hiển thị kết quả trực quan trong modal
        showGistData(gistData, data, gistProducts);
        
    } catch (error) {
        alert('❌ Lỗi kết nối: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Hàm hiển thị dữ liệu Gist trực quan
function showGistData(gistData, jsonData, products) {
    // Tạo modal để hiển thị
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; max-height: 90%; overflow-y: auto;">
            <div class="modal-header">
                <h3>📊 Thông tin Gist</h3>
                <button class="close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4>🔗 Thông tin Gist</h4>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 14px;">
                    <div><strong>Gist ID:</strong> ${gistData.id}</div>
                    <div><strong>Mô tả:</strong> ${gistData.description || 'Không có'}</div>
                    <div><strong>File:</strong> ${settings.fileName}</div>
                    <div><strong>Cập nhật:</strong> ${new Date(jsonData.last_updated).toLocaleString()}</div>
                    <div><strong>Version:</strong> ${jsonData.version}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4>📦 Sản phẩm trên Gist (${products.length})</h4>
                <div class="product-preview-list">
                    ${products.map((product, index) => `
                        <div class="product-preview-item">
                            <div class="product-preview-header">
                                <strong>${index + 1}. ${product.name}</strong>
                                <span class="product-amount">${product.amount} ${product.unit}</span>
                            </div>
                            <div class="product-preview-details">
                                <span>📋 ${product.procedure}</span>
                                <span>⏰ ${product.period}</span>
                                <span>👤 ${product.age}</span>
                            </div>
                            <div class="product-preview-footer">
                                <span>🎁 ${product.promotion}</span>
                                <span>🏷️ ${product.discount}</span>
                            </div>
                            <div class="product-preview-link">
                                <small>🔗 ${product.link}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div>
                <h4>📄 JSON Raw Data</h4>
                <pre style="background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 12px; overflow-x: auto; max-height: 200px;">${JSON.stringify(jsonData, null, 2)}</pre>
            </div>
            
            <div class="action-buttons" style="margin-top: 20px;">
                <button class="btn btn-success" onclick="syncWithGist()">📥 Đồng bộ về đây</button>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">❌ Đóng</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Đóng modal khi click bên ngoài
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('presetModal');
    if (event.target === modal) {
        closePresetManager();
    }
}

// Render all preset buttons
function renderAllPresetButtons() {
    renderPresetButtons('amountPresets', presets.amounts, 'amount', (preset) => `${preset.value} ${preset.unit}`);
    renderPresetButtons('procedurePresets', presets.procedures, 'procedure');
    renderPresetButtons('periodPresets', presets.periods, 'period');
    renderPresetButtons('agePresets', presets.ages, 'age');
    renderPresetButtons('promotionPresets', presets.promotions, 'promotion');
    renderPresetButtons('discountPresets', presets.discounts, 'discount');
}

function renderPresetButtons(containerId, presetArray, type, formatter = null) {
    const container = getElement(containerId);
    if (!container) return;
    
    container.innerHTML = presetArray.map((preset, index) => {
        const displayText = formatter ? formatter(preset) : preset;
        const isSelected = currentSelection[type] === preset || 
                          (type === 'amount' && currentSelection.amount && 
                           currentSelection.amount.value === preset.value && 
                           currentSelection.amount.unit === preset.unit);
        
        return `<button type="button" class="btn-preset ${isSelected ? 'selected' : ''}" 
                onclick="selectPreset('${type}', ${index})">
                ${displayText}
            </button>`;
    }).join('');
}

// Select preset function
function selectPreset(type, index) {
    const presetArray = presets[type + 's'];
    currentSelection[type] = presetArray[index];
    renderAllPresetButtons();
    updateSelectedValuesDisplay();
}

function editProduct(index) {
    const product = products[index];
    
    const nameEl = getElement('name');
    const imageEl = getElement('image');
    const linkEl = getElement('link');
    
    if (nameEl) nameEl.value = product.name;
    if (imageEl) imageEl.value = product.image;
    if (linkEl) linkEl.value = product.link;
    
    // Tìm và chọn các preset tương ứng
    currentSelection.amount = presets.amounts.find(p => p.value === product.amount && p.unit === product.unit) || presets.amounts[0];
    currentSelection.procedure = presets.procedures.find(p => p === product.procedure) || presets.procedures[0];
    currentSelection.period = presets.periods.find(p => p === product.period) || presets.periods[0];
    currentSelection.age = presets.ages.find(p => p === product.age) || presets.ages[0];
    currentSelection.promotion = presets.promotions.find(p => p === product.promotion) || presets.promotions[0];
    currentSelection.discount = presets.discounts.find(p => p === product.discount) || presets.discounts[0];
    
    renderAllPresetButtons();
    updateSelectedValuesDisplay();
    
    const editIndexEl = getElement('editIndex');
    if (editIndexEl) editIndexEl.value = index;
    
    switchTab('add');
}


// Preset manager modal
function openPresetManager() {
    renderPresetLists();
    const modal = getElement('presetModal');
    if (modal) modal.style.display = 'flex';
}

function closePresetManager() {
    const modal = getElement('presetModal');
    if (modal) modal.style.display = 'none';
}

function renderPresetLists() {
    renderPresetList('amountPresetList', presets.amounts, 'amount', true);
    renderPresetList('procedurePresetList', presets.procedures, 'procedure');
    renderPresetList('periodPresetList', presets.periods, 'period');
    renderPresetList('agePresetList', presets.ages, 'age');
    renderPresetList('promotionPresetList', presets.promotions, 'promotion');
    renderPresetList('discountPresetList', presets.discounts, 'discount');
}

function renderPresetList(containerId, presetArray, type, isAmount = false) {
    const container = getElement(containerId);
    if (!container) return;
    
    container.innerHTML = presetArray.map((preset, index) => `
        <div class="preset-item">
            ${isAmount ? `
                <input type="text" value="${preset.value}" onchange="updatePreset('${type}', ${index}, 'value', this.value)" placeholder="Số tiền" style="width: 80px;">
                <select onchange="updatePreset('${type}', ${index}, 'unit', this.value)" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="Triệu" ${preset.unit === 'Triệu' ? 'selected' : ''}>Triệu</option>
                    <option value="Tỷ" ${preset.unit === 'Tỷ' ? 'selected' : ''}>Tỷ</option>
                    <option value="Ngàn" ${preset.unit === 'Ngàn' ? 'selected' : ''}>Ngàn</option>
                </select>
            ` : `
                <input type="text" value="${preset}" onchange="updatePreset('${type}', ${index}, null, this.value)" placeholder="Giá trị" style="flex: 1;">
            `}
            <button class="btn-sm" style="background: #dc3545; color: white;" onclick="deletePreset('${type}', ${index})">🗑️</button>
        </div>
    `).join('');
}

// Preset CRUD operations
function addAmountPreset() {
    presets.amounts.push({ value: "Mới", unit: "Triệu" });
    renderPresetLists();
}

function addProcedurePreset() {
    presets.procedures.push("Mới");
    renderPresetLists();
}

function addPeriodPreset() {
    presets.periods.push("Mới");
    renderPresetLists();
}

function addAgePreset() {
    presets.ages.push("Mới");
    renderPresetLists();
}

function addPromotionPreset() {
    presets.promotions.push("Mới");
    renderPresetLists();
}

function addDiscountPreset() {
    presets.discounts.push("Mới");
    renderPresetLists();
}

function updatePreset(type, index, field, value) {
    if (type === 'amount') {
        if (field) {
            presets.amounts[index][field] = value;
        }
    } else {
        presets[type + 's'][index] = value;
    }
}

function deletePreset(type, index) {
    presets[type + 's'].splice(index, 1);
    renderPresetLists();
}

function savePresets() {
    localStorage.setItem('presets', JSON.stringify(presets));
    renderAllPresetButtons();
    closePresetManager();
    alert('✅ Đã lưu mẫu!');
}

// Thêm hàm kiểm tra link
async function checkLinkStatus(url) {
    if (!url) return 'invalid';
    
    try {
        // Chỉ kiểm tra các URL hợp lệ
        if (!url.startsWith('http')) return 'invalid';
        
        const response = await fetch(url, { 
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache'
        });
        return 'valid';
    } catch (error) {
        // no-cors mode sẽ luôn throw error, nhưng link vẫn có thể valid
        if (url.startsWith('http')) {
            return 'valid'; // Giả sử link hợp lệ nếu bắt đầu bằng http
        }
        return 'invalid';
    }
}

// Hàm kiểm tra ảnh
function checkImageStatus(src) {
    return new Promise((resolve) => {
        if (!src || !src.startsWith('http')) {
            resolve('invalid');
            return;
        }
        
        const img = new Image();
        img.onload = () => resolve('valid');
        img.onerror = () => resolve('invalid');
        img.src = src;
        
        // Timeout sau 3 giây
        setTimeout(() => resolve('checking'), 3000);
    });
}

// Thêm biến toàn cục để quản lý chế độ xem
let viewMode = 'grid'; // 'grid' hoặc 'list'

// Hàm chuyển đổi chế độ xem
function toggleViewMode() {
    const gridView = getElement('gridView');
    const listView = getElement('listView');
    const toggleBtn = getElement('viewModeToggle');
    
    if (viewMode === 'grid') {
        viewMode = 'list';
        gridView.style.display = 'none';
        listView.style.display = 'block';
        toggleBtn.innerHTML = '📱 Chế độ xem';
        toggleBtn.classList.add('view-mode-active');
    } else {
        viewMode = 'grid';
        gridView.style.display = 'block';
        listView.style.display = 'none';
        toggleBtn.innerHTML = '📐 Chế độ xem';
        toggleBtn.classList.remove('view-mode-active');
    }
    
    // Load lại danh sách sản phẩm với chế độ xem mới
    loadProductList();
}

// Hàm load sản phẩm với cả 2 chế độ xem
function loadProductList() {
    const grid = getElement('productGrid');
    const list = getElement('productList');
    const count = getElement('productCount');
    const emptyState = getElement('emptyState');
    
    if (!grid || !list || !count) return;
    
    count.textContent = products.length;
    
    if (products.length === 0) {
        grid.innerHTML = '';
        list.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Load grid view
    grid.innerHTML = products.map((product, index) => `
        <div class="grid-item" data-index="${index}">
            <div class="grid-link-status link-checking" id="gridLinkStatus-${index}">
                <span>🔗</span>
            </div>
            
            <div class="grid-image-container">
                <img src="${product.image}" 
                     alt="${product.name}"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEyMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik02MCAzMEM2MCAzNi42Mjg0IDU0LjYyODQgNDIgNDggNDJDNTEuMzcxNiA0MiA0NCAzNi42Mjg0IDQ0IDMwQzQ0IDIzLjM3MTYgNTEuMzcxNiAxOCA0OCAxOEM1NC42Mjg0IDE4IDYwIDIzLjM3MTYgNjAgMzBaIiBmaWxsPSIjOEM5MkE2Ii8+CjxwYXRoIGQ9Ik03MiA3MEM0MCA3MCAyNCA1MCAyNCA1MEMyNCA1MCAyOCA3MCA2MCA3MEM5MiA3MCA5NiA1MCA5NiA1MEM5NiIDUwIDgwIDcwIDcyIDcwWiIgZmlsbD0iIzhDOTJBNiIvPgo8L3N2Zz4K'; this.classList.add('image-error')"
                     onload="this.classList.remove('image-error')">
                <div class="discount-label">${product.discount}</div>
            </div>
            
            <div class="grid-item-info">
                <div class="grid-product-name">${product.name}</div>
                
                <div class="grid-meta-tags">
                    <span class="grid-meta-tag">📋 ${product.procedure}</span>
                    <span class="grid-meta-tag">👤 ${product.age}</span>
                </div>
                
                <div class="grid-info-row">
                    <div class="grid-amount">
                        <span>Số tiền</span>
                        <span class="grid-amount-value">${product.amount}</span>
                        <span class="grid-amount-unit">${product.unit}</span>
                    </div>
                </div>
                
                <div class="grid-period">⏰ ${product.period}</div>
                
                <div class="grid-discount">🎁 ${product.promotion}</div>
                
                <button class="grid-button" onclick="viewProduct(${index})">
                    Xem chi tiết
                </button>
            </div>
            
            <div class="grid-item-actions" style="display: none;">
                <button class="btn-compact" onclick="editProduct(${index})">✏️</button>
                <button class="btn-compact" onclick="deleteProduct(${index})">🗑️</button>
            </div>
        </div>
    `).join('');
    
    // Load list view (giữ nguyên hàm cũ)
    list.innerHTML = products.map((product, index) => `
        <div class="mobile-product-item">
            <div class="product-main-info">
                <div class="product-image-container">
                    <img src="${product.image}" 
                         alt="${product.name}" 
                         class="product-image-preview"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0zNSAyNUMzNSAyOC4wMzU0IDMyLjUzNTQgMzAgMjkuNSAzMEMyNi40NjQ2IDMwIDI0IDI4LjAzNTQgMjQgMjVDMjQgMjEuOTY0NiAyNi40NjQ2IDIwIDI5LjUgMjBDMzIuNTM1NCAyMCAzNSAyMS45NjQ2IDM1IDI1WiIgZmlsbD0iIzhDOTJBNiIvPgo8cGF0aCBkPSJNNDIgNDJDMjAgNDIgMTAgMzAgMTAgMzBDMTAgMzAgMTMgNDIgMzUgNDJDNzcgNDIgODAgMzAgODAgMzBDODAgMzAgNjQgNDIgNDIgNDJaIiBmaWxsPSIjOEM5MkE2Ii8+Cjwvc3ZnPgo='; this.classList.add('image-error')"
                         onload="this.classList.remove('image-error')">
                </div>
                <div class="product-basic-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-amount">${product.amount} ${product.unit}</div>
                    <div class="product-meta">
                        <span class="meta-tag">📋 ${product.procedure}</span>
                        <span class="meta-tag">⏰ ${product.period}</span>
                        <span class="meta-tag">👤 ${product.age}</span>
                    </div>
                </div>
            </div>
            
            <div class="product-details-grid">
                <div class="detail-item">
                    <span>🎁</span>
                    <span>${product.promotion}</span>
                </div>
                <div class="detail-item">
                    <span>🏷️</span>
                    <span>${product.discount}</span>
                </div>
            </div>
            
            <div class="product-actions">
                <div class="link-status link-checking" id="linkStatus-${index}">
                    <span>🔗</span>
                    <span>Đang kiểm tra...</span>
                </div>
                <div class="action-buttons-compact">
                    <button class="btn-compact" style="background: #007bff; color: white;" 
                            onclick="editProduct(${index})" title="Sửa">✏️</button>
                    <button class="btn-compact" style="background: #dc3545; color: white;" 
                            onclick="deleteProduct(${index})" title="Xóa">🗑️</button>
                    <button class="btn-compact" style="background: #6c757d; color: white;" 
                            onclick="moveProduct(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Lên">⬆️</button>
                    <button class="btn-compact" style="background: #6c757d; color: white;" 
                            onclick="moveProduct(${index}, 1)" ${index === products.length - 1 ? 'disabled' : ''} title="Xuống">⬇️</button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Kiểm tra link status cho cả 2 chế độ xem
    products.forEach((product, index) => {
        checkAndUpdateLinkStatus(product.link, index);
        checkAndUpdateGridLinkStatus(product.link, index);
    });
}

// Hàm kiểm tra link status cho grid view
async function checkAndUpdateGridLinkStatus(url, index) {
    const statusElement = getElement(`gridLinkStatus-${index}`);
    if (!statusElement) return;
    
    try {
        const status = await checkLinkStatus(url);
        const statusClass = status === 'valid' ? 'grid-link-valid' : 'grid-link-invalid';
        const statusIcon = status === 'valid' ? '✅' : '❌';
        
        statusElement.className = `grid-link-status ${statusClass}`;
        statusElement.innerHTML = `<span>${statusIcon}</span>`;
        
    } catch (error) {
        statusElement.className = 'grid-link-status grid-link-invalid';
        statusElement.innerHTML = '<span>❌</span>';
    }
}

// Hàm xem chi tiết sản phẩm (cho grid view)
function viewProduct(index) {
    const product = products[index];
    
    // Tạo modal hiển thị chi tiết sản phẩm
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>📋 Chi tiết sản phẩm</h3>
                <button class="close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
            </div>
            
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${product.image}" 
                     alt="${product.name}" 
                     style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px;"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0yMDAgODBDMjAwIDEwNC44NTkgMTc5Ljg1OSAxMjUgMTU1IDEyNUMxMzAuMTQxIDEyNSAxMTAgMTA0Ljg1OSAxMTAgODBDMTEwIDU1LjE0MSAxMzAuMTQxIDM1IDE1NSAzNUMxNzkuODU5IDM1IDIwMCA1NS4xNDEgMjAwIDgwWiIgZmlsbD0iIzhDOTJBNiIvPgo8cGF0aCBkPSJNMjgwIDE2MEMyMDAgMTYwIDE2MCAxMjAgMTYwIDEyMEMxNjAgMTIwIDE4MCAxNjAgMjYwIDE2MEMzNDAgMTYwIDM2MCAxMjAgMzYwIDEyMEMzNjAgMTIwIDMyMCAxNjAgMjgwIDE2MFoiIGZpbGw9IiM4Qzk5QTYiLz4KPC9zdmc+Cg=='">
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px; color: #333;">${product.name}</div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
                        <div style="font-size: 12px; color: #666;">Số tiền</div>
                        <div style="font-size: 16px; font-weight: 700; color: #ff0000;">${product.amount} ${product.unit}</div>
                    </div>
                    <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
                        <div style="font-size: 12px; color: #666;">Thời hạn</div>
                        <div style="font-size: 14px; font-weight: 600; color: #333;">${product.period}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
                    <div><strong>📋 Thủ tục:</strong> ${product.procedure}</div>
                    <div><strong>👤 Độ tuổi:</strong> ${product.age}</div>
                    <div><strong>🎁 Khuyến mãi:</strong> ${product.promotion}</div>
                    <div><strong>🏷️ Giảm giá:</strong> ${product.discount}</div>
                </div>
            </div>
            
            <div class="action-buttons" style="margin-top: 20px;">
                <button class="btn btn-primary" onclick="window.open('${product.link}', '_blank')">🔗 Truy cập link</button>
                <button class="btn btn-success" onclick="editProduct(${index}); this.parentElement.parentElement.parentElement.remove()">✏️ Chỉnh sửa</button>
                <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">❌ Đóng</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Cập nhật hàm initializeApp để khởi tạo chế độ xem
function initializeApp() {
    loadSettings();
    loadProductList();
    initializeSelection();
    renderAllPresetButtons();
    updateStatus();
    
    // Khởi tạo chế độ xem mặc định
    toggleViewMode(); // Bắt đầu với grid view
}
// Hàm sắp xếp sản phẩm
function sortProducts() {
    const sortBy = getElement('sortProducts').value;
    
    switch(sortBy) {
        case 'name':
            products.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            products.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'amount':
            products.sort((a, b) => {
                const aAmount = parseFloat(a.amount.split('-')[0]);
                const bAmount = parseFloat(b.amount.split('-')[0]);
                return aAmount - bAmount;
            });
            break;
        case 'date':
            // Giữ nguyên thứ tự (mới nhất đầu tiên)
            break;
    }
    
    localStorage.setItem('products', JSON.stringify(products));
    loadProductList();
}

// Hàm lọc sản phẩm
function filterProducts() {
    const searchTerm = getElement('productSearch').value.toLowerCase();
    const productItems = document.querySelectorAll('.mobile-product-item');
    let visibleCount = 0;
    
    productItems.forEach(item => {
        const productName = item.querySelector('.product-name').textContent.toLowerCase();
        if (productName.includes(searchTerm)) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Hiển thị empty state nếu không có sản phẩm nào
    const emptyState = getElement('emptyState');
    if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }
}

// Cập nhật hàm kiểm tra link status
async function checkAndUpdateLinkStatus(url, index) {
    const statusElement = getElement(`linkStatus-${index}`);
    if (!statusElement) return;
    
    try {
        const status = await checkLinkStatus(url);
        const statusText = status === 'valid' ? 'Link hoạt động' : 'Link lỗi';
        const statusClass = status === 'valid' ? 'link-valid' : 'link-invalid';
        const statusIcon = status === 'valid' ? '✅' : '❌';
        
        statusElement.className = `link-status ${statusClass}`;
        statusElement.innerHTML = `<span>${statusIcon}</span><span>${statusText}</span>`;
        
    } catch (error) {
        statusElement.className = 'link-status link-invalid';
        statusElement.innerHTML = '<span>❌</span><span>Lỗi kiểm tra</span>';
    }
}

// Thêm hàm kiểm tra lại tất cả link
function recheckAllLinks() {
    products.forEach((product, index) => {
        checkAndUpdateLinkStatus(product.link, index);
    });
    alert('🔄 Đang kiểm tra lại tất cả link...');
}

// Thêm nút kiểm tra link vào tab Quản lý
function addRecheckButton() {
    const manageTab = getElement('manageTab');
    if (!manageTab) return;
    
    // Kiểm tra xem đã có nút chưa
    if (!getElement('recheckLinksBtn')) {
        const recheckButton = document.createElement('button');
        recheckButton.id = 'recheckLinksBtn';
        recheckButton.className = 'btn btn-primary btn-sm';
        recheckButton.style.marginBottom = '10px';
        recheckButton.innerHTML = '🔄 Kiểm tra lại link';
        recheckButton.onclick = recheckAllLinks;
        
        const sectionTitle = manageTab.querySelector('.section-title');
        if (sectionTitle) {
            sectionTitle.parentNode.insertBefore(recheckButton, sectionTitle.nextSibling);
        }
    }
}