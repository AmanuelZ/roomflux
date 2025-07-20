let currentTextureName = '';
// Global variables for wall-by-wall method
let wallCounter = 0;
let wallItems = [];
let deductionItems = [];
let isApplyingTexture = false;

// Add this function to show material count indicators
function addMaterialCountIndicators() {
    console.log('Adding material count indicators');

    // Get all material categories
    const categories = document.querySelectorAll('.material-category');
    console.log('Found', categories.length, 'material categories');

    // If no categories are found, try to find the material list container
    if (categories.length === 0) {
        const materialList = document.querySelector('.sidebar-scrollable') ||
            document.querySelector('#materialsContainer');

        if (materialList) {
            console.log('Found material list container');

            // Check if indicator already exists
            if (materialList.querySelector('.material-count-indicator')) {
                console.log('Count indicator already exists');
                return;
            }

            // Add a count indicator at the top of the material list
            const countIndicator = document.createElement('div');
            countIndicator.className = 'material-count-indicator';
            countIndicator.innerHTML = `
                <span class="badge bg-secondary">
                    <i class="fa fa-info-circle"></i> Showing 1 of 10+ materials per category
                </span>
            `;

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .material-count-indicator {
                    text-align: center;
                    padding: 10px 0;
                    font-size: 12px;
                    margin-bottom: 10px;
                    background: #f8f9fa;
                    border-radius: 5px;
                }
                
                .material-count-indicator .badge {
                    padding: 5px 10px;
                    border-radius: 20px;
                }
            `;
            document.head.appendChild(style);

            // Insert at the top of the material list
            if (materialList.firstChild) {
                materialList.insertBefore(countIndicator, materialList.firstChild);
            } else {
                materialList.appendChild(countIndicator);
            }
        } else {
            console.log('Material list container not found');
        }
    } else {
        // If categories are found, add count indicators to each category
        categories.forEach(category => {
            const categoryName = category.querySelector('.category-name');
            if (!categoryName) {
                console.log('Category name not found in category');
                return;
            }

            const categoryNameText = categoryName.textContent;
            const items = category.querySelectorAll('.list-group-item');

            console.log(`Adding indicator to ${categoryNameText} with ${items.length} items`);

            // Check if indicator already exists
            if (category.querySelector('.category-count-indicator')) {
                console.log(`Indicator already exists for ${categoryNameText}`);
                return;
            }

            // Create count indicator
            const countIndicator = document.createElement('div');
            countIndicator.className = 'category-count-indicator';
            countIndicator.innerHTML = `
                <span class="badge bg-secondary">
                    Showing ${items.length} of 10+ ${categoryNameText} materials
                </span>
            `;

            // Add to category
            const categoryHeader = category.querySelector('.category-header');
            if (categoryHeader) {
                categoryHeader.appendChild(countIndicator);
            } else {
                category.insertBefore(countIndicator, category.firstChild);
            }
        });
    }
}

// Add this function to select_texture.js or a relevant JS file
// function addLoginPromptToSidebar() {
//     console.log('Adding login prompt to sidebar');

//     // Find the sidebar where materials are listed
//     const sidebar = document.querySelector('#sidebar-wrapper');
//     if (!sidebar) {
//         console.log('Sidebar not found');
//         return;
//     }

//     // Check if user is logged in using the same method as in the templates
//     // We can check if the user-specific elements are present in the page
//     const isLoggedIn = document.querySelector('.user-dropdown') !== null || 
//                        document.querySelector('.user-menu') !== null;

//     console.log('User logged in:', isLoggedIn);

//     // If user is logged in, don't show the prompt
//     if (isLoggedIn) {
//         console.log('User is logged in, not showing login prompt');
//         return;
//     }

//     // Check if prompt already exists
//     if (document.querySelector('.login-prompt')) {
//         console.log('Login prompt already exists');
//         return;
//     }

//     // Create the login prompt element
//     const loginPrompt = document.createElement('div');
//     loginPrompt.className = 'login-prompt';
//     loginPrompt.innerHTML = `
//         <div class="login-prompt-content">
//             <i class="fa fa-lock"></i>
//             <p>Log in to access our full collection of materials</p>
//             <button class="btn btn-primary btn-sm login-btn">Log In</button>
//         </div>
//     `;

//     // Add styles
//     const style = document.createElement('style');
//     style.textContent = `
//         .login-prompt {
//             background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
//             border: 1px solid #dee2e6;
//             border-radius: 5px;
//             margin: 10px;
//             padding: 15px;
//             text-align: center;
//             box-shadow: 0 2px 4px rgba(0,0,0,0.05);
//         }

//         .login-prompt-content {
//             display: flex;
//             flex-direction: column;
//             align-items: center;
//             gap: 10px;
//         }

//         .login-prompt i {
//             font-size: 24px;
//             color: #6c757d;
//         }

//         .login-prompt p {
//             margin: 0;
//             font-size: 14px;
//             color: #495057;
//         }

//         .login-btn {
//             transition: all 0.3s ease;
//         }

//         .login-btn:hover {
//             transform: translateY(-2px);
//             box-shadow: 0 4px 8px rgba(0,0,0,0.1);
//         }
//     `;
//     document.head.appendChild(style);

//     // Try different insertion points

//     // Option 1: After the material type selector
//     const materialTypeSelector = sidebar.querySelector('.material-type-selector');
//     if (materialTypeSelector) {
//         console.log('Inserting after material type selector');
//         materialTypeSelector.insertAdjacentElement('afterend', loginPrompt);
//         return;
//     }

//     // Option 2: After the search filter bar
//     const searchFilterBar = sidebar.querySelector('.search-filter-bar');
//     if (searchFilterBar) {
//         console.log('Inserting after search filter bar');
//         searchFilterBar.insertAdjacentElement('afterend', loginPrompt);
//         return;
//     }

//     // Option 3: At the beginning of the materials grid
//     const materialsContainer = sidebar.querySelector('#materialsContainer');
//     if (materialsContainer) {
//         console.log('Inserting at beginning of materials container');
//         materialsContainer.insertAdjacentElement('beforebegin', loginPrompt);
//         return;
//     }

//     // Option 4: Just append to the sidebar
//     console.log('Appending to sidebar');
//     sidebar.appendChild(loginPrompt);

//     // Add click event to the login button
//     const loginBtn = loginPrompt.querySelector('.login-btn');
//     loginBtn.addEventListener('click', function() {
//         window.location.href = '/login';
//     });
// }

function addSeeMoreButton() {
    // Check if user is logged in
    // We can determine this by checking if there are more than 3-4 materials shown
    // If there are many materials, the user is logged in
    const materialItems = document.querySelectorAll('.list-group-item');

    // If there are more than 4-5 items, user is likely logged in
    if (materialItems.length > 5) {
        console.log('User appears to be logged in, not showing See More button');
        return;
    }

    console.log('User appears to be logged out, showing See More button');

    // Find the sidebar scrollable container
    const sidebarScrollable = document.querySelector('.sidebar-scrollable');
    if (!sidebarScrollable) {
        console.log('Sidebar scrollable container not found');
        return;
    }

    // Check if button already exists
    if (document.querySelector('.see-more-materials-btn')) {
        console.log('See More button already exists');
        return;
    }

    // Create the See More button
    const seeMoreBtn = document.createElement('div');
    seeMoreBtn.className = 'see-more-materials-btn';
    seeMoreBtn.innerHTML = `
        <button class="btn btn-outline-primary btn-block w-100 mt-3">
            <i class="fa fa-unlock-alt me-2"></i> See More Materials
        </button>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .see-more-materials-btn {
            padding: 10px;
            margin-top: 15px;
        }
        
        .see-more-materials-btn button {
            transition: all 0.3s ease;
            border-radius: 5px;
            padding: 10px;
            font-weight: 500;
        }
        
        .see-more-materials-btn button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
    `;
    document.head.appendChild(style);

    // Add click event to the button
    seeMoreBtn.querySelector('button').addEventListener('click', function () {
        window.location.href = '/login';
    });

    // Append the button to the sidebar scrollable container
    sidebarScrollable.appendChild(seeMoreBtn);
}

// Call the function when the document is loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('Document ready, adding See More button');

    // Add with a slight delay to ensure DOM is fully ready
    setTimeout(function () {
        addSeeMoreButton();
    }, 500);
});

// Create a function to show/hide the texture loading indicator
// Replace the existing showTextureLoadingIndicator function with this version
// that only shows a loading indicator for the 3D view
function showTextureLoadingIndicator(show, message = 'Applying texture...') {
    // Check if we're in 3D mode
    const threeDTab = document.getElementById('threed-visualizer-tab');
    const is3DTabActive = threeDTab && threeDTab.classList.contains('active');

    // If we're not in 3D mode, don't show the global loading indicator
    if (!is3DTabActive) {
        return;
    }

    let loadingIndicator = document.getElementById('texture-loading-indicator');

    if (!loadingIndicator) {
        // Create the loading indicator if it doesn't exist
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'texture-loading-indicator';
        loadingIndicator.className = 'texture-loading-indicator';
        loadingIndicator.innerHTML = `
            <div class="texture-loading-spinner"></div>
            <div class="texture-loading-message">${message}</div>
        `;
        document.body.appendChild(loadingIndicator);

        // Add CSS for the loading indicator
        const style = document.createElement('style');
        style.textContent = `
            .texture-loading-indicator {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                color: white;
                font-size: 18px;
            }
            .texture-loading-spinner {
                width: 50px;
                height: 50px;
                border: 5px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: spin 1s ease-in-out infinite;
                margin-bottom: 20px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .texture-loading-message {
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }

    // Update the message
    const messageElement = loadingIndicator.querySelector('.texture-loading-message');
    if (messageElement) {
        messageElement.textContent = message;
    }

    // Show or hide the indicator
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

// Initialize the calculator when the modal is shown
function initializeCalculator() {
    // Reset the deductions container
    const deductionsContainer = document.getElementById('deductionsContainer');
    if (deductionsContainer) {
        deductionsContainer.innerHTML = '';
        deductionItems = [];
    }

    // Reset the walls container
    const wallsContainer = document.getElementById('wallsContainer');
    if (wallsContainer) {
        wallsContainer.innerHTML = '';
        wallItems = [];
        wallCounter = 0;
    }

    // Show/hide material-specific options based on the selected material type
    updateMaterialOptions();

    // Add initial wall for wall-by-wall method
    addWall();
}

// Function to calculate materials using direct area input
function calculateDirectArea() {
    console.log('Calculating materials using direct area input...');

    if (!window.selectedTileSpecs) {
        alert('Please select a material first!');
        return;
    }

    // Get the direct wall area input
    const directWallArea = parseFloat(document.getElementById('directWallArea').value);

    if (!directWallArea || directWallArea <= 0) {
        alert('Please enter a valid wall area');
        return;
    }

    // Check if ceiling should be included (only for paint)
    const includeCeilingDirect = document.getElementById('includeCeilingDirect');
    let totalArea = directWallArea;
    let ceilingArea = 0;
    let floorArea = 0;

    const materialType = window.selectedTileSpecs.materialType || 'tile';
    const isTile = materialType.toLowerCase() === 'tile';
    const isPaint = materialType.toLowerCase() === 'paint';

    // if (isPaint && includeCeilingDirect && includeCeilingDirect.checked) {
    //     ceilingArea = parseFloat(document.getElementById('directCeilingArea').value) || 0;

    //     if (ceilingArea > 0) {
    //         totalArea += ceilingArea;
    //         document.getElementById('totalArea').textContent = totalArea.toFixed(2) + ' (including ceiling)';
    //     } else {
    //         alert('Please enter a valid ceiling area');
    //         document.getElementById('totalArea').textContent = directWallArea.toFixed(2);
    //     }
    // } else {
    //     document.getElementById('totalArea').textContent = directWallArea.toFixed(2);
    // }

    if (isPaint && includeCeilingDirect && includeCeilingDirect.checked) {
        // For paint with ceiling
        ceilingArea = parseFloat(document.getElementById('directCeilingArea').value) || 0;

        if (ceilingArea > 0) {
            totalArea += ceilingArea;
            document.getElementById('totalArea').textContent = totalArea.toFixed(2) + ' (including ceiling)';
        }
    } else if (isTile && document.getElementById('includeFloorDirect') && document.getElementById('includeFloorDirect').checked) {
        // For tile with floor
        floorArea = parseFloat(document.getElementById('directFloorArea').value) || 0;

        if (floorArea > 0) {
            totalArea += floorArea;
            document.getElementById('totalArea').textContent = totalArea.toFixed(2) + ' (including floor)';
        }
    } else {
        document.getElementById('totalArea').textContent = directWallArea.toFixed(2);
    }

    // Calculate materials based on the material type
    const result = calculateMaterialByType(materialType, totalArea);

    // Update the total material needed summary
    document.getElementById('totalMaterialNeeded').textContent = result.summary;

    // Calculate cost
    const totalCost = totalArea * window.selectedTileSpecs.price_per_sqm * result.costFactor;
    document.getElementById('estimatedCost').textContent = totalCost.toFixed(2);

    // Store the calculated quantity for adding to cart
    window.calculatedQuantity = result.quantity;

    // Enable add to cart button
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.disabled = false;
    }

    console.log("Direct area calculated quantity:", window.calculatedQuantity, result.summary);
}

// Update material-specific options based on the selected material type
function updateMaterialOptions() {
    const materialType = window.selectedTileSpecs?.materialType || 'tile';
    const isPaint = materialType.toLowerCase() === 'paint';
    const isWallpaper = materialType.toLowerCase() === 'wallpaper';
    const isTile = materialType.toLowerCase() === 'tile';

    // Show/hide tile options
    const tileOptions = document.getElementById('tileOptions');
    if (tileOptions) {
        tileOptions.style.display = isTile ? 'block' : 'none';
    }

    // Show/hide tile options for wall-by-wall method
    const tileOptionsWallByWall = document.getElementById('tileOptionsWallByWall');
    if (tileOptionsWallByWall) {
        tileOptionsWallByWall.style.display = isTile ? 'block' : 'none';
    }

    // Show/hide tile options for direct area method
    const tileOptionsDirect = document.getElementById('tileOptionsDirect');
    if (tileOptionsDirect) {
        tileOptionsDirect.style.display = isTile ? 'block' : 'none';
    }

    // Show/hide paint options
    const paintOptions = document.getElementById('paintOptions');
    if (paintOptions) {
        paintOptions.style.display = isPaint ? 'block' : 'none';
    }

    // Show/hide paint options for wall-by-wall method
    const paintOptionsWallByWall = document.getElementById('paintOptionsWallByWall');
    if (paintOptionsWallByWall) {
        paintOptionsWallByWall.style.display = isPaint ? 'block' : 'none';
    }

    // Show/hide paint options for direct area method
    const paintOptionsDirect = document.getElementById('paintOptionsDirect');
    if (paintOptionsDirect) {
        paintOptionsDirect.style.display = isPaint ? 'block' : 'none';
    }

    // Show/hide wallpaper options
    const wallpaperOptions = document.getElementById('wallpaperOptions');
    if (wallpaperOptions) {
        wallpaperOptions.style.display = isWallpaper ? 'block' : 'none';
    }

    // Show/hide wallpaper options for wall-by-wall method
    const wallpaperOptionsWallByWall = document.getElementById('wallpaperOptionsWallByWall');
    if (wallpaperOptionsWallByWall) {
        wallpaperOptionsWallByWall.style.display = isWallpaper ? 'block' : 'none';
    }

    // Show/hide wallpaper options for direct area method
    const wallpaperOptionsDirect = document.getElementById('wallpaperOptionsDirect');
    if (wallpaperOptionsDirect) {
        wallpaperOptionsDirect.style.display = isWallpaper ? 'block' : 'none';
    }

    // Show/hide material-specific results
    document.getElementById('tileResults').style.display = materialType.toLowerCase() === 'tile' ? 'block' : 'none';
    document.getElementById('paintResults').style.display = isPaint ? 'block' : 'none';
    document.getElementById('wallpaperResults').style.display = isWallpaper ? 'block' : 'none';
}


// Add a deduction item to the simple method
function addDeduction() {
    const deductionsContainer = document.getElementById('deductionsContainer');
    const template = document.getElementById('deductionItemTemplate');

    if (!deductionsContainer || !template) {
        console.error('Deduction container or template not found');
        return;
    }

    // Clone the template
    const deductionItem = template.content.cloneNode(true);

    // Add event listener to remove button
    const removeBtn = deductionItem.querySelector('.remove-deduction-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', function () {
            this.closest('.deduction-item').remove();
            // Update the deductionItems array
            updateDeductionItems();
        });
    }

    // Add event listeners to update calculations when values change
    const inputs = deductionItem.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', updateDeductionItems);
    });

    // Add the item to the container
    deductionsContainer.appendChild(deductionItem);

    // Update the deductionItems array
    updateDeductionItems();
}

// Update the deductionItems array based on the current DOM elements
function updateDeductionItems() {
    deductionItems = [];
    const deductionElements = document.querySelectorAll('.deduction-item');

    deductionElements.forEach(element => {
        const typeSelect = element.querySelector('.deduction-type-select');
        const widthInput = element.querySelector('.deduction-width');
        const heightInput = element.querySelector('.deduction-height');

        if (typeSelect && widthInput && heightInput) {
            const type = typeSelect.value;
            const width = parseFloat(widthInput.value) || 0;
            const height = parseFloat(heightInput.value) || 0;

            deductionItems.push({
                type: type,
                width: width,
                height: height,
                area: width * height
            });
        }
    });
}

// Add a wall item to the wall-by-wall method
function addWall() {
    const wallsContainer = document.getElementById('wallsContainer');
    const template = document.getElementById('wallItemTemplate');

    if (!wallsContainer || !template) {
        console.error('Walls container or template not found');
        return;
    }

    // Increment wall counter
    wallCounter++;

    // Clone the template
    const wallItem = template.content.cloneNode(true);

    // Update wall title
    const wallTitle = wallItem.querySelector('.wall-title');
    if (wallTitle) {
        wallTitle.textContent = `Wall #${wallCounter}`;
    }

    // Add event listener to remove button
    const removeBtn = wallItem.querySelector('.remove-wall-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', function () {
            this.closest('.wall-item').remove();
            // Update the wallItems array
            updateWallItems();
        });
    }

    // Add event listener to add deduction button
    const addDeductionBtn = wallItem.querySelector('.add-wall-deduction-btn');
    if (addDeductionBtn) {
        addDeductionBtn.addEventListener('click', function () {
            addWallDeduction(this.closest('.wall-item'));
        });
    }

    // Add event listener to material selector
    const materialSelect = wallItem.querySelector('.wall-material');
    if (materialSelect) {
        materialSelect.addEventListener('change', function () {
            const customMaterialSelector = this.closest('.wall-item').querySelector('.custom-material-selector');
            if (customMaterialSelector) {
                customMaterialSelector.style.display = this.value === 'custom' ? 'block' : 'none';
            }
        });
    }

    // Add event listeners to update calculations when values change
    const inputs = wallItem.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', updateWallItems);
    });

    // Add the item to the container
    wallsContainer.appendChild(wallItem);

    // Add an initial deduction to the wall
    const newWallItem = wallsContainer.lastElementChild;
    addWallDeduction(newWallItem);

    // Update the wallItems array
    updateWallItems();
}

