function downloadImage(event) {
    event.preventDefault();
    const imagePath = document.getElementById('imageResult').src;
    const fileName = `RoomFlux-design-with-${currentTextureName}-texture.jpg`;
    
    const link = document.createElement('a');
    link.href = imagePath;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.dispatchEvent(new MouseEvent('click'));
}

function copyLink() {
    const imagePath = document.getElementById('imageResult').src;
    const fullUrl = window.location.origin + imagePath;
    navigator.clipboard.writeText(fullUrl).then(() => {
        // Add a visual feedback for successful copy
        const shareButton = document.querySelector('[data-bs-toggle="dropdown"]');
        const originalText = shareButton.innerHTML;
        shareButton.innerHTML = '<i class="fa fa-check mr-2"></i> Copied!';
        setTimeout(() => {
            shareButton.innerHTML = originalText;
        }, 2000);
    });
}
// function copyLink() {
//     const url = window.location.href;
//     navigator.clipboard.writeText(url).then(() => {
//         alert('Link copied to clipboard!');
//     });
// }

function shareToTelegram() {
    const imageUrl = encodeURIComponent(document.getElementById('imageResult').src);
    const text = encodeURIComponent(`Check out my room designed through RoomFlux platform with ${currentTextureName} texture!`);
    window.open(`https://t.me/share/url?url=${imageUrl}&text=${text}`);
}

function shareToWhatsApp() {
    const imageUrl = document.getElementById('imageResult').src;
    const imagePath = imageUrl.replace(window.location.origin, '');
    const cleanUrl = window.location.origin + imagePath.split('?')[0];
    const message = `Check out my room design with ${currentTextureName} texture!`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message + '\n' + cleanUrl)}`;
    window.open(whatsappUrl);
}

// function shareToFacebook() {
//     const imageUrl = encodeURIComponent(document.getElementById('imageResult').src);
//     window.open(`https://www.facebook.com/sharer/sharer.php?u=${imageUrl}`);
// }

// function shareToInstagram() {
//     // Instagram requires the app to be installed
//     const imageUrl = encodeURIComponent(document.getElementById('imageResult').src);
//     const text = encodeURIComponent(`Check out my room design with ${currentTextureName} texture!`);
//     window.open(`instagram://library?AssetPath=${imageUrl}`);
// }

// function shareToInstagram() {
//     const imageUrl = document.getElementById('imageResult').src;
//     const cleanUrl = imageUrl.split('?')[0];
//     // Open Instagram web feed in a new tab
//     window.open('https://instagram.com');
//     // Show instructions to user
//     alert('To share on Instagram:\n1. Save the image (use Download button)\n2. Upload to Instagram\n3. Copy and paste this description:\nRoom design with ' + currentTextureName + ' texture');
// }

// function shareToPinterest() {
//     const imageUrl = encodeURIComponent(document.getElementById('imageResult').src);
//     const description = encodeURIComponent(`Room design with ${currentTextureName} texture`);
//     window.open(`https://pinterest.com/pin/create/button/?url=${window.location.href}&media=${imageUrl}&description=${description}`);
// }


function toggleAR() {
    // AR implementation will go here
    alert('AR feature coming soon!');
}

// document.addEventListener('DOMContentLoaded', function() {
//     // Initialize all Bootstrap modals
//     const modals = document.querySelectorAll('.modal');
//     modals.forEach(modal => {
//         new bootstrap.Modal(modal);
//     });
// });
function initBootstrapModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
      new bootstrap.Modal(modal);
  });
}

function showTileCalculator(event) {
    event.preventDefault();
    const tileCalculatorModal = document.getElementById('tileCalculatorModal');
    const modal = bootstrap.Modal.getInstance(tileCalculatorModal) || new bootstrap.Modal(tileCalculatorModal);
    modal.show();
}


// function calculateTiles() {
//     if (!window.selectedTileSpecs) {
//         alert('Please select a tile first!');
//         return;
//     }
//     console.log('Calculating tiles...');
//     console.log('Selected Tile Specs:', window.selectedTileSpecs);
//     fetch(`/api/tiles/${window.selectedTileSpecs.id}`)
//         .then(response => response.json())
//         .then(tileData => {
//             const roomWidth = parseFloat(document.getElementById('roomWidth').value);
//             const roomLength = parseFloat(document.getElementById('roomLength').value);
//             const roomHeight = parseFloat(document.getElementById('roomHeight').value);
            
//             const wallArea = 2 * (roomLength * roomHeight + roomWidth * roomHeight);
//             const tileArea = (tileData.width * tileData.height) / 10000; // Convert cm² to m²
//             const tilesNeeded = Math.ceil(wallArea / tileArea);
//             const totalTilesNeeded = Math.ceil(tilesNeeded * 1.1); // 10% extra for cuts
//             const totalCost = wallArea * tileData.price_per_sqm;
            
