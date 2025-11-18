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

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadProductList();
    initializeSelection();
    renderAllPresetButtons();
    updateStatus();
});

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Settings management
function loadSettings() {
    document.getElementById('apiUrl').value = settings.apiUrl || '';
    document.getElementById('githubToken').value = settings.githubToken || '';
    document.getElementById('fileName').value = settings.fileName || 'zalocash';
}

function saveSettings() {
    settings = {
        apiUrl: document.getElementById('apiUrl').value,
        githubToken: document.getElementById('githubToken').value,
        fileName: document.getElementById('fileName').value
    };
    localStorage.setItem('settings', JSON.stringify(settings));
    alert('✅ Đã lưu cài đặt!');
    updateStatus();
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
    const container = document.getElementById(containerId);
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

// Update selected values display
function updateSelectedValuesDisplay() {
    document.getElementById('selectedAmount').textContent = 
        currentSelection.amount ? `${currentSelection.amount.value} ${currentSelection.amount.unit}` : '--';
    document.getElementById('selectedProcedure').textContent = currentSelection.procedure || '--';
    document.getElementById('selectedPeriod').textContent = currentSelection.period || '--';
    document.getElementById('selectedAge').textContent = currentSelection.age || '--';
    document.getElementById('selectedPromotion').textContent = currentSelection.promotion || '--';
    document.getElementById('selectedDiscount').textContent = currentSelection.discount || '--';
}

// Product management
function saveProduct() {
    if (!document.getElementById('name').value || !document.getElementById('image').value || !document.getElementById('link').value) {
        alert('❌ Vui lòng điền tên, ảnh và link sản phẩm!');
        return;
    }

    const product = {
        name: document.getElementById('name').value,
        image: document.getElementById('image').value,
        link: document.getElementById('link').value,
        discount: currentSelection.discount,
        amount: currentSelection.amount.value,
        unit: currentSelection.amount.unit,
        procedure: currentSelection.procedure,
        period: currentSelection.period,
        age: currentSelection.age,
        promotion: currentSelection.promotion
    };

    const editIndex = document.getElementById('editIndex').value;
    
    if (editIndex === '') {
        products.push(product);
    } else {
        products[editIndex] = product;
    }

    localStorage.setItem('products', JSON.stringify(products));
    loadProductList();
    resetForm();
    updateGist();
    
    alert('✅ Đã lưu sản phẩm!');
}

function resetForm() {
    document.getElementById('productForm').reset();
    document.getElementById('editIndex').value = '';
    initializeSelection();
}

function loadProductList() {
    const list = document.getElementById('productList');
    const count = document.getElementById('productCount');
    
    count.textContent = products.length;
    
    if (products.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">Chưa có sản phẩm nào</div>';
        return;
    }
    
    list.innerHTML = products.map((product, index) => `
        <div class="mobile-product-item">
            <!-- Header: Tên và số tiền -->
            <div class="mobile-product-header">
                <div class="mobile-product-name">${product.name}</div>
                <div class="mobile-product-amount">${product.amount} ${product.unit}</div>
            </div>
            
            <!-- Details Grid -->
            <div class="mobile-product-details">
                <div class="mobile-detail-item">
                    <span class="mobile-icon">📋</span>
                    <span>${product.procedure}</span>
                </div>
                <div class="mobile-detail-item">
                    <span class="mobile-icon">⏰</span>
                    <span>${product.period}</span>
                </div>
                <div class="mobile-detail-item">
                    <span class="mobile-icon">👤</span>
                    <span>${product.age}</span>
                </div>
            </div>
            
            <!-- Footer: Khuyến mãi và Actions -->
            <div class="mobile-product-footer">
                <div class="mobile-promo-info">
                    <div class="mobile-detail-item">
                        <span class="mobile-icon">🎁</span>
                        <span>${product.promotion}</span>
                    </div>
                    <div class="mobile-detail-item">
                        <span class="mobile-icon">🏷️</span>
                        <span>${product.discount}</span>
                    </div>
                </div>
                
                <div class="mobile-actions">
                    <button class="btn-mobile" style="background: #007bff; color: white;" onclick="editProduct(${index})">✏️</button>
                    <button class="btn-mobile" style="background: #dc3545; color: white;" onclick="deleteProduct(${index})">🗑️</button>
                    <button class="btn-mobile" style="background: #6c757d; color: white;" onclick="moveProduct(${index}, -1)" ${index === 0 ? 'disabled' : ''}>⬆️</button>
                    <button class="btn-mobile" style="background: #6c757d; color: white;" onclick="moveProduct(${index}, 1)" ${index === products.length - 1 ? 'disabled' : ''}>⬇️</button>
                </div>
            </div>
        </div>
    `).join('');
}

function editProduct(index) {
    const product = products[index];
    
    document.getElementById('name').value = product.name;
    document.getElementById('image').value = product.image;
    document.getElementById('link').value = product.link;
    
    // Tìm và chọn các preset tương ứng
    currentSelection.amount = presets.amounts.find(p => p.value === product.amount && p.unit === product.unit) || presets.amounts[0];
    currentSelection.procedure = presets.procedures.find(p => p === product.procedure) || presets.procedures[0];
    currentSelection.period = presets.periods.find(p => p === product.period) || presets.periods[0];
    currentSelection.age = presets.ages.find(p => p === product.age) || presets.ages[0];
    currentSelection.promotion = presets.promotions.find(p => p === product.promotion) || presets.promotions[0];
    currentSelection.discount = presets.discounts.find(p => p === product.discount) || presets.discounts[0];
    
    renderAllPresetButtons();
    updateSelectedValuesDisplay();
    
    document.getElementById('editIndex').value = index;
    switchTab('add');
}

function deleteProduct(index) {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
        products.splice(index, 1);
        localStorage.setItem('products', JSON.stringify(products));
        loadProductList();
        updateGist();
    }
}

function moveProduct(index, direction) {
    if ((direction === -1 && index === 0) || (direction === 1 && index === products.length - 1)) return;
    const newIndex = index + direction;
    [products[index], products[newIndex]] = [products[newIndex], products[index]];
    localStorage.setItem('products', JSON.stringify(products));
    loadProductList();
    updateGist();
}

// Preset manager modal
function openPresetManager() {
    renderPresetLists();
    document.getElementById('presetModal').style.display = 'flex';
}

function closePresetManager() {
    document.getElementById('presetModal').style.display = 'none';
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
    const container = document.getElementById(containerId);
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

// Gist integration
async function updateGist() {
    if (!settings.apiUrl || !settings.githubToken) return;

    try {
        const data = {
            last_updated: new Date().toISOString(),
            version: "1.0",
            products: products
        };

        const gistId = extractGistId(settings.apiUrl);
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
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

        if (response.ok) {
            updateStatus();
        }
    } catch (error) {
        console.error('Lỗi cập nhật Gist:', error);
    }
}

function extractGistId(gistUrl) {
    if (gistUrl.includes('api.github.com/gists')) {
        return gistUrl.split('/').pop();
    }
    if (gistUrl.includes('gist.githubusercontent.com')) {
        return gistUrl.split('/')[4];
    }
    return gistUrl;
}

function testConnection() {
    alert(settings.apiUrl ? '🔧 Kiểm tra kết nối...' : '❌ Vui lòng nhập API URL!');
}

function updateStatus() {
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('gistStatus').textContent = settings.apiUrl ? '✅ Đã kết nối' : '❌ Chưa kết nối';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('presetModal');
    if (event.target === modal) {
        closePresetManager();
    }
}