// Add a deduction item to a specific wall
function addWallDeduction(wallElement) {
    const deductionsContainer = wallElement.querySelector('.wall-deductions-container');
    const template = document.getElementById('deductionItemTemplate');

    if (!deductionsContainer || !template) {
        console.error('Wall deductions container or template not found');
        return;
    }

    // Clone the template
    const deductionItem = template.content.cloneNode(true);

    // Add event listener to remove button
    const removeBtn = deductionItem.querySelector('.remove-deduction-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', function () {
            this.closest('.deduction-item').remove();
            // Update the wallItems array
            updateWallItems();
        });
    }

    // Add event listeners to update calculations when values change
    const inputs = deductionItem.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', updateWallItems);
    });

    // Add the item to the container
    deductionsContainer.appendChild(deductionItem);

    // Update the wallItems array
    updateWallItems();
}

// Update the wallItems array based on the current DOM elements
function updateWallItems() {
    wallItems = [];
    const wallElements = document.querySelectorAll('.wall-item');

    wallElements.forEach((element, index) => {
        const widthInput = element.querySelector('.wall-width');
        const heightInput = element.querySelector('.wall-height');
        const materialSelect = element.querySelector('.wall-material');

        if (widthInput && heightInput && materialSelect) {
            const width = parseFloat(widthInput.value) || 0;
            const height = parseFloat(heightInput.value) || 0;
            const materialType = materialSelect.value;

            // Calculate wall deductions
            const deductions = [];
            const deductionElements = element.querySelectorAll('.deduction-item');

            deductionElements.forEach(deductionEl => {
                const typeSelect = deductionEl.querySelector('.deduction-type-select');
                const widthInput = deductionEl.querySelector('.deduction-width');
                const heightInput = deductionEl.querySelector('.deduction-height');

                if (typeSelect && widthInput && heightInput) {
                    const type = typeSelect.value;
                    const deductionWidth = parseFloat(widthInput.value) || 0;
                    const deductionHeight = parseFloat(heightInput.value) || 0;

                    deductions.push({
                        type: type,
                        width: deductionWidth,
                        height: deductionHeight,
                        area: deductionWidth * deductionHeight
                    });
                }
            });

            // Calculate total deduction area
            const totalDeductionArea = deductions.reduce((sum, deduction) => sum + deduction.area, 0);

            // Calculate net wall area
            const grossArea = width * height;
            const netArea = Math.max(0, grossArea - totalDeductionArea);

            // Update the wall net area display
            const netAreaElement = element.querySelector('.wall-net-area');
            if (netAreaElement) {
                netAreaElement.textContent = netArea.toFixed(2);
            }

            wallItems.push({
                index: index + 1,
                width: width,
                height: height,
                grossArea: grossArea,
                deductions: deductions,
                totalDeductionArea: totalDeductionArea,
                netArea: netArea,
                materialType: materialType
            });
        }
    });
}

