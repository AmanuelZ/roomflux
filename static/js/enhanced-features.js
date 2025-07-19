
// Global variables to store selected material info
// window.selectedMaterialId = null;
// window.selectedMaterialName = '';
// window.selectedMaterialPrice = 0;
// window.calculatedQuantity = 0;

function downloadImage(event) {
  event.preventDefault();
  const imagePath = document.getElementById('imageResult').src;
  const fileName = `RoomFlux-room-design-with-${currentTextureName}-texture.jpg`;

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

function toggleAR() {
  // AR implementation will go here
  alert('AR feature coming soon!');
}

function initBootstrapModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    new bootstrap.Modal(modal);
  });
}

function showCalculatorForCurrentMaterial(event) {
  event.preventDefault();

  // Check if a material has been selected
  if (!window.selectedTileSpecs) {
    alert('Please select a material first by clicking on it in the materials panel.');
    return;
  }

  // Get the material type from the selected material
  const materialType = window.selectedTileSpecs.materialType || window.selectedTileSpecs.material || 'tile';


  console.log("Opening calculator for material:", {
    id: window.selectedMaterialId,
    name: window.selectedTileSpecs.name,
    price: window.selectedTileSpecs.price_per_sqm,
    type: materialType
  });

  // Call showMaterialCalculator with the stored material information
  showMaterialCalculator(
    event,
    window.selectedMaterialId || 0,
    window.selectedTileSpecs.name || 'Selected Material',
    window.selectedTileSpecs.price_per_sqm || 0,
    window.selectedTileSpecs.image_path || '',
    materialType, // Pass the material type correctly
    window.selectedTileSpecs.width || 0,
    window.selectedTileSpecs.height || 0
  );

  // Update price unit display based on material type
  const priceUnit = document.getElementById('priceUnit');
  if (materialType === 'accessory') {
      priceUnit.textContent = 'per unit';
  } else {
      priceUnit.textContent = 'per m²';
  }
}

// function showMaterialCalculator(event) {
//     event.preventDefault();
//     const materialCalculatorModal = document.getElementById('materialCalculatorModal');
//     const modal = bootstrap.Modal.getInstance(materialCalculatorModal) || new bootstrap.Modal(materialCalculatorModal);
//     modal.show();
// }
function showMaterialCalculator(event, id, name, price, imagePath, materialType, width, height) {
  // Prevent the default click behavior
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  console.log("Showing calculator for:", {
    id: id,
    name: name,
    price: price,
    type: materialType,
    width: width,
    height: height
  });

  // Store material info
  window.selectedMaterialId = id;
  window.selectedMaterialName = name;
  window.selectedMaterialPrice = price;

  // Update modal with material info
  document.getElementById('selectedTilePreview').src = imagePath;
  document.getElementById('selectedTileName').textContent = name;
  document.getElementById('materialType').textContent = materialType;
  document.getElementById('tilePrice').textContent = price;

  // Store in window.selectedTileSpecs for the calculateMaterials function
  window.selectedTileSpecs = {
    id: id,
    width: width,
    height: height,
    price_per_sqm: price,
    name: name,
    materialType: materialType,
    image_path: imagePath
  };

  // Show/hide material-specific sections based on material type
  // First hide all material-specific sections
  const tileResults = document.getElementById('tileResults');
  const paintResults = document.getElementById('paintResults');
  const wallpaperResults = document.getElementById('wallpaperResults');
  const paintOptions = document.getElementById('paintOptions');
  const wallpaperOptions = document.getElementById('wallpaperOptions');

  if (tileResults) tileResults.style.display = 'none';
  if (paintResults) paintResults.style.display = 'none';
  if (wallpaperResults) wallpaperResults.style.display = 'none';
  if (paintOptions) paintOptions.style.display = 'none';
  if (wallpaperOptions) wallpaperOptions.style.display = 'none';

  // Then show the relevant sections based on material type
  const materialTypeLower = materialType.toLowerCase();
  if (materialTypeLower === 'tile') {
    if (tileResults) tileResults.style.display = 'block';
  } else if (materialTypeLower === 'paint') {
    if (paintResults) paintResults.style.display = 'block';
    if (paintOptions) paintOptions.style.display = 'block';
  } else if (materialTypeLower === 'wallpaper') {
    if (wallpaperResults) wallpaperResults.style.display = 'block';
    if (wallpaperOptions) wallpaperOptions.style.display = 'block';
  }

  // Show size if applicable
  const tileSizeContainer = document.getElementById('tileSizeContainer');
  const tileSize = document.getElementById('tileSize');
  if (tileSizeContainer && tileSize) {
    if (width && height) {
      tileSizeContainer.style.display = 'block';
      tileSize.textContent = `${width}cm × ${height}cm`;
    } else {
      tileSizeContainer.style.display = 'none';
    }
  }

  // Reset calculation results
  const elementsToReset = [
    'totalArea', 'tilesNeeded', 'paintNeeded', 'paintCans',
    'wallpaperRolls', 'estimatedCost', 'totalMaterialNeeded'
  ];

  elementsToReset.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.textContent = '-';
  });

  // Disable add to cart button until calculation is done
  const addToCartBtn = document.getElementById('addToCartBtn');
  if (addToCartBtn) {
    addToCartBtn.disabled = true;
  }

  // Open the modal
  const calculatorModal = document.getElementById('materialCalculatorModal');
  if (calculatorModal) {
    const modal = bootstrap.Modal.getInstance(calculatorModal) || new bootstrap.Modal(calculatorModal);
    modal.show();
  }
}


function initBootstrapTooltips() {
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
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
  
  // Handle accessory-specific logic
  const nonAccessoryFields = document.querySelectorAll('.non-accessory-field');
  
  // GET THE PRICE INPUT AND LABEL ELEMENTS HERE
  const priceInput = document.querySelector('input[name="price_per_sqm"]');
  const priceLabel = document.querySelector('.price-label');
  
  if (materialType === 'accessory') {
    nonAccessoryFields.forEach(field => field.style.display = 'none');
    
    // Change price label and placeholder for accessories
    if (priceInput) {
        priceInput.placeholder = 'Unit Price (Birr)';
        console.log('Changed price input placeholder to Unit Price');
    }
    // if (priceLabel) {
    //     priceLabel.textContent = 'Unit Price (Birr)';
    //     console.log('Changed price label to Unit Price');
    // }
  } else {
    nonAccessoryFields.forEach(field => field.style.display = 'block');
    
    // Reset to price per m² for other materials
    if (priceInput) {
        priceInput.placeholder = 'Price per m²';
        console.log('Reset price input placeholder to Price per m²');
    }
    if (priceLabel) {
        priceLabel.textContent = 'Price per m²';
        console.log('Reset price label to Price per m²');
    }
  }
}