//             const resultHtml = `
//                 <div class="calculation-results mt-4">
//                     <h5>Calculation Results</h5>
//                     <p>Total Wall Area: ${wallArea.toFixed(2)} m²</p>
//                     <p>Tiles Needed: ${totalTilesNeeded} pieces</p>
//                     <p>Estimated Cost: $${totalCost.toFixed(2)}</p>
//                 </div>
//             `;
            
//             const previousResults = document.querySelector('.calculation-results');
//             if (previousResults) previousResults.remove();
//             document.querySelector('.modal-body').insertAdjacentHTML('beforeend', resultHtml);
//         });
// }

// document.addEventListener('DOMContentLoaded', function() {
//     var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
//     var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
//         return new bootstrap.Tooltip(tooltipTriggerEl);
//     });
// });
function initBootstrapTooltips() {
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

function calculateTiles() {
    console.log('Calculating tiles...'); // Debug log
    console.log('Selected Tile Specs:', window.selectedTileSpecs);
    
    const roomWidth = parseFloat(document.getElementById('roomWidth').value);
    const roomLength = parseFloat(document.getElementById('roomLength').value);
    const roomHeight = parseFloat(document.getElementById('roomHeight').value);
    
    if (!roomWidth || !roomLength || !roomHeight) {
        alert('Please enter all room dimensions');
        return;
    }
    
    const wallArea = 2 * (roomLength * roomHeight + roomWidth * roomHeight);
    const tileArea = (window.selectedTileSpecs.width * window.selectedTileSpecs.height) / 10000; // Convert cm² to m²
    const tilesNeeded = Math.ceil(wallArea / tileArea);
    const totalTilesNeeded = Math.ceil(tilesNeeded * 1.1); // 10% extra for cuts
    const totalCost = wallArea * window.selectedTileSpecs.price_per_sqm;
    
    document.getElementById('totalArea').textContent = wallArea.toFixed(2);
    document.getElementById('tilesNeeded').textContent = totalTilesNeeded;
    document.getElementById('estimatedCost').textContent = totalCost.toFixed(2);
}

function getCurrentSelectedTile() {
    // Fetch the current tile details from the server
    return fetch('/api/tiles/current')
        .then(response => response.json())
        .then(data => data.tile);
}

function toggleFields() {
    const materialType = document.getElementById('materialType')?.value || '';
    console.log('Material type selected:', materialType);
    
    const allSpecificFields = document.querySelectorAll('.material-specific');
    console.log('Found specific fields:', allSpecificFields.length);
    
    // Hide all specific fields first
    allSpecificFields.forEach(field => {
        field.style.display = 'none';
        console.log('Hiding field:', field.className);
    });
    
    // Show relevant fields based on selection
    if (materialType) {
        const selector = `.material-specific.${materialType}`;
        console.log('Looking for elements with selector:', selector);
        const relevantFields = document.querySelectorAll(selector);
        console.log('Found relevant fields:', relevantFields.length);
        
        relevantFields.forEach(field => {
            field.style.display = 'block';
            console.log('Showing field:', field.className);
        });
    }
    
    // Handle paint-specific logic
    const nonPaintFields = document.querySelectorAll('.non-paint-field');
    if (materialType === 'paint') {
        nonPaintFields.forEach(field => field.style.display = 'none');
    } else {
        nonPaintFields.forEach(field => field.style.display = 'block');
    }
}

function setupColorPicker() {
    const colorInput = document.getElementById('color_code');
    const colorPreview = document.getElementById('color-preview');
    const hexDisplay = document.getElementById('hex-display');
    
    if (colorInput && colorPreview && hexDisplay) {
        // Update color preview when color is changed
        colorInput.addEventListener('input', function() {
            const selectedColor = this.value;
            colorPreview.style.backgroundColor = selectedColor;
            hexDisplay.textContent = selectedColor;
        });
        
        // Initialize with the default color
        colorPreview.style.backgroundColor = colorInput.value;
        hexDisplay.textContent = colorInput.value;
    }
}

/**
 * Initializes the price range slider
 */
function initPriceRangeSlider() {
  const priceSlider = document.getElementById('priceRangeSlider');
  if (priceSlider) {
    console.error("Price slider element found");
    return;
  }
  if (!priceSlider) {
    console.error("Price slider element not found");
    return;
  }
  
  // Get min and max prices from materials
  let minPrice = 0;
  let maxPrice = 5000;
  
  const materialItems = document.querySelectorAll('.material-item');
  if (materialItems.length > 0) {
    const prices = Array.from(materialItems)
      .map(item => parseFloat(item.getAttribute('data-price') || 0))
      .filter(price => !isNaN(price));
    
    if (prices.length > 0) {
      minPrice = Math.floor(Math.min(...prices));
      maxPrice = Math.ceil(Math.max(...prices));
    }
  }
  
  // Create the slider
  noUiSlider.create(priceSlider, {
    start: [minPrice, maxPrice],
    connect: true,
    range: {
      'min': minPrice,
      'max': maxPrice
    }
  });
  
  // Update display values and hidden inputs
  const minPriceDisplay = document.getElementById('minPriceDisplay');
  const maxPriceDisplay = document.getElementById('maxPriceDisplay');
  const minPriceInput = document.getElementById('minPrice');
  const maxPriceInput = document.getElementById('maxPrice');
  
  priceSlider.noUiSlider.on('update', function(values, handle) {
    const value = Math.round(values[handle]);
    
    if (handle === 0) {
      if (minPriceDisplay) minPriceDisplay.textContent = value;
      if (minPriceInput) minPriceInput.value = value;
    } else {
      if (maxPriceDisplay) maxPriceDisplay.textContent = value;
      if (maxPriceInput) maxPriceInput.value = value;
    }
  });
  
  // Filter materials when slider values change
  priceSlider.noUiSlider.on('change', filterMaterialsByPrice);
}


/**
* Filters materials based on the current price range
*/
function filterMaterialsByPrice() {
 console.log("Filtering materials by price");
 
 const minPrice = parseFloat(document.getElementById('minPrice').value);
 const maxPrice = parseFloat(document.getElementById('maxPrice').value);
 
 console.log(`Price range: ${minPrice} - ${maxPrice}`);
 
 const materialItems = document.querySelectorAll('.material-item');
 console.log(`Found ${materialItems.length} material items`);
 
 let visibleCount = 0;
 let hiddenCount = 0;
 
 materialItems.forEach(item => {
   const itemPrice = parseFloat(item.getAttribute('data-price') || 0);
   console.log(`Material item price: ${itemPrice}`);
   
   if (itemPrice >= minPrice && itemPrice <= maxPrice) {
     item.style.display = '';
     visibleCount++;
   } else {
     item.style.display = 'none';
     hiddenCount++;
   }
 });
 
 console.log(`Filtering complete: ${visibleCount} visible, ${hiddenCount} hidden`);
}


/**
 * Initializes search functionality
 */
function initSearchFunctionality() {
  const searchInput = document.getElementById('searchMaterials');
  const searchTypeSelect = document.getElementById('searchType');
  const searchButton = document.getElementById('searchButton');
  
  if (!searchInput) {
    console.warn("Search input not found");
    return;
  }
  
  const performSearch = function() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const searchType = searchTypeSelect ? searchTypeSelect.value : 'all';
    console.log(`Searching for "${searchTerm}" in ${searchType}`);
    
    const materialItems = document.querySelectorAll('.material-item');
    
    materialItems.forEach(item => {
      let shouldShow = false;
      
      if (searchTerm === '') {
        shouldShow = true;
      } else {
        const materialName = item.querySelector('.material-name')?.textContent.toLowerCase() || '';
        const materialType = item.getAttribute('data-material')?.toLowerCase() || '';
        const manufacturer = item.getAttribute('data-manufacturer')?.toLowerCase() || '';
        const description = item.getAttribute('data-description')?.toLowerCase() || '';
        
        // Check based on search type
        if (searchType === 'all') {
          shouldShow = materialName.includes(searchTerm) || 
                      materialType.includes(searchTerm) || 
                      manufacturer.includes(searchTerm) ||
                      description.includes(searchTerm);
        } else if (searchType === 'name') {
          shouldShow = materialName.includes(searchTerm);
        } else if (searchType === 'manufacturer') {
          shouldShow = manufacturer.includes(searchTerm);
        } else if (searchType === 'description') {
          shouldShow = description.includes(searchTerm);
        }
      }
      
      // Apply visibility
      item.style.display = shouldShow ? '' : 'none';
    });
  };
  
  // Attach event listeners
  searchInput.addEventListener('input', performSearch);
  if (searchTypeSelect) {
    searchTypeSelect.addEventListener('change', performSearch);
  }
  if (searchButton) {
    searchButton.addEventListener('click', performSearch);
  }
  
  // Also trigger search on Enter key
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
}