// Calculate materials using the wall-by-wall method
function calculateWallByWall() {
    console.log('Calculating materials using wall-by-wall method...');

    if (!window.selectedTileSpecs) {
        alert('Please select a material first!');
        return;
    }

    // Make sure we have walls defined
    if (wallItems.length === 0) {
        alert('Please add at least one wall with dimensions');
        return;
    }

    // Get the default material type
    const materialType = window.selectedTileSpecs.materialType || 'tile';
    const isTile = materialType.toLowerCase() === 'tile';
    const isPaint = materialType.toLowerCase() === 'paint';

    // Calculate total wall area (sum of all net wall areas)
    const totalWallArea = wallItems.reduce((sum, wall) => sum + wall.netArea, 0);

    // Check if ceiling should be included
    const includeCeilingWallByWall = document.getElementById('includeCeilingWallByWall');
    let totalArea = totalWallArea;
    let ceilingArea = 0;
    let floorArea = 0;

    if (isPaint && includeCeilingWallByWall && includeCeilingWallByWall.checked) {
        // For paint with ceiling
        const ceilingWidth = parseFloat(document.getElementById('ceilingWidth').value) || 0;
        const ceilingLength = parseFloat(document.getElementById('ceilingLength').value) || 0;

        if (ceilingWidth > 0 && ceilingLength > 0) {
            ceilingArea = ceilingWidth * ceilingLength;
            totalArea += ceilingArea;
            document.getElementById('totalArea').textContent = totalArea.toFixed(2) + ' (including ceiling)';
        }
    } else if (isTile && document.getElementById('includeFloorWallByWall') && document.getElementById('includeFloorWallByWall').checked) {
        // For tile with floor
        const floorWidth = parseFloat(document.getElementById('ceilingWidth').value) || 0;
        const floorLength = parseFloat(document.getElementById('ceilingLength').value) || 0;

        if (floorWidth > 0 && floorLength > 0) {
            floorArea = floorWidth * floorLength;
            totalArea += floorArea;
            document.getElementById('totalArea').textContent = totalArea.toFixed(2) + ' (including floor)';
        }
    } else {
        document.getElementById('totalArea').textContent = totalWallArea.toFixed(2);
    }

    // Group walls by material type
    const wallsByMaterial = {};
    wallsByMaterial[materialType] = [];

    wallItems.forEach(wall => {
        const wallMaterialType = wall.materialType === 'custom' ? 'custom' : materialType;
        if (!wallsByMaterial[wallMaterialType]) {
            wallsByMaterial[wallMaterialType] = [];
        }
        wallsByMaterial[wallMaterialType].push(wall);
    });

    // Calculate materials for each type
    let totalMaterialSummary = '';
    let calculatedQuantity = 0;
    let totalCost = 0;

    // Process default material type first
    if (wallsByMaterial[materialType] && wallsByMaterial[materialType].length > 0) {
        const materialArea = wallsByMaterial[materialType].reduce((sum, wall) => sum + wall.netArea, 0);

        const result = calculateMaterialByType(materialType, materialArea);
        totalMaterialSummary = result.summary;
        calculatedQuantity = result.quantity;

        // Fix: Calculate cost based on total area (including ceiling)
        totalCost = totalArea * window.selectedTileSpecs.price_per_sqm * result.costFactor;
    }

    // Update the total material needed summary
    document.getElementById('totalMaterialNeeded').textContent = totalMaterialSummary;

    // Update the estimated cost
    document.getElementById('estimatedCost').textContent = totalCost.toFixed(2);

    // Store the calculated quantity for adding to cart
    window.calculatedQuantity = calculatedQuantity;

    // Enable add to cart button
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.disabled = false;
    }

    console.log("Wall-by-wall calculated quantity:", window.calculatedQuantity, totalMaterialSummary);
}


