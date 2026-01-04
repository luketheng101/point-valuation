let categories = {};
let activeTab = null;
let modalMode = 'new-category';
let modalTargetCategory = null;

// Sanitize user input to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load data from localStorage
function loadData() {
    try {
        const data = localStorage.getItem('points-calculator-data');
        if (data) {
            categories = JSON.parse(data);
        }
    } catch (error) {
        console.log('No saved data found or error loading:', error);
        categories = {};
    }
    
    // Auto-select first category if available
    if (Object.keys(categories).length > 0) {
        activeTab = Object.keys(categories)[0];
    }
    
    renderTabs();
    renderContent();
}

// Save data to localStorage
function saveData() {
    try {
        localStorage.setItem('points-calculator-data', JSON.stringify(categories));
    } catch (error) {
        console.error('Error saving data:', error);
        alert('Failed to save data. Please try again.');
    }
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('light');
    const icon = document.getElementById('theme-icon');
    icon.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
}

// Switch active tab
function switchTab(tabName) {
    activeTab = tabName;
    renderTabs();
    renderContent();
}

// Modal functions
function openModal(mode, category = null) {
    modalMode = mode;
    modalTargetCategory = category;
    
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const categoryGroup = document.getElementById('modal-category-group');
    
    if (mode === 'new-category') {
        title.textContent = 'New Category';
        categoryGroup.style.display = 'block';
    } else {
        title.textContent = 'Add Item to ' + category;
        categoryGroup.style.display = 'none';
    }
    
    // Clear form
    document.getElementById('modal-category').value = '';
    document.getElementById('modal-item').value = '';
    document.getElementById('modal-points').value = '';
    document.getElementById('modal-price').value = '';
    
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('show');
}

function closeModalOnOverlay(event) {
    if (event.target === event.currentTarget) {
        closeModal();
    }
}

// Contact modal functions
function openContactModal() {
    document.getElementById('contact-modal-overlay').classList.add('show');
}

function closeContactModal() {
    document.getElementById('contact-modal-overlay').classList.remove('show');
    // Clear form
    document.getElementById('contact-form').reset();
}

function closeContactModalOnOverlay(event) {
    if (event.target === event.currentTarget) {
        closeContactModal();
    }
}

function handleContactSubmit(event) {
    event.preventDefault();
    
    // Get form values
    const type = document.getElementById('contact-type').value;
    const email = document.getElementById('contact-email').value;
    const message = document.getElementById('contact-message').value;
    
    // For now, just show an alert. Later you can connect to Formspree
    alert(`Thank you for your ${type}!\n\nYour message has been received. We'll get back to you soon.`);
    
    // Close modal and reset form
    closeContactModal();
    
    // TODO: When ready to use Formspree, add their endpoint to the form action
    // and remove this alert
}

function saveModalItem() {
    let category;
    
    if (modalMode === 'new-category') {
        category = document.getElementById('modal-category').value.trim();
        if (!category) {
            alert('Please enter a category name');
            return;
        }
    } else {
        category = modalTargetCategory;
    }
    
    const item = document.getElementById('modal-item').value.trim();
    const points = parseFloat(document.getElementById('modal-points').value);
    const price = parseFloat(document.getElementById('modal-price').value);

    if (!item || !points || !price || points <= 0 || price <= 0) {
        alert('Please fill in all fields with valid values');
        return;
    }

    if (!categories[category]) {
        categories[category] = [];
    }

    categories[category].push({
        name: item,
        points: points,
        price: price
    });

    saveData();
    closeModal();
    switchTab(category);
}

// Render tabs
function renderTabs() {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';
    
    // Only show tabs if categories exist
    if (Object.keys(categories).length === 0) {
        return;
    }
    
    // Create category tabs
    Object.keys(categories).forEach(cat => {
        const tab = document.createElement('button');
        tab.className = `tab ${activeTab === cat ? 'active' : ''}`;
        tab.onclick = () => switchTab(cat);
        
        const tabText = document.createTextNode(cat);
        tab.appendChild(tabText);
        
        const closeBtn = document.createElement('span');
        closeBtn.className = 'tab-close';
        closeBtn.textContent = '×';
        closeBtn.title = 'Delete category';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            deleteCategory(cat);
        };
        
        tab.appendChild(closeBtn);
        container.appendChild(tab);
    });
    
    // Add "+" tab
    const newCatTab = document.createElement('button');
    newCatTab.className = 'tab new-category-tab';
    newCatTab.textContent = '+';
    newCatTab.onclick = () => openModal('new-category');
    container.appendChild(newCatTab);
}