/**
 * Initializes finish type filtering
 */
function initFinishTypeFiltering() {
  const finishTypeCheckboxes = document.querySelectorAll('.finish-type-checkbox');
  
  finishTypeCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', filterMaterialsByFinishType);
  });
}

/**
 * Filters materials based on selected finish types
 */
function filterMaterialsByFinishType() {
  const selectedFinishTypes = Array.from(
    document.querySelectorAll('.finish-type-checkbox:checked')
  ).map(checkbox => checkbox.value);
  
  console.log('Selected finish types:', selectedFinishTypes);
  
  const materialItems = document.querySelectorAll('.material-item');
  
  materialItems.forEach(item => {
    const itemFinish = item.getAttribute('data-finish');
    
    // If no finish types are selected, show all items
    // Otherwise, only show items with matching finish type
    if (selectedFinishTypes.length === 0 || selectedFinishTypes.includes(itemFinish)) {
      // Only change display if it's not already hidden by another filter
      if (item.style.display !== 'none' || selectedFinishTypes.length === 0) {
        item.style.display = '';
      }
    } else {
      item.style.display = 'none';
    }
  });
}


/**
 * Initializes the grid/list view toggle
 */
function initViewToggle() {
  const gridViewBtn = document.getElementById('gridViewBtn');
  const listViewBtn = document.getElementById('listViewBtn');
  const materialsContainer = document.getElementById('materialsContainer');
  
  if (gridViewBtn && listViewBtn && materialsContainer) {
    gridViewBtn.addEventListener('click', function() {
      materialsContainer.classList.remove('list-view');
      gridViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
    });
    
    listViewBtn.addEventListener('click', function() {
      materialsContainer.classList.add('list-view');
      listViewBtn.classList.add('active');
      gridViewBtn.classList.remove('active');
    });
  }
}