// Calculate material needs based on material type and area
function calculateMaterialByType(materialType, wallArea) {
    let summary = '';
    let quantity = 0;
    let additionalCostFactor = 1; // Default cost factor

    switch (materialType.toLowerCase()) {
        case 'tile':
        case 'flooring':
            // Get tile dimensions from selectedTileSpecs
            const tileWidth = window.selectedTileSpecs.width || 40; // Default to 40cm if not specified
            const tileHeight = window.selectedTileSpecs.height || 40; // Default to 40cm if not specified

            // Calculate tile area in m²
            const tileArea = (tileWidth * tileHeight) / 10000; // Convert cm² to m²

            // Calculate number of tiles needed
            const tilesNeeded = Math.ceil(wallArea / tileArea);
            const totalTilesNeeded = Math.ceil(tilesNeeded * 1.1); // 10% extra for cuts

            document.getElementById('tilesNeeded').textContent = totalTilesNeeded;
            summary = `${totalTilesNeeded} tiles`;
            quantity = totalTilesNeeded;
            break;

        case 'paint':
            // Get coat count from the appropriate input based on the active tab
            let coatCount = 2; // Default to 2 coats

            // Check which tab is active
            const wallByWallTab = document.getElementById('wall-by-wall-tab');
            const directAreaTab = document.getElementById('direct-area-tab');

            if (wallByWallTab && wallByWallTab.classList.contains('active')) {
                coatCount = parseInt(document.getElementById('coatCountWallByWall').value) || 2;
            } else if (directAreaTab && directAreaTab.classList.contains('active')) {
                coatCount = parseInt(document.getElementById('coatCountDirect').value) || 2;
            } else {
                coatCount = parseInt(document.getElementById('coatCount').value) || 2;
            }

            // Set cost factor based on coat count
            additionalCostFactor = coatCount;

            const coveragePerLiter = 10; // m² per liter
            const litersNeeded = (wallArea * coatCount) / coveragePerLiter;

            // Calculate cans
            const canSizes = [1, 2.5, 5, 10];
            let remainingLiters = litersNeeded;
            const cans = [];

            for (let i = canSizes.length - 1; i >= 0; i--) {
                const canSize = canSizes[i];
                const canCount = Math.floor(remainingLiters / canSize);

                if (canCount > 0) {
                    cans.push(`${canCount} × ${canSize}L`);
                    remainingLiters -= canCount * canSize;
                }
            }

            if (remainingLiters > 0) {
                cans.push(`1 × ${canSizes[0]}L`);
            }

            document.getElementById('paintNeeded').textContent = litersNeeded.toFixed(2);
            document.getElementById('paintCans').textContent = cans.join(', ') || '1 × 1L';

            summary = `${Math.ceil(litersNeeded)} liters (${coatCount} coats)`;
            quantity = Math.ceil(litersNeeded);
            break;

        case 'wallpaper':
            // Use the existing wallpaper calculation function
            const wallpaperResult = calculateWallpaper(wallArea);
            document.getElementById('wallpaperRolls').textContent = wallpaperResult.rollsNeeded;

            // Set cost factor based on waste percentage
            additionalCostFactor = wallpaperResult.includeWaste ? 1.15 : 1;

            summary = `${wallpaperResult.rollsNeeded} rolls`;
            if (wallpaperResult.includeWaste) {
                summary += ' (including 15% waste for pattern matching)';
            }
            quantity = wallpaperResult.rollsNeeded;
            break;

        default:
            // Default to tile calculation
            const defaultTileArea = 0.16; // Default to 40cm × 40cm tile
            const defaultTilesNeeded = Math.ceil(wallArea / defaultTileArea);
            const defaultTotalTilesNeeded = Math.ceil(defaultTilesNeeded * 1.1); // 10% extra

            summary = `${defaultTotalTilesNeeded} pieces`;
            quantity = defaultTotalTilesNeeded;
    }

    return {
        summary: summary,
        quantity: quantity,
        costFactor: additionalCostFactor
    };
}