function setupColorPicker() {
  const colorInput = document.getElementById('color_code');
  const colorPreview = document.getElementById('color-preview');
  const hexDisplay = document.getElementById('hex-display');

  if (colorInput && colorPreview && hexDisplay) {
    // Update color preview when color is changed
    colorInput.addEventListener('input', function () {
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
  let maxPrice = 500000;

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

  priceSlider.noUiSlider.on('update', function (values, handle) {
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
  const accessoriesGrid = document.getElementById('accessories-grid');

  if (gridViewBtn && listViewBtn && materialsContainer) {
    gridViewBtn.addEventListener('click', function () {
      materialsContainer.classList.remove('list-view');
      if (accessoriesGrid) {
        accessoriesGrid.classList.remove('list-view');
      }
      gridViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
    });

    listViewBtn.addEventListener('click', function () {
      materialsContainer.classList.add('list-view');
      if (accessoriesGrid) {
        accessoriesGrid.classList.add('list-view');
      }
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
    button.addEventListener('click', function () {
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

// Define all functions outside of DOMContentLoaded
function initBootstrapModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    new bootstrap.Modal(modal);
  });
}

function initBootstrapTooltips() {
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

function initMaterialTypeFiltering() {
  const materialTypeButtons = document.querySelectorAll('.material-type-btn');
  console.log("Found material type buttons:", materialTypeButtons.length);

  materialTypeButtons.forEach(button => {
    button.addEventListener('click', function () {
      console.log("Category button clicked:", this.getAttribute('data-category'));

      // Remove active class from all category buttons
      document.querySelectorAll('.material-type-btn').forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      this.classList.add('active');

      // Reset favorites filter button active state
      const favoritesFilterBtn = document.getElementById('favoritesFilterBtn');
      if (favoritesFilterBtn) {
        favoritesFilterBtn.classList.remove('active');
      }

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

  if (searchInput) {
    console.log("Search input found");

    const performSearch = function () {
      const searchTerm = searchInput.value.toLowerCase().trim();
      const searchType = searchTypeSelect ? searchTypeSelect.value : 'all';
      console.log(`Searching for "${searchTerm}" in ${searchType}`);

      const materialItems = document.querySelectorAll('.material-item, .accessory-item');

      materialItems.forEach(item => {
        let shouldShow = false;

        if (searchTerm === '') {
          shouldShow = true;
        } else {
          const materialName = item.querySelector('.material-name')?.textContent.toLowerCase() || '';
          const materialType = item.getAttribute('data-material')?.toLowerCase() || '';
          const manufacturer = item.getAttribute('data-manufacturer')?.toLowerCase() || '';
          const materialComposition = item.getAttribute('data-composition')?.toLowerCase() || '';
          const description = item.getAttribute('data-description')?.toLowerCase() || '';

          // Check based on search type
          switch (searchType) {
            case 'all':
              shouldShow = materialName.includes(searchTerm) ||
                materialType.includes(searchTerm) ||
                manufacturer.includes(searchTerm) ||
                materialComposition.includes(searchTerm) ||
                description.includes(searchTerm);
              break;
            case 'name':
              shouldShow = materialName.includes(searchTerm);
              break;
            case 'manufacturer':
              shouldShow = manufacturer.includes(searchTerm);
              break;
            case 'composition':
              shouldShow = materialComposition.includes(searchTerm);
              break;
            case 'description':
              shouldShow = description.includes(searchTerm);
              break;
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
  }
}


// function initViewToggle() {
//     const gridViewBtn = document.getElementById('gridViewBtn');
//     const listViewBtn = document.getElementById('listViewBtn');
//     const materialsContainer = document.getElementById('materialsContainer');

//     if (gridViewBtn && listViewBtn && materialsContainer) {
//         gridViewBtn.addEventListener('click', function () {
//             materialsContainer.classList.remove('list-view');
//             gridViewBtn.classList.add('active');
//             listViewBtn.classList.remove('active');
//         });

//         listViewBtn.addEventListener('click', function () {
//             materialsContainer.classList.add('list-view');
//             listViewBtn.classList.add('active');
//             gridViewBtn.classList.remove('active');
//         });
//     }
// }

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

  // Get selected finish types, separated by category
  const tileFinishTypes = Array.from(document.querySelectorAll('input[name="tile-finish"]:checked')).map(cb => cb.value);
  const paintFinishTypes = Array.from(document.querySelectorAll('input[name="paint-finish"]:checked')).map(cb => cb.value);

  const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
  const maxPrice = parseFloat(document.getElementById('maxPrice').value) || 500000; // Set a high default max

  console.log(`Filtering by price range: ${minPrice} - ${maxPrice}`);
  console.log(`Selected manufacturer: ${selectedManufacturer}`);
  console.log(`Selected tile finish types: ${tileFinishTypes.join(', ')}`);
  console.log(`Selected paint finish types: ${paintFinishTypes.join(', ')}`);

  const materialItems = document.querySelectorAll('.material-item, .accessory-item');
  console.log(`Total material items: ${materialItems.length}`);

  let visibleCount = 0;
  let hiddenCount = 0;

  materialItems.forEach(item => {
    let shouldShow = true;
    const materialType = item.getAttribute('data-material');
    const itemFinish = item.getAttribute('data-finish');
    const itemPrice = parseFloat(item.getAttribute('data-price') || 0);
    const itemManufacturer = item.getAttribute('data-manufacturer');
    const itemCategory = item.getAttribute('data-category');

    console.log(`Item: ${item.querySelector('.material-name')?.textContent}`);
    console.log(`  Material type: ${materialType}, Finish: ${itemFinish}`);
    console.log(`  Price: ${itemPrice}, Manufacturer: ${itemManufacturer}`);

    // Filter by manufacturer
    if (selectedManufacturer && selectedManufacturer !== 'all') {
      if (itemManufacturer !== selectedManufacturer) {
        shouldShow = false;
        console.log(`  Hidden by manufacturer filter`);
      }
    }

    // Filter by finish type based on material type
    if (materialType === 'tile' && tileFinishTypes.length > 0) {
      if (!tileFinishTypes.includes(itemFinish) && itemFinish !== '') {
        shouldShow = false;
        console.log(`  Hidden by tile finish filter. Item finish: ${itemFinish}, Selected finishes: ${tileFinishTypes.join(', ')}`);
      }
    } else if (materialType === 'paint' && paintFinishTypes.length > 0) {
      if (!paintFinishTypes.includes(itemFinish) && itemFinish !== '') {
        shouldShow = false;
        console.log(`  Hidden by paint finish filter. Item finish: ${itemFinish}, Selected finishes: ${paintFinishTypes.join(', ')}`);
      }
    }

    // Filter by price
    if (itemPrice < minPrice || (maxPrice > 0 && itemPrice > maxPrice)) {
      shouldShow = false;
      console.log(`  Hidden by price filter. Item price: ${itemPrice}, Range: ${minPrice}-${maxPrice}`);
    }

    // Apply visibility
    item.style.display = shouldShow ? '' : 'none';
    if (shouldShow) {
      visibleCount++;
    } else {
      hiddenCount++;
    }
  });

  console.log(`Filtering complete: ${visibleCount} visible, ${hiddenCount} hidden`);

  // Close filter panel after applying
  const filterPanel = document.getElementById('filterPanel');
  if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
    const bsCollapse = bootstrap.Collapse.getInstance(filterPanel) || new bootstrap.Collapse(filterPanel);
    bsCollapse.hide();
  } else {
    // Fallback if Bootstrap JS is not available
    filterPanel.classList.remove('show');
  }

  // For mobile: Show materials sidebar after filtering
  if (window.innerWidth < 768) {
    // Show materials sidebar
    const materialsSidebar = document.getElementById('materialsSidebar');
    if (materialsSidebar) {
      materialsSidebar.classList.add('show');
    }

    // Update active nav button
    const mobileMaterialsBtn = document.getElementById('mobileMaterialsBtn');
    if (mobileMaterialsBtn) {
      const buttons = document.querySelectorAll('.mobile-nav-bar .btn');
      buttons.forEach(btn => btn.classList.remove('active'));
      mobileMaterialsBtn.classList.add('active');
    }
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


// Initialize tooltips
function initTooltips() {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
}

// Function to show/hide material-specific fields
function toggleMaterialFields() {
  const materialTypeSelect = document.getElementById('materialType');
  if (!materialTypeSelect) {
    console.warn("Material type select not found");
    return;
  }
  
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

  // ADD THIS NEW SECTION - Handle accessory-specific logic
  const nonAccessoryFields = document.querySelectorAll('.non-accessory-field');
  
  // Get the price input and label elements
  const priceInput = document.querySelector('input[name="price_per_sqm"]');
  const priceLabel = document.querySelector('.price-label');
  
  if (selectedMaterial === 'accessory') {
    nonAccessoryFields.forEach(field => field.style.display = 'none');
    
    // Change price label and placeholder for accessories
    if (priceInput) {
        priceInput.placeholder = 'Unit Price (Birr)';
        console.log('Changed price input placeholder to Unit Price');
    }
    // if (priceLabel) {
    //     priceLabel.textContent = 'Unit Price (Birr)';
    //     console.log('Changed price label to Unit Price');
    // }
  } else {
    nonAccessoryFields.forEach(field => field.style.display = 'block');
     
    // Reset to price per m² for other materials
    if (priceInput) {
        priceInput.placeholder = 'Price per m²';
        console.log('Reset price input placeholder to Price per m²');
    }
    if (priceLabel) {
        priceLabel.textContent = 'Price per m²';
        console.log('Reset price label to Price per m²');
    }
  }
}


// Handle paint type selection
function setupPaintTypeToggle() {
  const paintTypeSelect = document.getElementById('paint_type');
  if (paintTypeSelect) {
    paintTypeSelect.addEventListener('change', function () {
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

function initSearchToggle() {
  const searchToggleBtn = document.getElementById('searchToggleBtn');
  const searchArea = document.getElementById('searchArea');

  if (searchToggleBtn && searchArea) {
    searchToggleBtn.addEventListener('click', function () {
      // Toggle search area visibility with animation
      if (!searchArea.classList.contains('show')) {
        searchArea.style.display = 'block';
        // Use setTimeout to ensure the display change takes effect before adding the class
        setTimeout(() => {
          searchArea.classList.add('show');
        }, 10);
        searchToggleBtn.classList.add('active');
        // Focus the search input when opened
        document.getElementById('searchMaterials').focus();
      } else {
        searchArea.classList.remove('show');
        searchToggleBtn.classList.remove('active');
        // Hide after transition completes
        setTimeout(() => {
          searchArea.style.display = 'none';
        }, 300); // Match the transition duration
      }
    });
  }
}
function selectSampleRoom(imagePath) {
  console.log("Selected sample room:", imagePath);
  
  // Show loading screen
  const loadingScreen = document.getElementById("sampleRoomLoadingScreen");
  if (loadingScreen) {
    loadingScreen.style.display = "flex";
  }
  
  // Create FormData properly
  const formData = new FormData();
  formData.append("sample_path", imagePath);
  
  // Process the sample room image
  fetch("/process_sample_room", {
    method: "POST",
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      // Hide loading screen
      if (loadingScreen) {
        loadingScreen.style.display = "none";
      }
      
      if (data.success || data.state === "success") {
        // Show the image
        const imageResult = document.getElementById("imageResult");
        imageResult.src = data.room_image;
        
        // Show the image container
        const imageAreaContainer = document.getElementById("imageAreaContainer");
        if (imageAreaContainer) {
          imageAreaContainer.style.display = "block";
        }
        
        // Show action buttons
        document.getElementById("actionButtonsContainer").style.display = "flex";
        
        // Store the original image path
        window.originalImagePath = data.room_image;
        console.log("Original image path stored:", window.originalImagePath);
        
        // Show the FAB button
        const applyTextureFab = document.getElementById('applyTextureFab');
        if (applyTextureFab) {
          applyTextureFab.style.display = 'flex';
        }
        
        // Update Apply Texture button visibility
        updateApplyTextureButton();
        
        // Scroll to the image result
        imageResult.scrollIntoView({ behavior: 'smooth' });
      } else {
        console.error("Error processing sample room:", data.message || "Unknown error");
        // Show error message to user
        alert("Error processing room. Please try again.");
      }
    })
    .catch(error => {
      // Hide loading screen on error
      if (loadingScreen) {
        loadingScreen.style.display = "none";
      }
      
      console.error("Error:", error);
      alert("Error loading room. Please check your connection and try again.");
    });
}

// Function to process the sample room on the server
function processSampleRoom(imagePath) {
  // Create a FormData object with the image path
  const formData = new FormData();
  formData.append('sample_path', imagePath);

  // Send the request to a new endpoint for processing sample rooms
  fetch("/process_sample_room", {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      console.log('Server response:', data);
      if (data.state === 'success') {
        // Update the image with the processed version if needed
        if (data.room_image) {
          document.getElementById('imageResult').src = data.room_image;
          window.originalImagePath = data.room_image;
          console.log('Original image path updated from server:', window.originalImagePath);
        }
      } else {
        console.error('Error processing sample room:', data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

function toggleFavorite(event, materialId) {
  event.stopPropagation(); // Prevent triggering the parent's click event

  // Get the button that was clicked
  const button = event.currentTarget;

  // Toggle the active class
  button.classList.toggle('active');

  // Toggle the heart icon between solid and regular
  const icon = button.querySelector('i');
  if (icon.classList.contains('far')) {
    icon.classList.replace('far', 'fas');
  } else {
    icon.classList.replace('fas', 'far');
  }

  // Get current favorites from localStorage
  let favorites = JSON.parse(localStorage.getItem('materialFavorites') || '[]');

  // Toggle the material ID in favorites
  if (favorites.includes(materialId)) {
    // Remove from favorites
    favorites = favorites.filter(id => id !== materialId);
  } else {
    // Add to favorites
    favorites.push(materialId);
  }

  // Save updated favorites to localStorage
  localStorage.setItem('materialFavorites', JSON.stringify(favorites));

  // If we're currently in favorites view, update the display
  const activeCategoryBtn = document.querySelector('.material-type-btn.active');
  if (activeCategoryBtn && activeCategoryBtn.getAttribute('data-category') === 'favorites') {
    filterMaterialsByFavorites();
  }
}


// Filter materials to show only favorites
function filterMaterialsByFavorites() {
  // Get favorites from localStorage
  const favorites = JSON.parse(localStorage.getItem('materialFavorites') || '[]');

  // Get all material items
  const materialItems = document.querySelectorAll('.material-item');

  // Show only favorited items
  materialItems.forEach(item => {
    const favoriteBtn = item.querySelector('.favorite-toggle');
    const materialId = parseInt(favoriteBtn.getAttribute('data-id'));

    if (favorites.includes(materialId)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

// Initialize favorites from localStorage
function initFavorites() {
  // Get favorites from localStorage
  const favorites = JSON.parse(localStorage.getItem('materialFavorites') || '[]');

  // Update UI to reflect favorite status
  document.querySelectorAll('.favorite-toggle').forEach(button => {
    const materialId = parseInt(button.getAttribute('data-id'));

    if (favorites.includes(materialId)) {
      button.classList.add('active');
      const icon = button.querySelector('i');
      icon.classList.replace('far', 'fas');
    }
  });

  // Add click handler for favorites filter button
  const favoritesFilterBtn = document.getElementById('favoritesFilterBtn');
  if (favoritesFilterBtn) {
    favoritesFilterBtn.addEventListener('click', function () {
      // Toggle active state
      this.classList.toggle('active');
      
      if (this.classList.contains('active')) {
        // Filter to show only favorites
        filterMaterialsByFavorites();
        filterAccessoriesByFavorites(); // Add this line
      } else {
        // Show all materials (or respect current category filter)
        const activeCategoryBtn = document.querySelector('.material-type-btn.active');
        if (activeCategoryBtn) {
          // Trigger click on the active category button to refresh the view
          activeCategoryBtn.click();
        } else {
          // If no category is active, show all
          showAllMaterials();
          // Also show all accessories
          const accessoryItems = document.querySelectorAll('.accessory-item');
          accessoryItems.forEach(item => {
            item.style.display = '';
          });
        }
      }
    });
  }
}

// Initialize accessory favorites from localStorage
function initAccessoryFavorites() {
  console.log('Initializing accessory favorites...');
  
  // Get favorites from localStorage
  const favorites = JSON.parse(localStorage.getItem('accessoryFavorites') || '[]');
  console.log('Accessory favorites from localStorage:', favorites);
  
  // Update UI to reflect favorite status for accessories
  document.querySelectorAll('.accessory-item .favorite-toggle').forEach(button => {
    const accessoryId = parseInt(button.getAttribute('data-id'));
    console.log('Checking accessory ID:', accessoryId, 'Is favorited:', favorites.includes(accessoryId));
    
    if (favorites.includes(accessoryId)) {
      button.classList.add('active');
      const icon = button.querySelector('i');
      if (icon) {
        icon.classList.replace('far', 'fas');
      }
      console.log('Restored favorite state for accessory:', accessoryId);
    }
  });
}

// Filter accessories to show only favorites
function filterAccessoriesByFavorites() {
  console.log('Filtering accessories by favorites...');
  
  // Get favorites from localStorage
  const favorites = JSON.parse(localStorage.getItem('accessoryFavorites') || '[]');
  console.log('Accessory favorites:', favorites);
  
  // Get all accessory items
  const accessoryItems = document.querySelectorAll('.accessory-item');
  console.log('Found accessory items:', accessoryItems.length);
  
  // Show only favorited items
  accessoryItems.forEach(item => {
    const favoriteBtn = item.querySelector('.favorite-toggle');
    if (favoriteBtn) {
      const accessoryId = parseInt(favoriteBtn.getAttribute('data-id'));
      
      if (favorites.includes(accessoryId)) {
        item.style.display = '';
        console.log('Showing favorited accessory:', accessoryId);
      } else {
        item.style.display = 'none';
        console.log('Hiding non-favorited accessory:', accessoryId);
      }
    }
  });
}

// Function to handle accessory favorites
function toggleAccessoryFavorite(event, accessoryId) {
  event.stopPropagation(); // Prevent triggering the parent's click event
  
  console.log('Toggling favorite for accessory ID:', accessoryId);
  
  // Get the button that was clicked
  const button = event.currentTarget;
  
  // Toggle the active class
  button.classList.toggle('active');
  
  // Toggle the heart icon between solid and regular
  const icon = button.querySelector('i');
  if (icon.classList.contains('far')) {
    icon.classList.replace('far', 'fas');
  } else {
    icon.classList.replace('fas', 'far');
  }
  
  // Get current favorites from localStorage
  let favorites = JSON.parse(localStorage.getItem('accessoryFavorites') || '[]');
  
  // Toggle the accessory ID in favorites
  if (favorites.includes(accessoryId)) {
    // Remove from favorites
    favorites = favorites.filter(id => id !== accessoryId);
    console.log('Removed from favorites');
  } else {
    // Add to favorites
    favorites.push(accessoryId);
    console.log('Added to favorites');
  }
  
  // Save updated favorites to localStorage
  localStorage.setItem('accessoryFavorites', JSON.stringify(favorites));
  
  console.log('Current favorites:', favorites);
}

// Function to add accessory directly to cart (no calculation needed)
function addAccessoryToCart(event, accessoryId, name, price, thumbnail) {
    event.stopPropagation();
    
    console.log("=== ACCESSORY DEBUG ===");
    console.log("Raw accessoryId parameter:", accessoryId);
    console.log("Type of accessoryId:", typeof accessoryId);
    console.log("Name:", name);
    console.log("Price:", price);
    console.log("Thumbnail:", thumbnail);
    
    // Make sure we have a valid accessory ID
    if (!accessoryId || isNaN(parseInt(accessoryId))) {
        console.error('Invalid accessory ID:', accessoryId);
        alert('Invalid accessory ID');
        return;
    }
    
    const id = parseInt(accessoryId);
    const quantity = 1; // Default quantity for accessories
    
    console.log("About to make fetch request to /api/cart/accessories");
    console.log("Request body:", JSON.stringify({
        accessory_id: id,
        quantity: quantity
    }));
    
    // Add the accessory to cart using the accessories API endpoint
    fetch('/api/cart/accessories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            accessory_id: id,
            quantity: quantity
        })
    })
    .then(response => {
        console.log("Response status:", response.status);
        
        if (response.status === 401) {
            console.log("Got 401, redirecting to login");
            window.location.href = '/login?next=/room_visualization_index';
            throw new Error('Not logged in');
        }
        if (!response.ok) {
            console.log("Response not ok, status:", response.status);
            return response.json().then(data => {
                console.log("Error response data:", data);
                throw new Error(data.detail || 'Failed to add accessory to cart');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Success response:", data);
        alert(`Added ${name} to your cart!`);
        
        // Update cart count in navbar
        if (typeof updateCartCount === 'function') {
            updateCartCount();
        }
    })
    .catch(error => {
        console.error('Error adding accessory to cart:', error);
        if (error.message !== 'Not logged in') {
            alert('Failed to add accessory to cart: ' + error.message);
        }
    });
}

// Function to display accessories with the same structure as materials
function displayAccessories(models) {

    console.log('=== DISPLAY ACCESSORIES DEBUG ===');
    console.log('Models received:', models);
    console.log('First model:', models[0]);
    console.log('Models length:', models.length);


    console.log('Displaying accessories:', models);
    const accessoriesGrid = document.getElementById('accessories-grid');
    const categoryFilter = document.getElementById('accessory-category-filter')?.value || 'all';
    
    if (!accessoriesGrid) {
        console.warn('Accessories grid not found');
        return;
    }
    
    // Filter models by category if needed
    const filteredModels = categoryFilter === 'all' 
      ? models 
      : models.filter(model => model.category === categoryFilter);
    
    console.log('Filtered models:', filteredModels);
    
    // Clear the grid
    accessoriesGrid.innerHTML = '';
    
    if (!models || models.length === 0) {
        accessoriesGrid.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i> No accessories found
            </div>
        `;
        return;
    }
    
    if (filteredModels.length === 0) {
        accessoriesGrid.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i> No accessories found in this category
            </div>
        `;
        return;
    }
    
    // Add each accessory to the grid using the same structure as materials
    filteredModels.forEach(model => {
        const accessoryItem = document.createElement('div');
        accessoryItem.className = 'material-item accessory-item';
        accessoryItem.setAttribute('data-material', 'accessory');
        accessoryItem.setAttribute('data-category', model.category || '');
        accessoryItem.setAttribute('data-price', model.price || 0);
        accessoryItem.setAttribute('data-manufacturer', model.manufacturer || '');
        accessoryItem.setAttribute('data-description', model.description || '');
        accessoryItem.setAttribute('data-model-path', model.path);
        accessoryItem.setAttribute('data-name', model.name || '');
        accessoryItem.setAttribute('data-id', model.id || '');
        
        // Extract dimensions and volume from description
        let dimensions = 'N/A';
        let volume = 'N/A';
        let length_cm = 0, width_cm = 0, height_cm = 0;

        if (model.description) {
            // Try to extract dimensions from description (e.g., "1560 x 810 mm")
            const dimensionMatch = model.description.match(/(\d+)\s*x\s*(\d+)\s*mm/i);
            if (dimensionMatch) {
                length_cm = parseInt(dimensionMatch[1]) / 10; // Convert mm to cm
                width_cm = parseInt(dimensionMatch[2]) / 10; // Convert mm to cm
                dimensions = `${dimensionMatch[1]}×${dimensionMatch[2]} mm`;
            }
            
            // Try to extract volume from description (e.g., "250 l")
            const volumeMatch = model.description.match(/(\d+)\s*l/i);
            if (volumeMatch) {
                volume = `${volumeMatch[1]} L`;
            } else if (length_cm > 0 && width_cm > 0) {
                // Calculate volume if not provided (assuming average depth of 40cm for bathtubs)
                const estimated_depth = 40; // cm
                const calculated_volume = Math.round((length_cm * width_cm * estimated_depth) / 1000); // Convert to liters
                volume = `~${calculated_volume} L (est.)`;
            }
        }
        
        console.log("=== ACCESSORY BUTTON DEBUG ===");
        console.log("Model object:", model);
        console.log("Model ID:", model.id);
        console.log("Model name:", model.name);
        console.log("Model price:", model.price);
        console.log("Model thumbnail:", model.thumbnail);
        
        accessoryItem.innerHTML = `
            <div class="material-card">
                <button class="favorite-toggle" onclick="event.stopPropagation(); toggleAccessoryFavorite(event, ${model.id || 0})" data-id="${model.id || 0}">
                    <i class="far fa-heart"></i>
                </button>
                <div class="material-preview">
                    <img src="${model.thumbnail}" alt="${model.name}" 
                         class="img-fluid rounded shadow-sm mx-auto d-block fixed-size-image"
                         loading="lazy">
                </div>
                <div class="material-details">
                    <h6 class="material-name">${model.name}</h6>
                    <div class="material-meta">
                        <span class="material-badge">${model.category}</span>
                        <span class="material-price">${model.price || 0} Birr</span>
                    </div>
                    <div class="material-dimensions">
                        <i class="fas fa-ruler-combined"></i> ${dimensions}
                    </div>
                    <div class="material-volume">
                        <i class="fas fa-cube"></i> ${volume}
                    </div>
                    <button class="btn btn-sm btn-success cart-btn accessory-cart-btn"
                            data-accessory-id="${model.id || 0}"
                            data-accessory-name="${model.name}"
                            data-accessory-price="${model.price || 0}"
                            data-accessory-thumbnail="${model.thumbnail}">
                        <i class="fa fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
        `;
        console.log('=== GENERATED HTML DEBUG ===');
        console.log('Generated HTML for model ID:', model.id);
        console.log('Generated innerHTML:', accessoryItem.innerHTML);

        
        console.log('Model name escaped:', JSON.stringify(model.name));   
        
        // Add click handler for 3D replacement (from your original working code)
        accessoryItem.addEventListener('click', function() {
            console.log('Clicked on accessory:', model.name, model.path);
            
            // Check if we have a selected fixture in the 3D scene
            if (typeof window.replaceFixture === 'function') {
                window.replaceFixture(model.path, model.name);
            } else {
                console.error('replaceFixture function not available');
                alert('3D replacement function not available. Please make sure the 3D visualizer is loaded.');
            }
        });
        
        accessoriesGrid.appendChild(accessoryItem);
    });

    // Initialize favorites after all accessories are rendered
    setTimeout(() => {
        initAccessoryFavorites();
    }, 100);
    
    console.log('Adding event listeners to accessory cart buttons...');

    // Add event listeners to all accessory cart buttons
    document.querySelectorAll('.accessory-cart-btn').forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation();
            console.log('Button clicked, data attributes:', this.dataset);
            
            const accessoryId = parseInt(this.dataset.accessoryId);
            const name = this.dataset.accessoryName;
            const price = parseFloat(this.dataset.accessoryPrice);
            const thumbnail = this.dataset.accessoryThumbnail;
            
            console.log('Calling addAccessoryToCart with:', accessoryId, name, price, thumbnail);
            addAccessoryToCart(event, accessoryId, name, price, thumbnail);
        });
    });

    console.log('Event listeners added to', document.querySelectorAll('.accessory-cart-btn').length, 'buttons');
}

function showAllMaterials() {
  const materialItems = document.querySelectorAll('.material-item');
  materialItems.forEach(item => {
    item.style.display = '';
  });
}

function saveProject() {
  console.log("Saving project...");
  // Get the current images
  const roomImage = document.getElementById('imageResult');

  if (!roomImage.src || roomImage.src.includes('placeholder.jpg')) {
    alert('Please upload a room image first');
    return;
  }

  // Show loading indicator
  const saveBtn = event.currentTarget;
  const originalText = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
  saveBtn.disabled = true;

  // Get the original image path from the window object
  // This should be set when the image is first uploaded in handleImageUpload
  // or when a sample room is selected in selectSampleRoom
  let originalImagePath = window.originalImagePath || '';

  // If originalImagePath is empty, use the current image src as a fallback
  if (!originalImagePath) {
    originalImagePath = roomImage.src;
    console.warn('Original image path not found, using current image src as fallback');
  }

  console.log('Original image path before cleaning:', originalImagePath);

  // Clean up the path if it's a full URL (for sample images)
  if (originalImagePath.includes('http://') || originalImagePath.includes('https://')) {
    // Extract just the path part after the domain
    try {
      const url = new URL(originalImagePath);
      originalImagePath = url.pathname;
    } catch (e) {
      // If URL parsing fails, just remove the domain part
      const parts = originalImagePath.split('//');
      if (parts.length > 1) {
        originalImagePath = parts[1].substring(parts[1].indexOf('/'));
      }
    }
    console.log('Cleaned original image path (removed domain):', originalImagePath);
  }

  // Remove any query parameters (like ?t=timestamp)
  if (originalImagePath.includes('?')) {
    originalImagePath = originalImagePath.split('?')[0];
    console.log('Removed query params from path:', originalImagePath);
  }

  // Ensure the path doesn't have a leading slash for the API
  if (originalImagePath.startsWith('/')) {
    originalImagePath = originalImagePath.substring(1);
    console.log('Removed leading slash:', originalImagePath);
  }

  // Create a canvas to get the rendered image data
  const canvas = document.createElement('canvas');
  canvas.width = roomImage.naturalWidth;
  canvas.height = roomImage.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(roomImage, 0, 0);
  const renderedImageData = canvas.toDataURL('image/jpeg');

  // Get current tile ID if available
  const tileId = window.selectedTileSpecs ? window.selectedTileSpecs.id : null;

  console.log('Saving project with final original image path:', originalImagePath);

  // Save project
  fetch('/api/projects/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tile_id: tileId,
      room_image_data: originalImagePath, // Send the cleaned path
      rendered_image_data: renderedImageData,
      room_dimensions: null // You could add room dimensions here if available
    })
  })
    .then(response => {
      if (response.status === 401) {
        // Unauthorized - redirect to login
        window.location.href = '/login?next=/room_visualization_index';
        throw new Error('Not logged in');
      }
      if (!response.ok) {
        return response.text().then(text => {
          console.error('Server response:', text);
          throw new Error('Failed to save project');
        });
      }
      return response.json();
    })
    .then(data => {
      // Show success message
      saveBtn.innerHTML = '<i class="fa fa-check"></i> Saved!';

      // Reset button after 2 seconds
      setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
      }, 2000);
    })
    .catch(error => {
      console.error('Error saving project:', error);
      if (error.message !== 'Not logged in') {
        alert('Failed to save project. Please try again.');
      }

      // Reset button
      saveBtn.innerHTML = originalText;
      saveBtn.disabled = false;
    });
}


// Toggle comparison mode
function toggleComparisonMode(event) {
  console.log("toggleComparisonMode called");
  // Prevent default behavior (form submission)
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  console.log("Toggle comparison mode called");

  // Get the current image and the original image
  const currentImage = document.getElementById('imageResult');
  const originalImage = document.getElementById('originalImage');
  const renderedImage = document.getElementById('renderedImage');
  const comparisonSlider = document.getElementById('comparisonSlider');
  const imageArea = document.getElementById('imageAreaContainer');

  // If we don't have the original image stored, use a placeholder
  if (!window.originalImagePath) {
    console.warn('Original image path not found, using current image as original');
    window.originalImagePath = currentImage.src;
  }

  // Set the images for comparison
  originalImage.src = window.originalImagePath;
  renderedImage.src = currentImage.src;

  // Hide the regular image and show the comparison slider
  imageArea.style.display = 'none';
  comparisonSlider.style.display = 'block';

  // Explicitly call initComparisonSlider with a slight delay
  setTimeout(() => {
    console.log("About to initialize comparison slider");
    initComparisonSlider();
  }, 200);

  return false;
}

function exitComparisonMode() {
  const comparisonSlider = document.getElementById('comparisonSlider');
  const imageArea = document.getElementById('imageAreaContainer');

  // Hide the comparison slider and show the regular image
  comparisonSlider.style.display = 'none';
  imageArea.style.display = 'block';
}

function initComparisonSlider() {
  console.log("initComparisonSlider called");
  const container = document.querySelector('.comparison-container');
  const renderedDiv = document.querySelector('.rendered-image');
  const sliderHandle = document.getElementById('sliderHandle');

  // Create a clip-path for the rendered image
  // Start with showing 50% of the rendered image (left half)
  renderedDiv.style.clipPath = 'inset(0 50% 0 0)';
  // sliderHandle.style.left = '50%';

  // Position the slider handle outside the rendered div to avoid being clipped
  if (sliderHandle) {
    sliderHandle.style.left = '50%';
    // Make sure the slider handle is a direct child of the comparison container, not the rendered div
    if (sliderHandle.parentElement === renderedDiv) {
      container.appendChild(sliderHandle);
    }
  }

  let isDragging = false;

  // Mouse events
  sliderHandle.addEventListener('mousedown', function (e) {
    console.log("Slider handle mousedown");
    isDragging = true;
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mouseup', function () {
    console.log("Document mouseup");
    isDragging = false;
  });

  document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;

    console.log("Document mousemove while dragging");
    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const percentage = (x / containerRect.width) * 100;

    // Constrain to container bounds
    const constrainedPercentage = Math.max(0, Math.min(100, percentage));

    // Update the clip-path and slider position
    updateComparisonSliderPosition(constrainedPercentage);
  });

  // Touch events for mobile
  sliderHandle.addEventListener('touchstart', function (e) {
    console.log("Slider handle touchstart");
    isDragging = true;
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('touchend', function () {
    console.log("Document touchend");
    isDragging = false;
  });

  document.addEventListener('touchmove', function (e) {
    if (!isDragging) return;

    console.log("Document touchmove while dragging");
    const touch = e.touches[0];
    const containerRect = container.getBoundingClientRect();
    const x = touch.clientX - containerRect.left;
    const percentage = (x / containerRect.width) * 100;

    // Constrain to container bounds
    const constrainedPercentage = Math.max(0, Math.min(100, percentage));

    // Update the clip-path and slider position
    updateComparisonSliderPosition(constrainedPercentage);

    // Prevent page scrolling while dragging
    e.preventDefault();
  });
}


// Update slider position and clip-path
function updateComparisonSliderPosition(percentage) {
  console.log("Updating slider position to", percentage + "%");
  const renderedDiv = document.querySelector('.rendered-image');
  const sliderHandle = document.getElementById('sliderHandle');

  if (!renderedDiv || !sliderHandle) {
    console.error("Could not find rendered div or slider handle");
    return;
  }

  // Update slider handle position
  sliderHandle.style.left = `${percentage}%`;

  // Update clip-path to reveal the rendered image from left to right
  renderedDiv.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
}

function showOriginalInComparison() {
  // Show only the original image (clip the rendered image completely)
  updateComparisonSliderPosition(0);

  // Update active button
  document.querySelectorAll('.slider-controls .btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector('.slider-controls .btn:nth-child(1)').classList.add('active');
}

function showRenderedInComparison() {
  // Show only the rendered image (reveal it completely)
  updateComparisonSliderPosition(100);

  // Update active button
  document.querySelectorAll('.slider-controls .btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector('.slider-controls .btn:nth-child(2)').classList.add('active');
}

function enableSliderInComparison() {
  // Show half of each image
  updateComparisonSliderPosition(50);

  // Update active button
  document.querySelectorAll('.slider-controls .btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector('.slider-controls .btn:nth-child(3)').classList.add('active');
}


// Add to Cart functionality
function addToCart(event, tileId, tileName, price) {
  // Stop the event from triggering the parent's onclick
  event.stopPropagation();

  // Store the button reference safely
  const btn = event.currentTarget;
  if (!btn) {
    console.error('Button element not found');
    return;
  }

  const originalText = btn.innerHTML;

  // Add to cart directly
  fetch('/api/cart/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tile_id: tileId,
      quantity: 1
    })
  })
    .then(response => {
      if (response.status === 401) {
        // Unauthorized - redirect to login
        window.location.href = '/login?next=/room_visualization_index';
        throw new Error('Not logged in');
      }
      if (!response.ok) {
        throw new Error('Failed to add item to cart');
      }
      return response.json();
    })
    .then(data => {
      // Show success message
      if (btn) {
        btn.innerHTML = '<i class="fa fa-check"></i> Added!';
        btn.disabled = true;

        // Reset button after 2 seconds
        setTimeout(() => {
          if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
          }
        }, 2000);
      }

      // Update cart count in navbar if it exists
      updateCartCount();
    })
    .catch(error => {
      console.error('Error adding to cart:', error);
      if (error.message !== 'Not logged in') {
        alert('Failed to add item to cart. Please try again.');
      }

      // Reset button if there was an error
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });
}

// Function to update cart count in navbar
function updateCartCount() {
  fetch('/api/cart')
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to get cart');
      }
      return response.json();
    })
    .then(data => {
      // Update cart count in navbar
      const cartCountElement = document.getElementById('cartCount');
      if (cartCountElement) {
        cartCountElement.textContent = data.item_count;

        // Make it visible if it was hidden
        cartCountElement.style.display = 'inline-block';
      }
    })
    .catch(error => {
      console.error('Error updating cart count:', error);
    });
}


// ----------------------------------------- 3D Visualizer Scripts -------------------------------------------------------------------------
// Function to select a 3D template
function select3DTemplate(templateName) {
  console.log('Selecting 3D template:', templateName);

  // Get the iframe
  const iframe = document.querySelector('#threed-visualizer iframe');

  // Update the iframe src with the template parameter
  iframe.src = `/3d-visualizer?template=${templateName}`;

  // Highlight the selected template
  document.querySelectorAll('.sample-room-item').forEach(item => {
    if (item.dataset.category === templateName) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

// Add these functions to enhanced-features.js

// Global variables for 3D visualization
window.selectedSurfaces = [];
window.currentRoomTemplate = 'bathroom'; // Default template

// Function to update the selected surfaces list UI
window.updateSelectedSurfacesList = function () {
  const listElement = document.getElementById('selected-surfaces-list');
  if (!listElement) return;

  if (window.selectedSurfaces.length === 0) {
    listElement.innerHTML = '<span class="badge bg-danger">No surfaces selected</span>';
    return;
  }

  listElement.innerHTML = '';
  window.selectedSurfaces.forEach(surface => {
    const badge = document.createElement('span');
    badge.className = 'badge bg-primary me-2 mb-2';
    badge.textContent = surface.name;

    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-close btn-close-white ms-1';
    removeBtn.setAttribute('aria-label', 'Remove');
    removeBtn.style.fontSize = '0.5rem';
    removeBtn.onclick = function (e) {
      e.stopPropagation();
      // Remove from selected surfaces
      window.selectedSurfaces = window.selectedSurfaces.filter(s => s.id !== surface.id);
      window.updateSelectedSurfacesList();

      // Update the 3D visualizer
      document.dispatchEvent(new CustomEvent('deselectSurface', {
        detail: { surfaceId: surface.id }
      }));
    };

    badge.appendChild(removeBtn);
    listElement.appendChild(badge);
  });
};

function initRoomCategoryFilters() {
  console.log("Initializing room category filters");

  // Get all category icons and sample room items
  const categoryIcons = document.querySelectorAll('.category-icon-item');
  const sampleRoomItems = document.querySelectorAll('.sample-room-item');

  console.log(`Found ${categoryIcons.length} category icons and ${sampleRoomItems.length} sample room items`);

  if (categoryIcons.length > 0) {
    // Add click event to each category icon
    categoryIcons.forEach(icon => {
      icon.addEventListener('click', function () {
        const selectedCategory = this.getAttribute('data-category');
        console.log(`Selected category: ${selectedCategory}`);

        // Update active state
        categoryIcons.forEach(item => item.classList.remove('active'));
        this.classList.add('active');

        // Filter sample rooms
        filterSampleRooms(selectedCategory);
      });
    });
  }
}

function filterSampleRooms(category) {
  console.log(`Filtering sample rooms by category: ${category}`);

  const sampleRoomItems = document.querySelectorAll('.sample-room-item');

  sampleRoomItems.forEach(item => {
    const itemCategory = item.getAttribute('data-category') || '';

    if (category === 'all' || category === 'All Rooms' || itemCategory === category) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

// Listen for surface selection events from the 3D visualizer
document.addEventListener('surfaceSelected', function (e) {
  const { surfaceId, selected, surfaceInfo } = e.detail;

  if (selected) {
    // Add to selected surfaces if not already there
    if (!window.selectedSurfaces.some(s => s.id === surfaceId)) {
      window.selectedSurfaces.push(surfaceInfo);
    }
  } else {
    // Remove from selected surfaces
    window.selectedSurfaces = window.selectedSurfaces.filter(s => s.id !== surfaceId);
  }

  window.updateSelectedSurfacesList();
});

// Initialize the 3D visualizer when the tab is shown
document.addEventListener('DOMContentLoaded', function () {
  const threeDTab = document.getElementById('threed-visualizer-tab');
  if (threeDTab) {
    threeDTab.addEventListener('shown.bs.tab', function () {
      // Only auto-load if not already loaded
      if (!window.templateLoaded) {
        // Check if we're in enterprise mode and have enterprise rooms
        if (isEnterpriseMode()) {
          // Look for enterprise rooms in the template
          const enterpriseRoomCards = document.querySelectorAll('.room-template-card[onclick*="enterprise_3d_rooms"]');
          if (enterpriseRoomCards.length > 0) {
            // Get the onclick attribute from the first enterprise room
            const firstRoomOnclick = enterpriseRoomCards[0].getAttribute('onclick');
            if (firstRoomOnclick) {
              // Extract the function call and execute it
              try {
                eval(firstRoomOnclick);
                window.templateLoaded = true;
                return;
              } catch (e) {
                console.error('Error loading enterprise room:', e);
              }
            }
          }
        }
        
        // Fallback: Don't load any default room, let user choose
        console.log('No auto-loading - user must select a room template');
        window.templateLoaded = true;
      }
    });
  }
});


// Floating action button for applying textures
const applyTextureFab = document.getElementById('applyTextureFab');
if (applyTextureFab) {
  applyTextureFab.addEventListener('click', function () {
    // Show materials panel
    const materialsSidebar = document.getElementById('materialsSidebar');
    if (materialsSidebar) {
      materialsSidebar.classList.add('show');
    }
  });

  // Show FAB when image is loaded
  const imageResult = document.getElementById('imageResult');
  if (imageResult) {
    imageResult.addEventListener('load', function () {
      if (this.src && this.src !== '' && !this.src.includes('placeholder.jpg')) {
        applyTextureFab.style.display = 'flex';
      }
    });

    // Check if image is already loaded
    if (imageResult.src && imageResult.src !== '' && !imageResult.src.includes('placeholder.jpg')) {
      applyTextureFab.style.display = 'flex';
    }
  }
}

// Mobile touch handling for comparison slider
let sliderHandle = document.querySelector('.slider-handle');
if (sliderHandle) {
  sliderHandle.addEventListener('touchstart', function (e) {
    e.preventDefault(); // Prevent scrolling when touching the slider

    const slider = document.getElementById('comparisonSlider');
    const sliderRect = slider.getBoundingClientRect();
    const sliderWidth = sliderRect.width;

    function handleTouchMove(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const x = touch.clientX - sliderRect.left;
      const position = Math.max(0, Math.min(x / sliderWidth, 1));

      // Update slider position
      document.querySelector('.rendered-image').style.width = `${position * 100}%`;
      sliderHandle.style.left = `${position * 100}%`;
    }

    function handleTouchEnd() {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    }

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  });
}

// Add pinch-to-zoom functionality for mobile
const imageResult = document.getElementById('imageResult');
if (imageResult) {
  let currentScale = 1;
  let startDistance = 0;

  imageResult.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      startDistance = getDistance(e.touches[0], e.touches[1]);
    }
  });

  imageResult.addEventListener('touchmove', function (e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scaleChange = currentDistance / startDistance;

      // Apply scale with limits
      const newScale = Math.max(1, Math.min(currentScale * scaleChange, 3));
      imageResult.style.transform = `scale(${newScale})`;

      startDistance = currentDistance;
      currentScale = newScale;
    }
  });

  imageResult.addEventListener('touchend', function () {
    // Reset after a delay if scale is close to 1
    if (currentScale < 1.1) {
      setTimeout(() => {
        imageResult.style.transform = 'scale(1)';
        currentScale = 1;
      }, 300);
    }
  });

  function getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

function updateMobileWorkflow(step) {
  const mobileRoomViewBtn = document.getElementById('mobileRoomViewBtn');
  const mobileMaterialsBtn = document.getElementById('mobileMaterialsBtn');
  const mobileFiltersBtn = document.getElementById('mobileFiltersBtn');
  const mobileToolsBtn = document.getElementById('mobileToolsBtn');

  if (!mobileRoomViewBtn || !mobileMaterialsBtn || !mobileFiltersBtn || !mobileToolsBtn) {
    return; // Mobile nav not present
  }

  // Reset all buttons to disabled
  mobileMaterialsBtn.classList.add('disabled');
  mobileFiltersBtn.classList.add('disabled');
  mobileToolsBtn.classList.add('disabled');

  // Enable buttons based on the current step
  switch (step) {
    case 'room_selected':
      // Room is selected, enable materials
      mobileMaterialsBtn.classList.remove('disabled');
      break;
    case 'texture_applied':
      // Texture is applied, enable materials, filters, and tools
      mobileMaterialsBtn.classList.remove('disabled');
      mobileFiltersBtn.classList.remove('disabled');
      mobileToolsBtn.classList.remove('disabled');
      break;
  }
}

function enhanceCategoryIconsScrolling() {
  const container = document.querySelector('.category-icons-container');
  if (!container) return;

  // Add visual indicator when scrolling is possible
  const scroll = container.querySelector('.category-icons-scroll');
  if (scroll) {
    // Check if scrolling is possible
    const checkScrollable = function () {
      if (scroll.scrollWidth > container.clientWidth) {
        container.classList.add('scrollable');

        // If on mobile, scroll to active item
        if (window.innerWidth < 768) {
          const activeItem = scroll.querySelector('.category-icon-item.active');
          if (activeItem) {
            // Scroll the active item into view with some offset
            setTimeout(() => {
              const containerWidth = container.clientWidth;
              const itemLeft = activeItem.offsetLeft;
              const itemWidth = activeItem.offsetWidth;
              const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2);
              scroll.scrollLeft = Math.max(0, scrollPosition);
            }, 100);
          }
        }
      } else {
        container.classList.remove('scrollable');
      }
    };

    // Check on load and resize
    checkScrollable();
    window.addEventListener('resize', checkScrollable);

    // When a category is clicked, scroll it into view
    const categoryItems = scroll.querySelectorAll('.category-icon-item');
    categoryItems.forEach(item => {
      item.addEventListener('click', function () {
        if (window.innerWidth < 768) {
          const containerWidth = container.clientWidth;
          const itemLeft = this.offsetLeft;
          const itemWidth = this.offsetWidth;
          const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2);

          // Smooth scroll to position
          scroll.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: 'smooth'
          });
        }
      });
    });
  }
}

function showMaterialsSidebar() {
  const materialsSidebar = document.getElementById('materialsSidebar');
  if (materialsSidebar) {
    materialsSidebar.classList.add('show');
  }
}

// Function to check if a room is selected
function isRoomSelected() {
  const imageResult = document.getElementById('imageResult');
  return imageResult &&
    imageResult.src &&
    !imageResult.src.endsWith('placeholder.jpg') &&
    imageResult.style.display !== 'none' &&
    document.getElementById('imageAreaContainer').style.display !== 'none';
}

// Function to update the Apply Texture button visibility
function updateApplyTextureButton() {
  const applyTextureBtn = document.getElementById('applyTextureFab');
  if (!applyTextureBtn) return;

  // Check which tab is active
  const is3DTabActive = document.getElementById('threed-visualizer') &&
    document.getElementById('threed-visualizer').classList.contains('show') &&
    document.getElementById('threed-visualizer-tab') &&
    document.getElementById('threed-visualizer-tab').classList.contains('active');

  if (is3DTabActive) {
    // Always show the button in 3D tab
    applyTextureBtn.style.display = 'flex';
  } else {
    // For AI tab, only show if a room is selected
    if (isRoomSelected()) {
      applyTextureBtn.style.display = 'flex';
    } else {
      applyTextureBtn.style.display = 'none';
    }
  }
}

function addColorInput() {
  const container = document.getElementById('color-picker-container');
  const colorGroup = document.createElement('div');
  colorGroup.className = 'color-input-group mb-2';
  colorGroup.innerHTML = `
        <input type="color" name="additional_colors[]" class="form-control" style="width: 60px; display: inline-block;">
        <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeColorInput(this)">Remove</button>
    `;
  container.appendChild(colorGroup);
}

function removeColorInput(button) {
  button.parentElement.remove();
}


// Function to display accessories in the grid
function displayAccessories(accessories) {
    console.log('Displaying accessories:', accessories);
    const accessoriesGrid = document.getElementById('accessories-grid');
    
    if (!accessories || accessories.length === 0) {
        accessoriesGrid.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i> No accessories found for this category
            </div>
        `;
        return;
    }
    
    // Clear the grid
    accessoriesGrid.innerHTML = '';
    
    // Create accessory items using the same structure as materials
    accessories.forEach(accessory => {
        const accessoryItem = document.createElement('div');
        accessoryItem.className = 'material-item accessory-item';
        accessoryItem.setAttribute('data-material', 'accessory');
        accessoryItem.setAttribute('data-category', accessory.category || 'other');
        accessoryItem.setAttribute('data-price', accessory.price || 0);
        accessoryItem.setAttribute('data-manufacturer', accessory.manufacturer || '');
        accessoryItem.setAttribute('data-description', accessory.description || '');
        accessoryItem.setAttribute('data-model-path', accessory.path);
        accessoryItem.setAttribute('data-name', accessory.name || '');
        accessoryItem.setAttribute('data-id', accessory.id || '');
        
        // Map database categories to 3D scene categories
        const categoryMapping = {
            'showers': 'shower-systems',
            'bathtubs': 'bathtub',
            'sinks': 'sink',
            'toilets': 'toilet',
            'faucets': 'faucet',
            'mirrors': 'mirror',
            'lighting': 'light',
            'storage': 'storage'
        };
        
        // Get the 3D scene category name
        const sceneCategory = categoryMapping[accessory.category] || accessory.category;
        
        // Extract dimensions and volume
        let dimensions = 'N/A';
        let volume = 'N/A';
        
        if (accessory.dimensions) {
            const { length_cm, width_cm, height_cm } = accessory.dimensions;
            if (length_cm && width_cm && height_cm) {
                dimensions = `${length_cm}×${width_cm}×${height_cm} cm`;
                // Calculate volume in liters
                const volumeInLiters = (length_cm * width_cm * height_cm) / 1000;
                volume = `${volumeInLiters.toFixed(1)} L`;
            }
        }
        
        accessoryItem.innerHTML = `
            <div class="material-card">
                <button class="favorite-toggle" onclick="event.stopPropagation(); toggleAccessoryFavorite(event, ${accessory.id || 0})" data-id="${accessory.id || 0}">
                    <i class="far fa-heart"></i>
                </button>
                <div class="material-preview">
                    <img src="${accessory.thumbnail}" alt="${accessory.name}" 
                         class="img-fluid rounded shadow-sm mx-auto d-block fixed-size-image"
                         loading="lazy">
                </div>
                <div class="material-details">
                    <h6 class="material-name">${accessory.name}</h6>
                    <div class="material-meta">
                        <span class="material-badge">${accessory.category_display || accessory.category || 'Accessory'}</span>
                        <span class="material-price">${accessory.price || 0} Birr</span>
                    </div>
                    <div class="material-dimensions">
                        <i class="fas fa-ruler-combined"></i> ${dimensions}
                    </div>
                    <div class="material-volume">
                        <i class="fas fa-cube"></i> ${volume}
                    </div>
                    <div class="material-manufacturer">
                        <i class="fas fa-industry"></i> ${accessory.manufacturer}
                    </div>
                    <button class="btn btn-sm btn-success cart-btn accessory-cart-btn"
                            data-accessory-id="${accessory.id || 0}"
                            data-accessory-name="${accessory.name}"
                            data-accessory-price="${accessory.price || 0}"
                            data-accessory-thumbnail="${accessory.thumbnail}">
                        <i class="fa fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add click handler for 3D replacement - UPDATED to use mapped category
        accessoryItem.addEventListener('click', function() {
            console.log('Clicked on accessory:', accessory.name, accessory.path);
            console.log('Database category:', accessory.category, '-> 3D scene category:', sceneCategory);
            
            // Check if we have a selected fixture in the 3D scene
            if (typeof window.replaceFixture === 'function') {
                // Pass the mapped category to the 3D scene
                window.replaceFixture(accessory.path, accessory.name, sceneCategory);
            } else {
                console.error('replaceFixture function not available');
                alert('3D replacement function not available. Please make sure the 3D visualizer is loaded.');
            }
        });
        
        accessoriesGrid.appendChild(accessoryItem);
    });

    // Initialize favorites after all accessories are rendered
    setTimeout(() => {
        initAccessoryFavorites();
    }, 100);
    
    // Add event listeners to all accessory cart buttons
    document.querySelectorAll('.accessory-cart-btn').forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation();
            
            const accessoryId = parseInt(this.dataset.accessoryId);
            const name = this.dataset.accessoryName;
            const price = parseFloat(this.dataset.accessoryPrice);
            const thumbnail = this.dataset.accessoryThumbnail;
            
            addAccessoryToCart(event, accessoryId, name, price, thumbnail);
        });
    });
}


// Function to filter accessories by category
function filterAccessoriesByCategory() {
    const categoryFilter = document.getElementById('accessory-category-filter');
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
    
    console.log('Filtering accessories by category:', selectedCategory);
    
    // Reload accessories with the selected category
    load3DAccessories();
}

function load3DAccessories() {
    console.log('Loading 3D accessories...');
    const accessoriesGrid = document.getElementById('accessories-grid');
    
    // Show loading spinner
    accessoriesGrid.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading accessories...</p>
      </div>
    `;
    
    // Get selected category filter
    const categoryFilter = document.getElementById('accessory-category-filter');
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
    
    // Build API URL with category filter
    let apiUrl = '/api/3d-models';
    if (selectedCategory && selectedCategory !== 'all') {
        apiUrl += `?category=${selectedCategory}`;
    }
    
    console.log('Fetching from:', apiUrl);
    
    // Fetch accessories from the API
    fetch(apiUrl)
      .then(response => {
        console.log('API response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('API response data:', data);
        if (data.models && data.models.length > 0) {
          displayAccessories(data.models);
        } else {
          accessoriesGrid.innerHTML = `
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i> No accessories found for this category
            </div>
          `;
        }
      })
      .catch(error => {
        console.error('Error loading accessories:', error);
        accessoriesGrid.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i> Failed to load accessories: ${error.message}
          </div>
        `;
      });
}


// Single DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function () {
  // Add toggle functionality for the samples button
  const samplesButton = document.querySelector('[data-bs-target="#sampleRoomsGallery"]');
  const sampleRoomsGallery = document.getElementById('sampleRoomsGallery');

  if (samplesButton && sampleRoomsGallery) {
    // Update button text based on collapse state
    sampleRoomsGallery.addEventListener('hidden.bs.collapse', function () {
      samplesButton.innerHTML = '<i class="fas fa-images"></i> Show Samples';
      samplesButton.classList.remove('active');
    });

    sampleRoomsGallery.addEventListener('shown.bs.collapse', function () {
      samplesButton.innerHTML = '<i class="fas fa-images"></i> Hide Samples';
      samplesButton.classList.add('active');
    });
  }

  // Check if Bootstrap is available
  if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
    console.error('Bootstrap is not loaded properly. Some features may not work.');
  }
  console.log("DOM loaded, initializing all components");

  // Initialize Bootstrap components
  initBootstrapModals();
  initBootstrapTooltips();

  // Initialize price range slider
  initPriceRangeSlider();

  // Initialize search toggle
  initSearchToggle();

  // Initialize material sidebar functionality
  initMaterialTypeFiltering();
  initSearchFunctionality();
  initViewToggle();
  populateManufacturerFilter();

  // Initialize favorites
  initFavorites();

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

  if (materialTypeSelect) {
    materialTypeSelect.addEventListener('change', toggleFields);
    // Initialize fields on page load
    toggleFields();
  }

  initTooltips();
  // setupFormValidation();
  setupCategoryFilters();

  initRoomCategoryFilters();

  // Enhance scrolling for category icons
  enhanceCategoryIconsScrolling();

  const placeholder = document.querySelector('.placeholder-container');
  if (placeholder) {
    placeholder.addEventListener('click', function () {
      document.getElementById('upload').click();
    });
  }

  updateCartCount();

  setTimeout(() => {
    console.log("About to initialize comparison slider");
    initComparisonSlider();
  }, 200);

  const applyTextureBtn = document.getElementById('applyTextureFab');
  if (!applyTextureBtn) return;

  // Initially check if button should be visible
  updateApplyTextureButton();

  // Add click event to handle the button touch
  applyTextureBtn.addEventListener('click', function () {
    // Remove pulse animation and hide tooltip after first touch
    this.classList.add('touched');
    this.classList.remove('pulse-animation');

    // Hide the tooltip
    const tooltip = this.querySelector('.fab-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }

    // Show materials sidebar
    const materialsSidebar = document.getElementById('materialsSidebar');
    if (materialsSidebar) {
      materialsSidebar.classList.add('show');
    }
  });

  // Get the back to top button
  const backToTopBtn = document.querySelector('.back-to-top');
  if (!backToTopBtn) return;

  // Function to handle scroll events
  function handleScroll() {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.body.scrollHeight;
    const isMobile = window.innerWidth < 768;

    // Show button only when scrolled down at least 300px
    if (scrollPosition > 300) {
      backToTopBtn.classList.add('show-btn');

      // On mobile, adjust position when near the bottom to avoid conflicts
      if (isMobile) {
        // If near the bottom of the page (within 200px of bottom)
        if (scrollPosition + windowHeight > documentHeight - 200) {
          backToTopBtn.classList.add('position-adjusted');
        } else {
          backToTopBtn.classList.remove('position-adjusted');
        }
      }
    } else {
      backToTopBtn.classList.remove('show-btn');
      backToTopBtn.classList.remove('position-adjusted');
    }
  }

  // Add scroll event listener
  window.addEventListener('scroll', handleScroll);

  // Initial check
  handleScroll();

  // Get the tabs
  const aiTab = document.getElementById('ai-visualizer-tab');
  const threeDTab = document.getElementById('threed-visualizer-tab');

  // Add event listeners to tabs
  aiTab.addEventListener('click', function () {
    // Show AI visualizer specific elements
    document.querySelectorAll('.ai-visualizer-only').forEach(el => {
      el.style.display = '';
    });

    // Hide 3D visualizer specific elements
    document.querySelectorAll('.threed-visualizer-only').forEach(el => {
      el.style.display = 'none';
    });
  });

  threeDTab.addEventListener('click', function () {
    // Hide AI visualizer specific elements
    document.querySelectorAll('.ai-visualizer-only').forEach(el => {
      el.style.display = 'none';
    });

    // Show 3D visualizer specific elements
    document.querySelectorAll('.threed-visualizer-only').forEach(el => {
      el.style.display = '';
    });

    // Ensure the iframe is loaded
    const iframe = document.querySelector('#threed-visualizer iframe');
    if (iframe.src === 'about:blank' || !iframe.src.includes('threed-visualizer')) {
      iframe.src = '/3d-visualizer';
    }
  });

  // Handle material selection for 3D visualizer
  const originalSelectTexture = window.selectTexture;

  window.selectTexture = function (texturePath, specs) {
    // Call the original function
    originalSelectTexture(texturePath, specs);

    // If 3D tab is active, also send the texture to the 3D visualizer
    if (document.getElementById('threed-visualizer').classList.contains('active')) {
      const iframe = document.querySelector('#threed-visualizer iframe');
      if (iframe.contentWindow) {
        // Send a message to the iframe with the selected texture
        iframe.contentWindow.postMessage({
          type: 'selectTexture',
          texture: texturePath,
          specs: specs
        }, '*');
      }
    }
  };

  // Handle 3D accessories filtering
  const materialTypeButtons = document.querySelectorAll('.material-type-btn');
  materialTypeButtons.forEach(button => {
    button.addEventListener('click', function () {
      const category = this.dataset.category;

      // Remove active class from all buttons
      materialTypeButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      this.classList.add('active');

      // Filter materials based on category
      const materialItems = document.querySelectorAll('.material-item');
      materialItems.forEach(item => {
        if (category === 'all' || item.dataset.material === category) {
          item.style.display = '';
        } else if (category === '3d-accessories' && item.dataset.material === '3d-accessory') {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });


  // Mobile navigation buttons
  const mobileRoomViewBtn = document.getElementById('mobileRoomViewBtn');
  const mobileMaterialsBtn = document.getElementById('mobileMaterialsBtn');
  const mobileFiltersBtn = document.getElementById('mobileFiltersBtn');
  const mobileToolsBtn = document.getElementById('mobileToolsBtn');
  // THe new buttons that replace Filter and Material
  const mobileAIBtn = document.getElementById('mobileAIBtn');
  const mobile3DBtn = document.getElementById('mobile3DBtn');

  // Panels
  const materialsSidebar = document.getElementById('materialsSidebar');
  const filterPanel = document.getElementById('filterPanel');
  const mobileToolsPanel = document.getElementById('mobileToolsPanel');

  // Close buttons
  const closeMaterialsBtn = document.getElementById('closeMaterialsBtn');
  const closeToolsBtn = document.getElementById('closeToolsBtn');

  // Check if elements exist (they might not on other pages)
  if (mobileMaterialsBtn && materialsSidebar) {
    console.log("Found materials button and sidebar");

    // Add click event to the materials button
    mobileMaterialsBtn.addEventListener('click', function () {
      console.log("Materials button clicked");

      // Toggle the show class on the materials sidebar
      if (materialsSidebar.classList.contains('show')) {
        materialsSidebar.classList.remove('show');
      } else {
        materialsSidebar.classList.add('show');

        // Hide filter panel if it's open
        const filterPanel = document.getElementById('filterPanel');
        if (filterPanel && filterPanel.classList.contains('show')) {
          filterPanel.classList.remove('show');
        }
      }

      // Update active button
      const navButtons = document.querySelectorAll('.mobile-nav-bar .btn');
      navButtons.forEach(btn => btn.classList.remove('active'));
      mobileMaterialsBtn.classList.add('active');
    });

    // Add close button functionality
    const closeMaterialsBtn = document.getElementById('closeMaterialsBtn');
    if (closeMaterialsBtn) {
      closeMaterialsBtn.addEventListener('click', function () {
        materialsSidebar.classList.remove('show');

        // Update active button
        const navButtons = document.querySelectorAll('.mobile-nav-bar .btn');
        navButtons.forEach(btn => btn.classList.remove('active'));
        const mobileRoomViewBtn = document.getElementById('mobileRoomViewBtn');
        if (mobileRoomViewBtn) {
          mobileRoomViewBtn.classList.add('active');
        }
      });
    }
  }

  if (mobileFiltersBtn && filterPanel) {
    console.log("Found filter button and panel");

    // Add click event to the filter button
    mobileFiltersBtn.addEventListener('click', function () {
      console.log("Filter button clicked");

      // Toggle the filter panel
      if (typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
        const bsCollapse = bootstrap.Collapse.getInstance(filterPanel) || new bootstrap.Collapse(filterPanel);
        if (filterPanel.classList.contains('show')) {
          bsCollapse.hide();
        } else {
          bsCollapse.show();

          // Hide other panels
          const materialsSidebar = document.getElementById('materialsSidebar');
          if (materialsSidebar && materialsSidebar.classList.contains('show')) {
            materialsSidebar.classList.remove('show');
          }

          const mobileToolsPanel = document.getElementById('mobileToolsPanel');
          if (mobileToolsPanel && mobileToolsPanel.classList.contains('show')) {
            mobileToolsPanel.classList.remove('show');
          }
        }
      } else {
        // Fallback if Bootstrap JS is not available
        filterPanel.classList.toggle('show');
      }

      // Update active button
      const navButtons = document.querySelectorAll('.mobile-nav-bar .btn');
      navButtons.forEach(btn => btn.classList.remove('active'));
      mobileFiltersBtn.classList.add('active');
    });
  }

  // Handle AI button
  if (mobileAIBtn) {
    mobileAIBtn.addEventListener('click', function () {
      console.log("AI button clicked");

      // Hide tools panel if it's open
      if (mobileToolsPanel && mobileToolsPanel.classList.contains('show')) {
        mobileToolsPanel.classList.remove('show');
      }

      // Update active button
      setActiveNavButton(mobileAIBtn);

      // Show AI visualizer tab
      document.getElementById('ai-visualizer-tab').click();
    });
  }

  // Handle 3D button
  if (mobile3DBtn) {
    mobile3DBtn.addEventListener('click', function () {
      console.log("3D button clicked");

      // Hide tools panel if it's open
      if (mobileToolsPanel && mobileToolsPanel.classList.contains('show')) {
        mobileToolsPanel.classList.remove('show');
      }

      // Update active button
      setActiveNavButton(mobile3DBtn);

      // Show 3D visualizer tab
      document.getElementById('threed-visualizer-tab').click();
    });
  }

  if (mobileToolsBtn && mobileToolsPanel) {
    console.log("Found tools button and panel");

    // Add click event to the tools button
    mobileToolsBtn.addEventListener('click', function () {
      console.log("Tools button clicked");

      // Toggle the show class on the tools panel
      if (mobileToolsPanel.classList.contains('show')) {
        mobileToolsPanel.classList.remove('show');
      } else {
        mobileToolsPanel.classList.add('show');

        // Hide materials sidebar if it's open
        const materialsSidebar = document.getElementById('materialsSidebar');
        if (materialsSidebar && materialsSidebar.classList.contains('show')) {
          materialsSidebar.classList.remove('show');
        }

        // Hide filter panel if it's open
        const filterPanel = document.getElementById('filterPanel');
        if (filterPanel && filterPanel.classList.contains('show')) {
          filterPanel.classList.remove('show');
        }
      }

      // Update active button
      const navButtons = document.querySelectorAll('.mobile-nav-bar .btn');
      navButtons.forEach(btn => btn.classList.remove('active'));
      mobileToolsBtn.classList.add('active');
    });

    // Add close button functionality
    const closeToolsBtn = document.getElementById('closeToolsBtn');
    if (closeToolsBtn) {
      closeToolsBtn.addEventListener('click', function () {
        mobileToolsPanel.classList.remove('show');

        // Update active button
        const navButtons = document.querySelectorAll('.mobile-nav-bar .btn');
        navButtons.forEach(btn => btn.classList.remove('active'));
        const mobileRoomViewBtn = document.getElementById('mobileRoomViewBtn');
        if (mobileRoomViewBtn) {
          mobileRoomViewBtn.classList.add('active');
        }
      });
    }
  }

  if (mobileRoomViewBtn) {
    console.log("Found room view button");

    // Add click event to the room view button
    mobileRoomViewBtn.addEventListener('click', function () {
      console.log("Room view button clicked");

      // Hide materials sidebar if it's open
      const materialsSidebar = document.getElementById('materialsSidebar');
      if (materialsSidebar) {
        materialsSidebar.classList.remove('show');
      }

      // Hide filter panel if it's open
      const filterPanel = document.getElementById('filterPanel');
      if (filterPanel && filterPanel.classList.contains('show')) {
        // For Bootstrap collapse
        const bsCollapse = bootstrap.Collapse.getInstance(filterPanel);
        if (bsCollapse) {
          bsCollapse.hide();
        } else {
          filterPanel.classList.remove('show');
        }
      }

      // Hide tools panel if it's open
      const mobileToolsPanel = document.getElementById('mobileToolsPanel');
      if (mobileToolsPanel && mobileToolsPanel.classList.contains('show')) {
        mobileToolsPanel.classList.remove('show');
      }

      // Update active button
      const navButtons = document.querySelectorAll('.mobile-nav-bar .btn');
      navButtons.forEach(btn => btn.classList.remove('active'));
      mobileRoomViewBtn.classList.add('active');

      // Show the room selection area
      document.getElementById('ai-visualizer').classList.add('active', 'show');
      document.getElementById('threed-visualizer').classList.remove('active', 'show');

      // Scroll to the top of the page to show room upload/selection area
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Close buttons
  if (closeMaterialsBtn) {
    closeMaterialsBtn.addEventListener('click', function () {
      const materialsSidebar = document.getElementById('materialsSidebar');
      if (materialsSidebar) {
        materialsSidebar.classList.remove('show');
      }

      // Update active button based on which tab is active
      if (document.getElementById('ai-visualizer').classList.contains('active')) {
        const mobileAIBtn = document.getElementById('mobileAIBtn');
        if (mobileAIBtn) {
          setActiveNavButton(mobileAIBtn);
        }
      } else if (document.getElementById('threed-visualizer').classList.contains('active')) {
        const mobile3DBtn = document.getElementById('mobile3DBtn');
        if (mobile3DBtn) {
          setActiveNavButton(mobile3DBtn);
        }
      }
    });
  }



  if (closeToolsBtn) {
    closeToolsBtn.addEventListener('click', function () {
      mobileToolsPanel.classList.remove('show');
      setActiveNavButton(mobileRoomViewBtn);
    });
  }

  // Helper function to set active nav button
  function setActiveNavButton(activeButton) {
    const buttons = [mobileRoomViewBtn, mobileAIBtn, mobile3DBtn, mobileToolsBtn];
    buttons.forEach(btn => {
      if (btn) {
        btn.classList.remove('active');
      }
    });
    if (activeButton) {
      activeButton.classList.add('active');
    }
  }
  // Fix horizontal scrolling issues in sample rooms
  const sampleRoomsGrid = document.querySelector('.sample-rooms-grid');
  if (sampleRoomsGrid) {
    // Prevent vertical scrolling when scrolling horizontally
    sampleRoomsGrid.addEventListener('touchmove', function (e) {
      // Check if scroll is mostly horizontal
      const touch = e.touches[0];
      if (!this.lastTouch) {
        this.lastTouch = touch;
        return;
      }

      const deltaX = Math.abs(touch.clientX - this.lastTouch.clientX);
      const deltaY = Math.abs(touch.clientY - this.lastTouch.clientY);

      if (deltaX > deltaY) {
        // If horizontal scrolling dominates, prevent default to avoid page scroll
        e.stopPropagation();
      }

      this.lastTouch = touch;
    }, { passive: true });
  }

  // Add swipe gestures for mobile
  // let touchStartX = 0;
  // let touchEndX = 0;

  // document.addEventListener('touchstart', e => {
  //   touchStartX = e.changedTouches[0].screenX;
  // });

  // document.addEventListener('touchend', e => {
  //   touchEndX = e.changedTouches[0].screenX;
  //   handleSwipe();
  // });

  // function handleSwipe() {
  //   const swipeThreshold = 100; // minimum distance for swipe

  //   if (touchEndX < touchStartX - swipeThreshold) {
  //     // Swipe left - show materials
  //     if (mobileMaterialsBtn && window.innerWidth < 768) {
  //       mobileMaterialsBtn.click();
  //     }
  //   }

  //   if (touchEndX > touchStartX + swipeThreshold) {
  //     // Swipe right - show room view
  //     if (mobileRoomViewBtn && window.innerWidth < 768) {
  //       mobileRoomViewBtn.click();
  //     }
  //   }
  // } 

  // Close filters button
  const closeFiltersBtn = document.getElementById('closeFiltersBtn');
  if (closeFiltersBtn) {
    closeFiltersBtn.addEventListener('click', function () {
      const filterPanel = document.getElementById('filterPanel');
      filterPanel.classList.remove('show');

      // Update active nav button
      const mobileRoomViewBtn = document.getElementById('mobileRoomViewBtn');
      if (mobileRoomViewBtn) {
        const buttons = document.querySelectorAll('.mobile-nav-bar .btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        mobileRoomViewBtn.classList.add('active');
      }
    });
  }

  const categoryIcons = document.querySelectorAll('.category-icon-item');
  const sampleRoomItems = document.querySelectorAll('.sample-room-item');

  if (categoryIcons.length > 0) {
    console.log(`Found ${categoryIcons.length} category icons`);

    categoryIcons.forEach(icon => {
      icon.addEventListener('click', function () {
        const selectedCategory = this.getAttribute('data-category');
        console.log(`Selected category: ${selectedCategory}`);

        // Remove active class from all icons
        categoryIcons.forEach(item => item.classList.remove('active'));

        // Add active class to clicked icon
        this.classList.add('active');

        // Show/hide sample room items based on category
        sampleRoomItems.forEach(item => {
          const itemCategory = item.getAttribute('data-category');

          if (selectedCategory === 'all' || itemCategory === selectedCategory) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });

        // Also update the desktop buttons if they exist
        const desktopButtons = document.querySelectorAll('.room-category-filters .btn-group .btn');
        desktopButtons.forEach(btn => {
          if (btn.getAttribute('data-category') === selectedCategory) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      });
    });
  }

  // Make sure desktop buttons also update mobile icons
  const desktopButtons = document.querySelectorAll('.room-category-filters .btn-group .btn');
  desktopButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const selectedCategory = this.getAttribute('data-category');

      // Update mobile icons
      categoryIcons.forEach(icon => {
        if (icon.getAttribute('data-category') === selectedCategory) {
          icon.classList.add('active');
        } else {
          icon.classList.remove('active');
        }
      });
    });
  });

  // Handle form submission
  const materialUploadForm = document.getElementById('materialUploadForm');
  if (materialUploadForm) {
      materialUploadForm.addEventListener('submit', function(e) {
          e.preventDefault();
          
          const materialType = document.getElementById('materialType').value;
          const originalFormData = new FormData(this);
          
          console.log('Material type:', materialType);
          
          if (materialType === 'accessory') {
              // Create a new FormData with only the fields needed for accessories
              const accessoryFormData = new FormData();
              
              // Map the form fields to the correct accessory field names
              accessoryFormData.append('name', originalFormData.get('name'));
              accessoryFormData.append('category', originalFormData.get('category'));
              accessoryFormData.append('manufacturer', originalFormData.get('manufacturer'));
              accessoryFormData.append('description', originalFormData.get('description'));
              accessoryFormData.append('price', originalFormData.get('price_per_sqm')); // Fix field name
              accessoryFormData.append('length_cm', originalFormData.get('length_cm'));
              accessoryFormData.append('width_cm', originalFormData.get('width_cm'));
              accessoryFormData.append('height_cm', originalFormData.get('height_cm'));
              accessoryFormData.append('volume_liters', originalFormData.get('volume_liters'));
              accessoryFormData.append('weight_kg', originalFormData.get('weight_kg'));
              accessoryFormData.append('material_type', originalFormData.get('material_type'));
              accessoryFormData.append('default_color', originalFormData.get('default_color'));
              accessoryFormData.append('installation_difficulty', originalFormData.get('installation_difficulty'));
              accessoryFormData.append('style_category', originalFormData.get('style_category'));
              accessoryFormData.append('model_file', originalFormData.get('model_file'));
              
              // Handle thumbnail image
              const thumbnailImage = originalFormData.get('thumbnail_image');
              if (thumbnailImage && thumbnailImage.size > 0) {
                  accessoryFormData.append('thumbnail_image', thumbnailImage);
              }
              
              // Collect additional colors
              const additionalColors = [];
              originalFormData.getAll('additional_colors[]').forEach(color => {
                  if (color) {
                      additionalColors.push(color);
                  }
              });
              if (additionalColors.length > 0) {
                  accessoryFormData.append('additional_colors', JSON.stringify(additionalColors));
              }
              
              console.log('=== ACCESSORY FORM DATA ===');
              for (let [key, value] of accessoryFormData.entries()) {
                  console.log(`${key}:`, value);
              }
              
              // Submit to accessories endpoint
              fetch('/api/accessories/', {
                  method: 'POST',
                  body: accessoryFormData
              })
              .then(response => {
                  console.log('Response status:', response.status);
                  if (!response.ok) {
                      return response.text().then(text => {
                          console.error('Error response:', text);
                          throw new Error(`HTTP ${response.status}: ${text}`);
                      });
                  }
                  return response.json();
              })
              .then(data => {
                  console.log('Success response:', data);
                  alert('Accessory uploaded successfully!');
                  location.reload();
              })
              .catch(error => {
                  console.error('Error:', error);
                  alert('Error uploading accessory: ' + error.message);
              });
              
          } else {
              // Handle regular tile/material upload
              fetch('/api/tiles/', {
                  method: 'POST',
                  body: originalFormData
              })
              .then(response => {
                  console.log('Response status:', response.status);
                  if (!response.ok) {
                      return response.text().then(text => {
                          throw new Error(`HTTP ${response.status}: ${text}`);
                      });
                  }
                  return response.json();
              })
              .then(data => {
                  console.log('Success response:', data);
                  if (data.message) {
                      alert('Material uploaded successfully!');
                      location.reload();
                  } else {
                      alert('Error uploading material: ' + (data.detail || 'Unknown error'));
                  }
              })
              .catch(error => {
                  console.error('Error:', error);
                  alert('Error uploading material: ' + error.message);
              });
          }
      });
  }

});

// Make sure these functions are globally available
window.toggleAccessoryFavorite = toggleAccessoryFavorite;
window.displayAccessories = displayAccessories;
window.load3DAccessories = load3DAccessories;
window.initAccessoryFavorites = initAccessoryFavorites;
window.filterAccessoriesByFavorites = filterAccessoriesByFavorites;