// Add this function to your enhanced-features.js file
function setupCategoryFilters() {
  const categoryButtons = document.querySelectorAll('.category-btn');
  const materialCards = document.querySelectorAll('.material-card');
  
  categoryButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      const selectedCategory = this.getAttribute('data-category');
      
      // Show/hide material cards based on category
      materialCards.forEach(card => {
        if (selectedCategory === 'all' || card.getAttribute('data-material') === selectedCategory) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}


// Update the selectTexture function to store the name
// function selectTexture(imagePath, specs) {
//   // Store the selected texture details globally
//   window.selectedTileSpecs = specs;
//   window.currentTextureName = specs.name || 'unknown';
  
//   // Show the action buttons
//   document.getElementById('actionButtonsContainer').style.display = 'flex';
  
//   // Update the tile calculator modal with the selected tile info
//   document.getElementById('selectedTilePreview').src = imagePath;
//   document.getElementById('selectedTileName').textContent = specs.name || 'Selected Tile';
//   document.getElementById('tileSize').textContent = `${specs.width}cm × ${specs.height}cm`;
//   document.getElementById('tilePrice').textContent = specs.price_per_sqm;
  
//   // Apply the texture to the room
//   fetch(`/apply_texture/${imagePath}`)
//     .then(response => response.json())
//     .then(data => {
//       if (data.state === "success") {
//         document.getElementById('imageResult').src = data.room_path;
//       } else {
//         console.error('Error applying texture:', data.message);
//       }
//     })
//     .catch(error => {
//       console.error('Error:', error);
//     });
// }
  
// Define all functions outside of DOMContentLoaded
function initBootstrapModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        new bootstrap.Modal(modal);
    });
}