// Select Texture function
function selectTexture(image, tileData) {
    console.log('selectTexture called with:', image, tileData);

    // Prevent multiple clicks
    if (isApplyingTexture) {
        console.log('Already applying a texture, please wait...');
        return;
    }

    isApplyingTexture = true;

    const cleanImagePath = image.replace(/^\//, '');
    console.log('Selected tile data:', tileData);

    // Get texture name for the loading message
    const textureName = tileData.name || 'texture';

    // Create and show loading overlay only on the image area
    const imageResult = document.getElementById('imageResult');
    const imageArea = imageResult.closest('.image-area');

    // Create loading overlay if it doesn't exist
    let loadingOverlay = document.getElementById('texture-loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'texture-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p id="loading-texture-name">Applying ${textureName}...</p>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #texture-loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 100;
                border-radius: 5px;
                color: black;
            }
            
            .loading-content {
                text-align: center;
                color: white;
            }
            
            .spinner {
                border: 5px solid #f3f3f3;
                border-top: 5px solid #3498db;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 2s linear infinite;
                margin: 0 auto 20px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        // Add the overlay to the image area instead of body
        imageArea.style.position = 'relative'; // Ensure positioning context
        imageArea.appendChild(loadingOverlay);
    } else {
        // Update the texture name in the loading message
        document.getElementById('loading-texture-name').textContent = `Applying ${textureName}...`;
        loadingOverlay.style.display = 'flex';
    }

    // Make sure we have the correct material type
    const materialType = tileData.material ||
        (image.includes('paint') ? 'paint' :
            image.includes('wallpaper') ? 'wallpaper' : 'tile');

    // Store selected tile info
    window.selectedTileSpecs = {
        ...tileData,
        image_path: image,
        materialType: materialType
    };

    // Store the material ID and name for the cart
    window.selectedMaterialId = tileData.id ? parseInt(tileData.id) : null;
    window.selectedMaterialName = tileData.name || '';
    window.selectedMaterialPrice = tileData.price_per_sqm || 0;

    // Update tile info display
    document.getElementById('selectedTilePreview').src = image;
    document.getElementById('selectedTileName').textContent = textureName;
    document.getElementById('materialType').textContent = window.selectedTileSpecs.materialType;

    // Show/hide size info based on material type
    if (tileData.width && tileData.height) {
        document.getElementById('tileSizeContainer').style.display = 'block';
        document.getElementById('tileSize').textContent = `${tileData.width} x ${tileData.height} cm`;
    } else {
        document.getElementById('tileSizeContainer').style.display = 'none';
    }

    document.getElementById('tilePrice').textContent = tileData.price_per_sqm;

    // Start the texture application process
    fetch(`/apply_texture/${cleanImagePath}`, {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.state === 'success') {
                const newImagePath = `/${data.room_path}?t=${new Date().getTime()}`;
                console.log('New image path:', newImagePath);

                // Create a new image element to preload the result
                const newImage = new Image();
                newImage.onload = function () {
                    // Once the new image is loaded, update the displayed image
                    document.getElementById('imageResult').src = newImagePath;
                    document.getElementById('actionButtonsContainer').style.display = 'flex';
                    document.getElementById('selectedTilePreview').src = image;

                    // Store the current texture name for sharing/downloading
                    currentTextureName = textureName;

                    // Hide loading overlay
                    loadingOverlay.style.display = 'none';
                    isApplyingTexture = false;
                };
                newImage.onerror = function () {
                    console.error('Error loading the new image');
                    loadingOverlay.style.display = 'none';
                    isApplyingTexture = false;
                    alert('Error loading the rendered image. Please try again.');
                };
                newImage.src = newImagePath;
            } else {
                console.log('Server response:', data);
                alert('Error applying texture.');

                // Hide loading overlay
                loadingOverlay.style.display = 'none';
                isApplyingTexture = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error applying texture. Please try again.');

            // Hide loading overlay
            loadingOverlay.style.display = 'none';
            isApplyingTexture = false;
        });

    // After texture is applied, update the workflow
    updateMobileWorkflow('texture_applied');

    // On mobile, close the materials panel and show the result
    if (window.innerWidth < 768) {
        const materialsSidebar = document.getElementById('materialsSidebar');
        if (materialsSidebar) {
            materialsSidebar.classList.remove('show');
        }

        // Scroll to the image result
        const imageResult = document.getElementById('imageResult');
        if (imageResult) {
            imageResult.scrollIntoView({ behavior: 'smooth' });
        }

        // Update active button based on which tab is active
        if (document.getElementById('ai-visualizer').classList.contains('active')) {
            const mobileAIBtn = document.getElementById('mobileAIBtn');
            if (mobileAIBtn) {
                const buttons = document.querySelectorAll('.mobile-nav-bar .btn');
                buttons.forEach(btn => btn.classList.remove('active'));
                mobileAIBtn.classList.add('active');
            }

            // Scroll to the image result
            const imageResult = document.getElementById('imageResult');
            if (imageResult) {
                imageResult.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }
}

function handleTextureSelection(imagePath, tileData) {
    console.log("Handling texture selection:", imagePath);

    // Check which tab is active - more reliable method
    const threeDTab = document.getElementById('threed-visualizer-tab');
    const is3DTabActive = threeDTab && threeDTab.classList.contains('active');

    console.log("3D tab active?", is3DTabActive);

    // Show loading indicator
    showTextureLoadingIndicator(true, `Applying ${tileData.name || 'texture'}...`);
    
  
    // Update Apply Texture button
    const applyTextureBtn = document.getElementById('applyTextureFab');
    if (applyTextureBtn) {
        applyTextureBtn.classList.add('touched');
        applyTextureBtn.classList.remove('pulse-animation');
        
        // Hide the tooltip
        const tooltip = applyTextureBtn.querySelector('.fab-tooltip');
        if (tooltip) {
        tooltip.style.display = 'none';
        }
    }

    if (is3DTabActive && typeof window.selectTexture3D === 'function') {
        console.log("Routing to 3D texture selection");
        window.selectTexture3D(imagePath, tileData);
    } else {
        console.log("Routing to AI texture selection");
        selectTexture(imagePath, tileData);
    }
}

window.handleTextureSelection = handleTextureSelection;

// Material calculator function
function calculateMaterials() {
    // Check which calculation method is active
    const wallByWallTab = document.getElementById('wall-by-wall-tab');
    const directAreaTab = document.getElementById('direct-area-tab');
    if (wallByWallTab && wallByWallTab.classList.contains('active')) {
        // Use wall-by-wall calculation method
        calculateWallByWall();
        return;
    } else if (directAreaTab && directAreaTab.classList.contains('active')) {
        // Use direct area calculation method
        calculateDirectArea();
        return;
    }

    console.log('Calculating materials with deductions...');
    console.log('Selected Tile Specs:', window.selectedTileSpecs);

    if (!window.selectedTileSpecs) {
        alert('Please select a material first!');
        return;
    }

    const roomPerimeter = parseFloat(document.getElementById('roomPerimeter').value);
    const roomHeight = parseFloat(document.getElementById('roomHeight').value);

    if (!roomPerimeter || !roomHeight) {
        alert('Please enter room perimeter and height');
        return;
    }

    // Calculate gross wall area (excluding ceiling)
    const grossWallArea = roomPerimeter * roomHeight;

    // Calculate total deduction area
    let totalDeductionArea = 0;
    deductionItems.forEach(deduction => {
        totalDeductionArea += deduction.area;
    });

    // Calculate net wall area
    const netWallArea = Math.max(0, grossWallArea - totalDeductionArea);

    // Get material type
    const materialType = window.selectedTileSpecs.materialType || 'tile';
    const isTile = materialType.toLowerCase() === 'tile';
    const isPaint = materialType.toLowerCase() === 'paint';
    console.log("Material type for calculation:", materialType);

    // Check if ceiling should be included
    const includeCeiling = document.getElementById('includeCeiling');
    let totalArea = netWallArea;
    let ceilingArea = 0;
    let floorArea = 0;

    // if (includeCeiling && includeCeiling.checked) {
    //     // For simple method with perimeter, estimate ceiling area
    //     // If we have perimeter, estimate ceiling area as perimeter²/16π
    //     if (roomPerimeter) {
    //         ceilingArea = Math.pow(roomPerimeter, 2) / (16 * Math.PI);
    //         totalArea += ceilingArea;
    //         document.getElementById('totalArea').textContent = totalArea.toFixed(2) + ' (including ceiling)';
    //     }
    // } else {
    //     document.getElementById('totalArea').textContent = netWallArea.toFixed(2);
    // }

    if (isPaint && includeCeiling && includeCeiling.checked) {
        // For paint with ceiling
        if (roomPerimeter) {
            ceilingArea = Math.pow(roomPerimeter, 2) / (16 * Math.PI);
            totalArea += ceilingArea;
            document.getElementById('totalArea').textContent = totalArea.toFixed(2) + ' (including ceiling)';
        }
    } else if (isTile && document.getElementById('includeFloor') && document.getElementById('includeFloor').checked) {
        // For tile with floor
        if (roomPerimeter) {
            floorArea = Math.pow(roomPerimeter, 2) / (16 * Math.PI);
            totalArea += floorArea;
            document.getElementById('totalArea').textContent = totalArea.toFixed(2) + ' (including floor)';
        }
    } else {
        document.getElementById('totalArea').textContent = netWallArea.toFixed(2);
    }

    // Calculate based on material type
    let materialSummary = '';
    let calculatedQuantity = 0;

    switch (materialType.toLowerCase()) {
        case 'tile':
            // Calculate tiles needed
            const tileArea = (window.selectedTileSpecs.width * window.selectedTileSpecs.height) / 10000; // cm² to m²
            const tilesNeeded = Math.ceil(totalArea / tileArea);
            const totalTilesNeeded = Math.ceil(tilesNeeded * 1.1); // 10% extra for cuts

            // Update UI
            document.getElementById('tilesNeeded').textContent = totalTilesNeeded;
            materialSummary = `${totalTilesNeeded} tiles`;
            calculatedQuantity = totalTilesNeeded;
            break;

        case 'paint':
            // Get paint options
            const coatCount = parseInt(document.getElementById('coatCount').value) || 2;

            // Assume 1 liter covers 10m² per coat
            const coveragePerLiter = 10; // m²
            const litersNeeded = (totalArea * coatCount) / coveragePerLiter;

            // Calculate recommended cans
            const canSizes = [1, 2.5, 5, 10]; // Standard can sizes in liters
            let remainingLiters = litersNeeded;
            const cans = [];

            // Start with the largest can size
            for (let i = canSizes.length - 1; i >= 0; i--) {
                const canSize = canSizes[i];
                const canCount = Math.floor(remainingLiters / canSize);

                if (canCount > 0) {
                    cans.push(`${canCount} × ${canSize}L`);
                    remainingLiters -= canCount * canSize;
                }
            }

            // If there's still a small amount left, add the smallest can
            if (remainingLiters > 0) {
                cans.push(`1 × ${canSizes[0]}L`);
            }

            // Update UI
            document.getElementById('paintNeeded').textContent = litersNeeded.toFixed(2);
            document.getElementById('paintCans').textContent = cans.join(', ') || '1 × 1L';

            materialSummary = `${Math.ceil(litersNeeded)} liters (${coatCount} coats)`;
            if (includeCeiling && includeCeiling.checked) {
                materialSummary += ' including ceiling';
            }

            calculatedQuantity = Math.ceil(litersNeeded);
            break;

        case 'wallpaper':
            // Get wallpaper options
            const includeWaste = document.getElementById('includeWastePercentage').checked;

            // Standard wallpaper roll is 0.53m wide and 10m long
            const rollWidth = 0.53; // m
            const rollLength = 10; // m

            // Calculate how many strips we can get from one roll
            const stripsPerRoll = Math.floor(rollLength / roomHeight);

            // Calculate how many strips we need for the room
            const totalStripsNeeded = Math.ceil(roomPerimeter / rollWidth);

            // Calculate total rolls needed
            let rollsNeeded = Math.ceil(totalStripsNeeded / stripsPerRoll);

            // Add waste for pattern matching if selected
            if (includeWaste) {
                rollsNeeded = Math.ceil(rollsNeeded * 1.15); // 15% extra
            }

            // Update UI
            document.getElementById('wallpaperRolls').textContent = rollsNeeded;

            materialSummary = `${rollsNeeded} rolls`;
            if (includeWaste) {
                materialSummary += ' (including 15% waste for pattern matching)';
            }
            if (includeCeiling && includeCeiling.checked) {
                materialSummary += ' including ceiling';
            }

            calculatedQuantity = rollsNeeded;
            break;

        default:
            // Default to tile calculation
            const defaultTileArea = 0.16; // Default to 40cm × 40cm tile
            const defaultTilesNeeded = Math.ceil(totalArea / defaultTileArea);
            const defaultTotalTilesNeeded = Math.ceil(defaultTilesNeeded * 1.1); // 10% extra

            materialSummary = `${defaultTotalTilesNeeded} pieces`;
            calculatedQuantity = defaultTotalTilesNeeded;
    }

    // Update the total material needed summary
    document.getElementById('totalMaterialNeeded').textContent = materialSummary;

    // Calculate cost - Fix: Use totalArea instead of netWallArea
    const result = calculateMaterialByType(materialType, totalArea);
    const totalCost = totalArea * window.selectedTileSpecs.price_per_sqm * result.costFactor;
    document.getElementById('estimatedCost').textContent = totalCost.toFixed(2);

    // Store the calculated quantity for adding to cart
    window.calculatedQuantity = calculatedQuantity;

    // Enable add to cart button
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.disabled = false;
    }

    console.log("Calculated quantity:", window.calculatedQuantity, materialSummary);
}


function showMaterialCalculator(event, materialId, materialName, materialPrice, imagePath, materialType, width, height) {
    event.preventDefault();

    // Store material information
    window.selectedMaterialId = materialId;
    window.selectedMaterialName = materialName;
    window.selectedMaterialPrice = materialPrice;

    // Create selectedTileSpecs object
    window.selectedTileSpecs = {
        id: materialId,
        name: materialName,
        price_per_sqm: materialPrice,
        image_path: imagePath,
        materialType: materialType,
        width: width,
        height: height
    };

    // Update the material info in the modal
    document.getElementById('selectedTilePreview').src = imagePath;
    document.getElementById('selectedTileName').textContent = materialName;
    document.getElementById('materialType').textContent = materialType;
    document.getElementById('tilePrice').textContent = materialPrice;

    // Show/hide size info based on material type
    if (width && height) {
        document.getElementById('tileSizeContainer').style.display = 'block';
        document.getElementById('tileSize').textContent = `${width} x ${height} cm`;
    } else {
        document.getElementById('tileSizeContainer').style.display = 'none';
    }

    // Show/hide material-specific options
    updateMaterialOptions();

    // Initialize the calculator
    initializeCalculator();

    // Add login prompt to sidebar
    // addLoginPromptToSidebar();

    // Add material count indicators
    addMaterialCountIndicators();

    // Show the modal
    const materialCalculatorModal = new bootstrap.Modal(document.getElementById('materialCalculatorModal'));
    materialCalculatorModal.show();
}

function showCalculatorForCurrentMaterial(event) {
    event.preventDefault();

    if (!window.selectedTileSpecs) {
        alert('Please select a material first by clicking on it in the materials panel.');
        return;
    }

    showMaterialCalculator(
        event,
        window.selectedMaterialId,
        window.selectedMaterialName,
        window.selectedMaterialPrice,
        window.selectedTileSpecs.image_path,
        window.selectedTileSpecs.materialType,
        window.selectedTileSpecs.width,
        window.selectedTileSpecs.height
    );
}

// Helper function to create a material selector for custom materials in wall-by-wall method
function createMaterialSelector(container, selectedMaterialId = null) {
    // Create a container for the material selector
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'custom-material-selector mb-3';

    // Create a search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'form-control mb-2';
    searchInput.placeholder = 'Search materials...';
    selectorContainer.appendChild(searchInput);

    // Create a container for material options
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'material-options';
    optionsContainer.style.maxHeight = '200px';
    optionsContainer.style.overflowY = 'auto';
    selectorContainer.appendChild(optionsContainer);

    // Fetch available materials
    fetch('/api/materials')
        .then(response => response.json())
        .then(materials => {
            // Populate material options
            materials.forEach(material => {
                const option = document.createElement('div');
                option.className = 'material-option d-flex align-items-center p-2 border-bottom';
                option.dataset.id = material.id;

                // Add selected state if this is the currently selected material
                if (material.id === selectedMaterialId) {
                    option.classList.add('selected');
                    option.style.backgroundColor = '#e9f5ff';
                }

                // Create thumbnail
                const thumbnail = document.createElement('img');
                thumbnail.src = material.image_path;
                thumbnail.alt = material.name;
                thumbnail.style.width = '40px';
                thumbnail.style.height = '40px';
                thumbnail.style.objectFit = 'cover';
                thumbnail.className = 'me-2';
                option.appendChild(thumbnail);

                // Create info container
                const info = document.createElement('div');
                info.className = 'material-info';

                // Add material name
                const name = document.createElement('div');
                name.className = 'material-name fw-bold';
                name.textContent = material.name;
                info.appendChild(name);

                // Add material details
                const details = document.createElement('div');
                details.className = 'material-details small text-muted';
                details.textContent = `${material.material} - ${material.price_per_sqm} br/m²`;
                info.appendChild(details);

                option.appendChild(info);

                // Add click event to select this material
                option.addEventListener('click', function () {
                    // Remove selected class from all options
                    optionsContainer.querySelectorAll('.material-option').forEach(opt => {
                        opt.classList.remove('selected');
                        opt.style.backgroundColor = '';
                    });

                    // Add selected class to this option
                    this.classList.add('selected');
                    this.style.backgroundColor = '#e9f5ff';

                    // Store the selected material ID in the wall item
                    const wallItem = container.closest('.wall-item');
                    if (wallItem) {
                        wallItem.dataset.customMaterialId = material.id;
                        wallItem.dataset.customMaterialName = material.name;
                        wallItem.dataset.customMaterialPrice = material.price_per_sqm;
                        wallItem.dataset.customMaterialType = material.material;

                        // Update the wall items array
                        updateWallItems();
                    }
                });

                optionsContainer.appendChild(option);
            });

            // Add search functionality
            searchInput.addEventListener('input', function () {
                const searchTerm = this.value.toLowerCase();
                optionsContainer.querySelectorAll('.material-option').forEach(option => {
                    const materialName = option.querySelector('.material-name').textContent.toLowerCase();
                    const materialDetails = option.querySelector('.material-details').textContent.toLowerCase();

                    if (materialName.includes(searchTerm) || materialDetails.includes(searchTerm)) {
                        option.style.display = '';
                    } else {
                        option.style.display = 'none';
                    }
                });
            });
        })
        .catch(error => {
            console.error('Error fetching materials:', error);
            optionsContainer.innerHTML = '<div class="alert alert-danger">Failed to load materials</div>';
        });

    // Clear existing content and append the selector
    container.innerHTML = '';
    container.appendChild(selectorContainer);
}

// Function to generate a detailed report for wall-by-wall calculation
function generateWallByWallReport() {
    // Create a report container
    const reportContainer = document.createElement('div');
    reportContainer.className = 'wall-by-wall-report mt-4';

    // Add report header
    const reportHeader = document.createElement('h5');
    reportHeader.textContent = 'Wall-by-Wall Calculation Report';
    reportContainer.appendChild(reportHeader);

    // Create a table for the report
    const table = document.createElement('table');
    table.className = 'table table-sm table-bordered';

    // Add table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Wall</th>
            <th>Dimensions</th>
            <th>Gross Area</th>
            <th>Deductions</th>
            <th>Net Area</th>
            <th>Material</th>
            <th>Quantity</th>
        </tr>
    `;
    table.appendChild(thead);

    // Add table body
    const tbody = document.createElement('tbody');

    // Add a row for each wall
    wallItems.forEach(wall => {
        const row = document.createElement('tr');

        // Wall number
        const wallCell = document.createElement('td');
        wallCell.textContent = `Wall #${wall.index}`;
        row.appendChild(wallCell);

        // Dimensions
        const dimensionsCell = document.createElement('td');
        dimensionsCell.textContent = `${wall.width.toFixed(2)}m × ${wall.height.toFixed(2)}m`;
        row.appendChild(dimensionsCell);

        // Gross area
        const grossAreaCell = document.createElement('td');
        grossAreaCell.textContent = `${wall.grossArea.toFixed(2)} m²`;
        row.appendChild(grossAreaCell);

        // Deductions
        const deductionsCell = document.createElement('td');
        if (wall.deductions.length > 0) {
            const deductionsList = document.createElement('ul');
            deductionsList.className = 'mb-0 ps-3';

            wall.deductions.forEach(deduction => {
                const item = document.createElement('li');
                item.textContent = `${deduction.type}: ${deduction.width.toFixed(2)}m × ${deduction.height.toFixed(2)}m = ${deduction.area.toFixed(2)} m²`;
                deductionsList.appendChild(item);
            });

            deductionsCell.appendChild(deductionsList);
        } else {
            deductionsCell.textContent = 'None';
        }
        row.appendChild(deductionsCell);

        // Net area
        const netAreaCell = document.createElement('td');
        netAreaCell.textContent = `${wall.netArea.toFixed(2)} m²`;
        row.appendChild(netAreaCell);

        // Material
        const materialCell = document.createElement('td');
        materialCell.textContent = wall.materialType === 'custom' ?
            (wall.customMaterialName || 'Custom') :
            (window.selectedTileSpecs?.name || 'Default');
        row.appendChild(materialCell);

        // Quantity
        const quantityCell = document.createElement('td');
        // Calculate quantity based on material type and area
        const materialType = wall.materialType === 'custom' ?
            (wall.customMaterialType || 'tile') :
            (window.selectedTileSpecs?.materialType || 'tile');

        const result = calculateMaterialByType(materialType, wall.netArea);
        quantityCell.textContent = result.summary;
        row.appendChild(quantityCell);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    reportContainer.appendChild(table);

    // Add total summary
    const totalSummary = document.createElement('div');
    totalSummary.className = 'total-summary mt-3';

    const totalArea = wallItems.reduce((sum, wall) => sum + wall.netArea, 0);
    totalSummary.innerHTML = `
        <p><strong>Total Wall Area:</strong> ${totalArea.toFixed(2)} m²</p>
        <p><strong>Total Material Needed:</strong> ${document.getElementById('totalMaterialNeeded').textContent}</p>
        <p><strong>Estimated Cost:</strong> ${document.getElementById('estimatedCost').textContent} br</p>
    `;

    reportContainer.appendChild(totalSummary);

    return reportContainer;
}

// Function to export the wall-by-wall report as PDF
function exportWallByWallReportAsPDF() {
    // Generate the report
    const reportHTML = generateWallByWallReport().outerHTML;

    // Create a form to submit to a PDF generation endpoint
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/generate-pdf';
    form.target = '_blank';

    // Add the report HTML as a hidden input
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'reportHTML';
    input.value = reportHTML;
    form.appendChild(input);

    // Add a title input
    const titleInput = document.createElement('input');
    titleInput.type = 'hidden';
    titleInput.name = 'title';
    titleInput.value = 'Wall-by-Wall Material Calculation Report';
    form.appendChild(titleInput);

    // Submit the form
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}

// Function to calculate tiles - updated to return values
function calculateTiles(wallArea) {
    document.getElementById('tileResults').style.display = 'block';

    // Calculate tile area in m²
    const tileArea = (window.selectedTileSpecs.width * window.selectedTileSpecs.height) / 10000; // Convert cm² to m²

    // Calculate number of tiles needed
    const tilesNeeded = Math.ceil(wallArea / tileArea);
    const totalTilesNeeded = Math.ceil(tilesNeeded * 1.1); // 10% extra for cuts

    document.getElementById('tilesNeeded').textContent = totalTilesNeeded;

    // Calculate tiles per row and number of rows (for the summary)
    // const tileWidthM = window.selectedTileSpecs.width / 100; // Convert cm to m
    // const wallPerimeter = 2 * (parseFloat(document.getElementById('roomWidth').value) +
    //     parseFloat(document.getElementById('roomLength').value));
    // const tilesPerRow = Math.ceil(wallPerimeter / tileWidthM);
    // const rows = Math.ceil(totalTilesNeeded / tilesPerRow);
    // For the summary, calculate approximate tiles per row and rows
    // This is an estimation based on the tile width and the square root of the area

    // Calculate tiles per row and number of rows (for the summary)
    const tileWidthM = window.selectedTileSpecs.width / 100; // Convert cm to m
    const tileHeightM = window.selectedTileSpecs.height / 100; // Convert cm to m

    // Estimate perimeter based on square root of area * 4
    const estimatedPerimeter = Math.sqrt(wallArea) * 4;
    const tilesPerRow = Math.ceil(estimatedPerimeter / tileWidthM);
    const rows = Math.ceil(totalTilesNeeded / tilesPerRow);

    // Make sure to return the object with the required properties
    return {
        totalTiles: totalTilesNeeded,
        tilesPerRow: tilesPerRow,
        rows: rows
    };
}

// Function to calculate paint - updated to return values
function calculatePaint(wallArea, roomWidth, roomLength) {
    document.getElementById('paintResults').style.display = 'block';

    // Get paint options
    const coatCount = parseInt(document.getElementById('coatCount').value);
    const includeCeiling = document.getElementById('includeCeiling').checked;

    // Add ceiling area if selected
    let totalArea = wallArea;
    if (includeCeiling) {
        const ceilingArea = roomWidth * roomLength;
        totalArea += ceilingArea;
        document.getElementById('totalArea').textContent = totalArea.toFixed(2) + ' (including ceiling)';
    }

    // Assume average coverage of 10m² per liter (adjust as needed)
    const coveragePerLiter = 10;
    const litersNeeded = (totalArea * coatCount) / coveragePerLiter;

    document.getElementById('paintNeeded').textContent = litersNeeded.toFixed(2);

    // Calculate recommended can sizes
    const canSizes = [1, 2.5, 5, 10]; // Standard paint can sizes in liters
    let remainingPaint = litersNeeded;
    const cans = [];

    // Start with the largest can size and work down
    for (let i = canSizes.length - 1; i >= 0; i--) {
        const size = canSizes[i];
        const count = Math.floor(remainingPaint / size);

        if (count > 0) {
            cans.push(`${count} × ${size}L`);
            remainingPaint -= count * size;
        }
    }

    // If there's still a small amount left, add the smallest can
    if (remainingPaint > 0) {
        cans.push(`1 × ${canSizes[0]}L`);
    }

    document.getElementById('paintCans').textContent = cans.join(', ') || '1 × 1L';

    return {
        litersNeeded: litersNeeded,
        cans: cans,
        coatCount: coatCount,
        includeCeiling: includeCeiling
    };
}

// Function to calculate wallpaper - updated to return values
function calculateWallpaper(wallArea) {
    document.getElementById('wallpaperResults').style.display = 'block';

    // Get wallpaper options - check which tab is active to get the right checkbox
    let includeWaste = false;
    const wallByWallTab = document.getElementById('wall-by-wall-tab');
    const directAreaTab = document.getElementById('direct-area-tab');

    if (wallByWallTab && wallByWallTab.classList.contains('active')) {
        includeWaste = document.getElementById('includeWastePercentageWallByWall')?.checked || false;
    } else if (directAreaTab && directAreaTab.classList.contains('active')) {
        includeWaste = document.getElementById('includeWastePercentageDirect')?.checked || false;
    } else {
        includeWaste = document.getElementById('includeWastePercentage')?.checked || false;
    }

    // Standard wallpaper roll is typically 0.53m wide and 10m long
    // Use the actual dimensions if available
    const rollWidth = (window.selectedTileSpecs.width / 100) || 0.53; // Convert cm to m
    const rollLength = (window.selectedTileSpecs.height / 100) || 10; // Convert cm to m

    // Calculate area per roll
    const areaPerRoll = rollWidth * rollLength;

    // Calculate number of rolls needed
    let rollsNeeded = wallArea / areaPerRoll;

    // Add waste percentage for pattern matching if selected
    if (includeWaste) {
        rollsNeeded *= 1.15; // 15% extra
    }

    // Round up to the nearest whole roll
    rollsNeeded = Math.ceil(rollsNeeded);

    document.getElementById('wallpaperRolls').textContent = rollsNeeded;

    return {
        rollsNeeded: rollsNeeded,
        includeWaste: includeWaste,
        rollWidth: rollWidth,
        rollLength: rollLength
    };
}


// Add Estimated Cart Quantity function
function addCalculatedToCart() {
    console.log("Adding to cart. Calculated quantity:", window.calculatedQuantity);
    console.log("Selected material ID:", window.selectedMaterialId);

    // Make sure we have a calculated quantity
    if (!window.calculatedQuantity || window.calculatedQuantity <= 0) {
        alert('Please calculate the required amount first');
        return;
    }

    // Make sure we have a valid material ID
    if (!window.selectedMaterialId || isNaN(parseInt(window.selectedMaterialId))) {
        alert('No valid material ID found. Please select a material from the materials panel by clicking on it.');
        return;
    }

    // Convert values to ensure they're the correct type
    const materialId = parseInt(window.selectedMaterialId);
    const quantity = Math.max(1, Math.round(window.calculatedQuantity)); // Ensure it's a positive integer

    console.log("Sending to API - Material ID:", materialId, "Quantity:", quantity);

    // Add the calculated quantity to cart
    fetch('/api/cart/items', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            tile_id: materialId,
            quantity: quantity
        })
    })
        .then(response => {
            if (response.status === 401) {
                // Unauthorized - redirect to login
                window.location.href = '/login?next=/room_visualization_index';
                throw new Error('Not logged in');
            }
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.detail || 'Failed to add item to cart');
                });
            }
            return response.json();
        })
        .then(data => {
            // Close the materialCalculatorModal
            const materialCalculatorModal = document.getElementById('materialCalculatorModal');
            const modal = bootstrap.Modal.getInstance(materialCalculatorModal);
            if (modal) {
                modal.hide();
            }

            // Show success message
            alert(`Added ${quantity} of ${window.selectedMaterialName} to your cart!`);

            // Update cart count in navbar
            updateCartCount();
        })
        .catch(error => {
            console.error('Error adding to cart:', error);
            if (error.message !== 'Not logged in') {
                alert('Failed to add item to cart: ' + error.message);
            }
        });
}