// Render content
function renderContent() {
    const container = document.getElementById('tab-contents');
    
    // If no categories exist or active tab doesn't exist, show empty state
    if (Object.keys(categories).length === 0 || !categories[activeTab]) {
        container.innerHTML = `
            <div class="tab-content active">
                <div class="empty-state">
                    <h2>Welcome!</h2>
                    <p>Click "+ New Category" to get started.</p>
                    <button onclick="openModal('new-category')" style="margin-top: 20px;">+ New Category</button>
                </div>
            </div>
        `;
        return;
    }

    const items = categories[activeTab] || [];
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="tab-content active">
                <div class="empty-state">
                    <h2>No items yet</h2>
                    <p>Add your first item to this category.</p>
                </div>
            </div>
        `;
        return;
    }

    // Sort items by value per point (best deal first)
    const sortedItems = items.map((item, originalIndex) => ({
        ...item,
        originalIndex,
        valuePerPoint: item.price / item.points
    })).sort((a, b) => b.valuePerPoint - a.valuePerPoint);

    // Find best deal
    const maxValue = sortedItems[0].valuePerPoint;

    container.innerHTML = `
        <div class="tab-content active">
            <button class="add-item-btn" onclick="openModal('add-item', '${activeTab}')">+ Add Item</button>
            <div class="item-grid">
                ${sortedItems.map((item) => {
                    const isBestDeal = item.valuePerPoint === maxValue;
                    const escapedName = escapeHtml(item.name);
                    const index = item.originalIndex;
                    
                    return `
                        <div class="card ${isBestDeal ? 'best-deal' : ''}" id="card-${index}">
                            ${isBestDeal ? '<div class="best-deal-badge">Best Deal!</div>' : ''}
                            <div class="item-header">
                                <div class="item-name">${escapedName}</div>
                                <div class="item-actions">
                                    <button class="icon-btn" onclick="editItem(${index})">Edit</button>
                                    <button class="icon-btn danger" onclick="deleteItem(${index})">Delete</button>
                                </div>
                            </div>
                            <div id="item-view-${index}">
                                <div class="item-detail">
                                    <span class="item-label">Points:</span>
                                    <span class="item-value">${item.points}</span>
                                </div>
                                <div class="item-detail">
                                    <span class="item-label">Price:</span>
                                    <span class="item-value">$${item.price.toFixed(2)}</span>
                                </div>
                                <div class="item-detail" style="border-top: 2px solid var(--border); padding-top: 12px; margin-top: 12px;">
                                    <span class="item-label">Value per Point:</span>
                                    <span class="value-highlight">$${item.valuePerPoint.toFixed(4)}</span>
                                </div>
                            </div>
                            <div id="item-edit-${index}" style="display: none;" class="edit-mode">
                                <div class="item-detail">
                                    <label class="item-label">Item Name</label>
                                    <input type="text" id="edit-name-${index}" value="${escapedName}">
                                </div>
                                <div class="item-detail">
                                    <label class="item-label">Points</label>
                                    <input type="number" id="edit-points-${index}" value="${item.points}">
                                </div>
                                <div class="item-detail">
                                    <label class="item-label">Price ($)</label>
                                    <input type="number" id="edit-price-${index}" step="0.01" value="${item.price}">
                                </div>
                                <div class="button-group">
                                    <button onclick="saveEdit(${index})">Save</button>
                                    <button class="secondary" onclick="cancelEdit(${index})">Cancel</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Edit item functions
function editItem(index) {
    document.getElementById(`item-view-${index}`).style.display = 'none';
    document.getElementById(`item-edit-${index}`).style.display = 'block';
}

function cancelEdit(index) {
    document.getElementById(`item-view-${index}`).style.display = 'block';
    document.getElementById(`item-edit-${index}`).style.display = 'none';
}

function saveEdit(index) {
    const name = document.getElementById(`edit-name-${index}`).value.trim();
    const points = parseFloat(document.getElementById(`edit-points-${index}`).value);
    const price = parseFloat(document.getElementById(`edit-price-${index}`).value);

    if (!name || !points || !price || points <= 0 || price <= 0) {
        alert('Please fill in all fields with valid values');
        return;
    }

    categories[activeTab][index] = {
        name: name,
        points: points,
        price: price
    };

    saveData();
    renderContent();
}

// Delete functions
function deleteItem(index) {
    if (confirm('Are you sure you want to delete this item?')) {
        categories[activeTab].splice(index, 1);
        
        // If category is now empty, remove it and show empty state
        if (categories[activeTab].length === 0) {
            delete categories[activeTab];
            const remainingCategories = Object.keys(categories);
            activeTab = remainingCategories.length > 0 ? remainingCategories[0] : null;
        }
        
        saveData();
        renderTabs();
        renderContent();
    }
}

function deleteCategory(category) {
    if (confirm(`Are you sure you want to delete the entire "${category}" category? This will remove all items in it.`)) {
        delete categories[category];
        
        // Switch to first available category or show empty state
        const remainingCategories = Object.keys(categories);
        if (remainingCategories.length > 0) {
            activeTab = remainingCategories[0];
        } else {
            activeTab = null;
        }
        
        saveData();
        renderTabs();
        renderContent();
    }
}

// Initialize app
loadData();