function initBootstrapTooltips() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function initMaterialTypeFiltering() {
    const materialTypeButtons = document.querySelectorAll('.material-type-btn');
    console.log("Found material type buttons:", materialTypeButtons.length);

    materialTypeButtons.forEach(button => {
        button.addEventListener('click', function () {
            console.log("Category button clicked:", this.getAttribute('data-category'));

            // Remove active class from all buttons
            materialTypeButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            const selectedCategory = this.getAttribute('data-category');

            // Get all material items
            const materialItems = document.querySelectorAll('.material-item');
            console.log("Found material items:", materialItems.length);

            // Show/hide material items based on category
            materialItems.forEach(item => {
                if (selectedCategory === 'all' || item.getAttribute('data-material') === selectedCategory) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

function initSearchFunctionality() {
    const searchInput = document.getElementById('searchMaterials');
    const searchTypeSelect = document.getElementById('searchType');

    if (searchInput && searchTypeSelect) {
        console.log("Search input and type selector found");
       
        const performSearch = function() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const searchType = searchTypeSelect.value;
            console.log(`Searching for "${searchTerm}" in ${searchType}`);
           
            const materialItems = document.querySelectorAll('.material-item');
           
            materialItems.forEach(item => {
                let shouldShow = false;
               
                if (searchTerm === '') {
                    shouldShow = true;
                } else {
                    const materialName = item.querySelector('.material-name')?.textContent.toLowerCase() || '';
                    const materialType = item.getAttribute('data-material')?.toLowerCase() || '';
                    const manufacturer = item.getAttribute('data-manufacturer')?.toLowerCase() || '';
                    const description = item.getAttribute('data-description')?.toLowerCase() || '';
                   
                    // Check based on search type
                    if (searchType === 'all') {
                        shouldShow = materialName.includes(searchTerm) ||
                                    materialType.includes(searchTerm) ||
                                    manufacturer.includes(searchTerm) ||
                                    description.includes(searchTerm);
                    } else if (searchType === 'name') {
                        shouldShow = materialName.includes(searchTerm);
                    } else if (searchType === 'manufacturer') {
                        shouldShow = manufacturer.includes(searchTerm);
                    } else if (searchType === 'description') {
                        shouldShow = description.includes(searchTerm);
                    }
                }
               
                // Apply visibility
                item.style.display = shouldShow ? '' : 'none';
            });
        };
       
        // Attach event listeners
        searchInput.addEventListener('input', performSearch);
        searchTypeSelect.addEventListener('change', performSearch);
    }
}

function initViewToggle() {
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const materialsContainer = document.getElementById('materialsContainer');

    if (gridViewBtn && listViewBtn && materialsContainer) {
        gridViewBtn.addEventListener('click', function () {
            materialsContainer.classList.remove('list-view');
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
        });

        listViewBtn.addEventListener('click', function () {
            materialsContainer.classList.add('list-view');
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
        });
    }
}

function populateManufacturerFilter() {
    const manufacturerFilter = document.getElementById('manufacturerFilter');
    if (manufacturerFilter) {
        const manufacturers = new Set();
        const materialItems = document.querySelectorAll('.material-item');

        materialItems.forEach(item => {
            const manufacturer = item.getAttribute('data-manufacturer');
            if (manufacturer) {
                manufacturers.add(manufacturer);
            }
        });

        manufacturers.forEach(manufacturer => {
            const option = document.createElement('option');
            option.value = manufacturer;
            option.textContent = manufacturer;
            manufacturerFilter.appendChild(option);
        });
    }
}

function applyFilters() {
    console.log("Applying filters...");
   
    const selectedManufacturer = document.getElementById('manufacturerFilter').value;
    const finishTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const minPrice = parseFloat(document.getElementById('minPrice').value);
    const maxPrice = parseFloat(document.getElementById('maxPrice').value);
   
    console.log(`Filtering by price range: ${minPrice} - ${maxPrice}`);
    console.log(`Selected manufacturer: ${selectedManufacturer}`);
    console.log(`Selected finish types: ${finishTypes.join(', ')}`);
   
    const materialItems = document.querySelectorAll('.material-item');
   
    materialItems.forEach(item => {
        let shouldShow = true;
       
        // Filter by manufacturer
        if (selectedManufacturer && selectedManufacturer !== 'all') {
            if (item.getAttribute('data-manufacturer') !== selectedManufacturer) {
                shouldShow = false;
            }
        }
       
        // Filter by finish type
        if (finishTypes.length > 0) {
            const itemFinish = item.getAttribute('data-finish');
            if (!finishTypes.includes(itemFinish)) {
                shouldShow = false;
            }
        }
       
        // Filter by price
        const itemPrice = parseFloat(item.getAttribute('data-price') || 0);
        if (itemPrice < minPrice || itemPrice > maxPrice) {
            shouldShow = false;
        }
       
        // Apply visibility
        item.style.display = shouldShow ? '' : 'none';
    });
   
    // Close filter panel after applying
    const filterPanel = document.getElementById('filterPanel');
    if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
        const bsCollapse = bootstrap.Collapse.getInstance(filterPanel) || new bootstrap.Collapse(filterPanel);
        bsCollapse.hide();
    } else {
        // Fallback if Bootstrap JS is not available
        filterPanel.classList.remove('show');
    }
}

function clearFilters() {
    // Reset manufacturer filter
    if (document.getElementById('manufacturerFilter')) {
        document.getElementById('manufacturerFilter').value = 'all';
    }

    // Uncheck all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });

    // Reset price range slider
    const priceSlider = document.getElementById('priceRangeSlider');
    if (priceSlider && priceSlider.noUiSlider) {
        const min = priceSlider.noUiSlider.options.range.min;
        const max = priceSlider.noUiSlider.options.range.max;
        priceSlider.noUiSlider.set([min, max]);
    }

    // Show all items (respecting the current category filter)
    const activeCategory = document.querySelector('.material-type-btn.active')?.getAttribute('data-category') || 'all';
    const materialItems = document.querySelectorAll('.material-item');

    materialItems.forEach(item => {
        if (activeCategory === 'all' || item.getAttribute('data-material') === activeCategory) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Update this function to properly handle room category filtering
function initRoomCategoryFilters() {
  console.log("Initializing room category filters");
  const categoryButtons = document.querySelectorAll('.room-category-filters .btn');
  const sampleRoomItems = document.querySelectorAll('.sample-room-item');
  
  console.log(`Found ${categoryButtons.length} category buttons and ${sampleRoomItems.length} sample room items`);
  
  categoryButtons.forEach(button => {
    button.addEventListener('click', function() {
      const selectedCategory = this.getAttribute('data-category');
      console.log(`Selected category: ${selectedCategory}`);
      
      // Remove active class from all buttons
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Show/hide sample room items based on category
      sampleRoomItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        console.log(`Item category: ${itemCategory}, Selected: ${selectedCategory}`);
        
        if (selectedCategory === 'all' || itemCategory === selectedCategory) {
          item.style.display = '';
          console.log(`Showing item with category ${itemCategory}`);
        } else {
          item.style.display = 'none';
          console.log(`Hiding item with category ${itemCategory}`);
        }
      });
    });
  });
}


// Single DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing all components");
    
    // Initialize Bootstrap components
    initBootstrapModals();
    initBootstrapTooltips();
    
    // Initialize price range slider
    initPriceRangeSlider();
    
    // Initialize material sidebar functionality
    initMaterialTypeFiltering();
    initSearchFunctionality();
    initViewToggle();
    populateManufacturerFilter();
    
    // Connect filter buttons
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    
    if (applyFiltersBtn && clearFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Initialize material form components
    const materialTypeSelect = document.getElementById('materialType');
    if (materialTypeSelect) {
        toggleMaterialFields();
        materialTypeSelect.addEventListener('change', toggleMaterialFields);
    }
    
    setupPaintTypeToggle();
    setupColorPicker();
    initRoomCategoryFilters();
});

// Update the selectTexture function to store the name and show action buttons
// function selectTexture(imagePath, specs) {
//   // Store the selected texture details globally
//   window.selectedTileSpecs = specs;
//   window.currentTextureName = specs.name || 'unknown';

//   // Show the action buttons
//   const actionButtonsContainer = document.getElementById('actionButtonsContainer');
//   if (actionButtonsContainer) {
//     actionButtonsContainer.style.display = 'flex';
//   }

//   // Update the tile calculator modal with the selected tile info
//   const selectedTilePreview = document.getElementById('selectedTilePreview');
//   const selectedTileName = document.getElementById('selectedTileName');
//   const tileSize = document.getElementById('tileSize');
//   const tilePrice = document.getElementById('tilePrice');

//   if (selectedTilePreview) selectedTilePreview.src = imagePath;
//   if (selectedTileName) selectedTileName.textContent = specs.name || 'Selected Tile';
//   if (tileSize) tileSize.textContent = `${specs.width}cm × ${specs.height}cm`;
//   if (tilePrice) tilePrice.textContent = specs.price_per_sqm;

//   // Apply the texture to the room
//   fetch(`/apply_texture/${imagePath}`)
//     .then(response => response.json())
//     .then(data => {
//       if (data.state === "success") {
//         document.getElementById('imageResult').src = data.room_path;
//       } else {
//         console.error('Error applying texture:', data.message);
//       }
//     })
//     .catch(error => {
//       console.error('Error:', error);
//     });
// }

// Setup color picker for paint
// function setupColorPicker() {
//   const colorPicker = document.getElementById('color_code');
//   const colorPreview = document.getElementById('color-preview');
//   const hexDisplay = document.getElementById('hex-display');

//   if (colorPicker && colorPreview && hexDisplay) {
//     // Set initial values
//     colorPreview.style.backgroundColor = colorPicker.value;
//     hexDisplay.textContent = colorPicker.value;

//     // Update on change
//     colorPicker.addEventListener('input', function () {
//       colorPreview.style.backgroundColor = this.value;
//       hexDisplay.textContent = this.value;
//     });
//   }
// }

// Initialize tooltips
function initTooltips() {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}


/**
 * Filters materials based on the current price range
 
function filterMaterialsByPrice() {
  const minPrice = parseFloat(document.getElementById('minPrice').value);
  const maxPrice = parseFloat(document.getElementById('maxPrice').value);
  
  console.log(`Filtering by price range: ${minPrice} - ${maxPrice}`);
  
  const materialItems = document.querySelectorAll('.material-item');
  
  materialItems.forEach(item => {
    const itemPrice = parseFloat(item.getAttribute('data-price') || 0);
    
    // Check if the item is already hidden by another filter
    if (item.style.display !== 'none') {
      if (itemPrice >= minPrice && itemPrice <= maxPrice) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    }
  });
}

*/


// Update applyFilters function to include price range
function applyFilters() {
  const selectedManufacturer = document.getElementById('manufacturerFilter').value;
  const finishTypes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
  const minPrice = parseFloat(document.getElementById('minPrice').value);
  const maxPrice = parseFloat(document.getElementById('maxPrice').value);
  
  const materialItems = document.querySelectorAll('.material-item');
  
  materialItems.forEach(item => {
    let shouldShow = true;
    
    // Filter by manufacturer
    if (selectedManufacturer !== 'all') {
      if (item.getAttribute('data-manufacturer') !== selectedManufacturer) {
        shouldShow = false;
      }
    }
    
    // Filter by finish type
    if (finishTypes.length > 0) {
      const itemFinish = item.getAttribute('data-finish');
      if (!finishTypes.includes(itemFinish)) {
        shouldShow = false;
      }
    }
    
    // Filter by price
    const itemPrice = parseFloat(item.getAttribute('data-price') || 0);
    if (itemPrice < minPrice || itemPrice > maxPrice) {
      shouldShow = false;
    }
    
    // Apply visibility
    item.style.display = shouldShow ? '' : 'none';
  });
  
  // Close filter panel after applying
  const filterPanel = document.getElementById('filterPanel');
  if (bootstrap && bootstrap.Collapse) {
    const bsCollapse = new bootstrap.Collapse(filterPanel);
    bsCollapse.hide();
  } else {
    // Fallback if Bootstrap JS is not available
    filterPanel.classList.remove('show');
  }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Toggling material fields...');
    // Get the material type dropdown
    const materialTypeSelect = document.getElementById('materialType');
    console.log('Material type selected:', materialType);
    
    // Function to show/hide material-specific fields
    function toggleMaterialFields() {
        // Hide all material-specific divs first
        document.querySelectorAll('.material-specific').forEach(div => {
            div.style.display = 'none';
            
            // Disable all inputs in hidden divs to prevent them from being submitted
            div.querySelectorAll('input, select, textarea').forEach(input => {
                input.disabled = true;
            });
        });
        
        // Show the selected material's fields
        const selectedMaterial = materialTypeSelect.value;
        if (selectedMaterial) {
            const materialDiv = document.querySelector(`.material-specific.${selectedMaterial}`);
            if (materialDiv) {
                materialDiv.style.display = 'block';
                
                // Enable all inputs in the visible div
                materialDiv.querySelectorAll('input, select, textarea').forEach(input => {
                    input.disabled = false;
                });
            }
        }
        
        // Make sure common fields are always enabled
        document.querySelectorAll('.form-group:not(.material-specific) input, .form-group:not(.material-specific) select, .form-group:not(.material-specific) textarea').forEach(input => {
            input.disabled = false;
        });

        // Handle paint-specific logic - hide non-paint fields when paint is selected
        const nonPaintFields = document.querySelectorAll('.non-paint-field');
        if (selectedMaterial === 'paint') {
            nonPaintFields.forEach(field => {
                field.style.display = 'none';
                // Disable inputs in hidden fields
                field.querySelectorAll('input, select, textarea').forEach(input => {
                    input.disabled = true;
                });
            });
        } else {
            nonPaintFields.forEach(field => {
                field.style.display = 'block';
                // Enable inputs in visible fields
                field.querySelectorAll('input, select, textarea').forEach(input => {
                    input.disabled = false;
                });
            });
        }
    }    
    
    // Handle paint type selection
    function setupPaintTypeToggle() {
        const paintTypeSelect = document.getElementById('paint_type');
        if (paintTypeSelect) {
            paintTypeSelect.addEventListener('change', function() {
                // Hide all paint type fields
                document.querySelectorAll('.paint-type-fields').forEach(div => {
                    div.style.display = 'none';
                    
                    // Disable inputs in hidden paint type fields
                    div.querySelectorAll('input, select, textarea').forEach(input => {
                        input.disabled = true;
                    });
                });
                
                // Show the selected paint type fields
                if (this.value === 'solid') {
                    const solidFields = document.getElementById('solid_paint_fields');
                    solidFields.style.display = 'block';
                    
                    // Enable inputs in solid paint fields
                    solidFields.querySelectorAll('input, select, textarea').forEach(input => {
                        input.disabled = false;
                    });
                    
                    document.getElementById('textured_paint_fields').style.display = 'none';
                } else if (this.value === 'textured') {
                    const texturedFields = document.getElementById('textured_paint_fields');
                    texturedFields.style.display = 'block';
                    
                    // Enable inputs in textured paint fields
                    texturedFields.querySelectorAll('input, select, textarea').forEach(input => {
                        input.disabled = false;
                    });
                    
                    document.getElementById('solid_paint_fields').style.display = 'none';
                }
            });
            
            // Trigger change event to show the initially selected paint type
            paintTypeSelect.dispatchEvent(new Event('change'));
        }
    }


    
    // Call the functions on page load
    // if (materialTypeSelect) {
    //     toggleMaterialFields();
    //     materialTypeSelect.addEventListener('change', toggleMaterialFields);
    // }
    // if (materialTypeSelect) {
    //   materialTypeSelect.addEventListener('change', toggleFields);
    //   toggleFields(); // Initialize on page load
    // }
    if (materialTypeSelect) {
      materialTypeSelect.addEventListener('change', toggleFields);
      // Initialize fields on page load
      toggleFields();
    }
    
    setupPaintTypeToggle();
    setupColorPicker();
    initTooltips();
    setupFormValidation();
    // Initialize price range slider
    setTimeout(function() {
      initPriceRangeSlider();
    }, 500); // Small delay to ensure everything is loaded
    
    setupCategoryFilters();

    initMaterialTypeFiltering();
    initSearchFunctionality();
    initViewToggle();
});

// Add form validation
// const form = document.querySelector('.texture-upload-form');
// if (form) {
//     form.addEventListener('submit', function(event) {
//         // Get the selected material type
//         const materialType = document.getElementById('materialType').value;
//         let isValid = true;
        
//         // Validate based on material type
//         if (materialType === 'tile' || materialType === 'wallpaper' || materialType === 'flooring') {
//             const widthInput = document.querySelector(`.material-specific.${materialType} input[name="size_width"]`);
//             const heightInput = document.querySelector(`.material-specific.${materialType} input[name="size_height"]`);
            
//             // Check if width and height are provided
//             if (!widthInput.value || widthInput.value <= 0) {
//                 alert(`Width is required for ${materialType}`);
//                 isValid = false;
//             }
            
//             if (!heightInput.value || heightInput.value <= 0) {
//                 alert(`Height is required for ${materialType}`);
//                 isValid = false;
//             }
//         }
        
//         // Validate paint type
//         if (materialType === 'paint') {
//             const paintType = document.getElementById('paint_type').value;
            
//             if (paintType === 'solid') {
//                 const colorCode = document.getElementById('color_code').value;
//                 if (!colorCode) {
//                     alert('Color code is required for solid paint');
//                     isValid = false;
//                 }
//             } else if (paintType === 'textured') {
//                 const imageInput = document.getElementById('paint_image');
//                 if (!imageInput.files || imageInput.files.length === 0) {
//                     alert('Texture image is required for textured paint');
//                     isValid = false;
//                 }
//             }
//         }
        
//         // If validation fails, prevent form submission
//         if (!isValid) {
//             event.preventDefault();
//         }
//     });
// }

document.addEventListener('DOMContentLoaded', function() {
    // Get the form
    const form = document.querySelector('.texture-upload-form');
    
    if (form) {
        form.addEventListener('submit', function(event) {
            // Get the selected material type
            const materialType = document.getElementById('materialType').value;
            let isValid = true;
            console.log("Form submission - Material type:", materialType);

            // Log all form fields
            const formData = new FormData(form);
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }
    
            // Validate based on material type
            if (materialType === 'tile' || materialType === 'wallpaper' || materialType === 'flooring') {
                const widthInput = document.querySelector(`.material-specific.${materialType} input[name="size_width"]`);
                const heightInput = document.querySelector(`.material-specific.${materialType} input[name="size_height"]`);
                
                // Check if width and height are provided
                if (!widthInput.value || widthInput.value <= 0) {
                    widthInput.classList.add('is-invalid');
                    isValid = false;
                } else {
                    widthInput.classList.remove('is-invalid');
                }
                
                if (!heightInput.value || heightInput.value <= 0) {
                    heightInput.classList.add('is-invalid');
                    isValid = false;
                } else {
                    heightInput.classList.remove('is-invalid');
                }
            }
            
            // Validate paint type
            if (materialType === 'paint') {
                const paintType = document.getElementById('paint_type').value;
                
                if (paintType === 'solid') {
                    const colorCode = document.getElementById('color_code').value;
                    if (!colorCode) {
                        document.getElementById('color_code').classList.add('is-invalid');
                        isValid = false;
                    } else {
                        document.getElementById('color_code').classList.remove('is-invalid');
                    }
                } else if (paintType === 'textured') {
                    const imageInput = document.getElementById('paint_image');
                    if (!imageInput.files || imageInput.files.length === 0) {
                        imageInput.classList.add('is-invalid');
                        isValid = false;
                    } else {
                        imageInput.classList.remove('is-invalid');
                    }
                }
            }
            
            // If validation fails, prevent form submission
            if (!isValid) {
                event.preventDefault();
                // Scroll to the first invalid field
                const firstInvalid = document.querySelector('.is-invalid');
                if (firstInvalid) {
                    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }
});




// function calculateTiles() {
//     const roomWidth = parseFloat(document.getElementById('roomWidth').value);
//     const roomLength = parseFloat(document.getElementById('roomLength').value);
//     const roomHeight = parseFloat(document.getElementById('roomHeight').value);
//     const tileWidth = parseFloat(document.getElementById('tileWidth').value) / 100; // convert cm to m
//     const tileHeight = parseFloat(document.getElementById('tileHeight').value) / 100;

//     const wallArea = 2 * (roomLength * roomHeight + roomWidth * roomHeight);
//     const tilesNeeded = Math.ceil(wallArea / (tileWidth * tileHeight));
    
//     // Add 10% extra for cuts and waste
//     const totalTilesNeeded = Math.ceil(tilesNeeded * 1.1);

//     alert(`You will need approximately ${totalTilesNeeded} tiles for your room walls.`);
// }