// Initialize the material calculator when the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Set up event listeners for the calculator modal
    const materialCalculatorModal = document.getElementById('materialCalculatorModal');
    if (materialCalculatorModal) {
        materialCalculatorModal.addEventListener('show.bs.modal', initializeCalculator);
    }

    // Add event listeners for the "Add Deduction" button
    const addDeductionBtn = document.getElementById('addDeductionBtn');
    if (addDeductionBtn) {
        addDeductionBtn.addEventListener('click', addDeduction);
    }

    // Add event listeners for the "Add Wall" button
    const addWallBtn = document.getElementById('addWallBtn');
    if (addWallBtn) {
        addWallBtn.addEventListener('click', addWall);
    }

    // Add event listener for tab changes to update the calculate button behavior
    const calculationTabs = document.querySelectorAll('#calculationMethodTabs .nav-link');
    if (calculationTabs) {
        calculationTabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', function () {
                // Update the calculate button text based on the active tab
                const calculateBtn = document.getElementById('calculateBtn');
                if (calculateBtn) {
                    const isWallByWall = this.id === 'wall-by-wall-tab';
                    calculateBtn.textContent = isWallByWall ? 'Calculate Wall-by-Wall' : 'Calculate';
                }
            });
        });
    }

    // Add event listener for the "Include Ceiling" checkbox
    const includeCeilingWallByWall = document.getElementById('includeCeilingWallByWall');
    if (includeCeilingWallByWall) {
        includeCeilingWallByWall.addEventListener('change', function () {
            const ceilingDetails = document.getElementById('ceilingDetails');
            if (ceilingDetails) {
                ceilingDetails.style.display = this.checked ? 'block' : 'none';
            }
        });
    }

    // Add Direct Area Input
    const includeCeilingDirect = document.getElementById('includeCeilingDirect');
    if (includeCeilingDirect) {
        includeCeilingDirect.addEventListener('change', function () {
            const ceilingDetailsDirect = document.getElementById('ceilingDetailsDirect');
            if (ceilingDetailsDirect) {
                ceilingDetailsDirect.style.display = this.checked ? 'block' : 'none';
            }
        });
    }

    // Add event listeners for all coat count selectors
    const coatSelectors = ['coatCount', 'coatCountWallByWall', 'coatCountDirect'];

    coatSelectors.forEach(function (selectorId) {
        const selector = document.getElementById(selectorId);
        if (selector) {
            selector.addEventListener('change', function () {
                // Recalculate when coat count changes
                calculateMaterials();
            });
        }
    });

    // Add event listeners for wallpaper waste checkboxes
    const wasteCheckboxes = [
        'includeWastePercentage',
        'includeWastePercentageWallByWall',
        'includeWastePercentageDirect'
    ];

    wasteCheckboxes.forEach(function (checkboxId) {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.addEventListener('change', function () {
                // Recalculate when waste option changes
                calculateMaterials();
            });
        }
    });

    // Add event listeners for floor checkboxes
    const floorCheckboxes = [
        'includeFloor',
        'includeFloorWallByWall',
        'includeFloorDirect'
    ];

    floorCheckboxes.forEach(function (checkboxId) {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.addEventListener('change', function () {
                // Show/hide floor area inputs
                if (checkboxId === 'includeFloorDirect') {
                    const floorDetails = document.getElementById('floorDetailsDirect');
                    if (floorDetails) {
                        floorDetails.style.display = this.checked ? 'block' : 'none';
                    }
                } else if (checkboxId === 'includeFloorWallByWall') {
                    const floorDetails = document.getElementById('ceilingDetails');
                    if (floorDetails) {
                        floorDetails.style.display = this.checked ? 'block' : 'none';
                    }
                }

                // Recalculate when floor option changes
                calculateMaterials();
            });
        }
    });

    // console.log('Document ready, adding login prompt and See More buttons');

    // // Add with a slight delay to ensure DOM is fully ready
    // setTimeout(function() {
    //     addLoginPromptToSidebar();
    //     addSeeMoreButtons();
    // }, 500);

});