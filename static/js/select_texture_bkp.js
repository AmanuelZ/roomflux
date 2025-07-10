let currentTextureName = '';
// Global variables for wall-by-wall method
let wallCounter = 0;
let wallItems = [];
let deductionItems = [];

// Select Texture function
function selectTexture(image, tileData) {
    const cleanImagePath = image.replace(/^\//, '');
    console.log('Selected tile data:', tileData); // Debug log

    // Make sure we have the correct material type
    // Use the material property from tileData if available
    const materialType = tileData.material ||
        (image.includes('paint') ? 'paint' :
            image.includes('wallpaper') ? 'wallpaper' : 'tile');

    // Store selected tile info with all necessary properties
    window.selectedTileSpecs = {
        ...tileData,
        image_path: image, // Store the image path
        materialType: materialType // Explicitly set the material type
    };

    // Store the material ID and name for the cart
    // Make sure the ID is a valid integer
    window.selectedMaterialId = tileData.id ? parseInt(tileData.id) : null;
    window.selectedMaterialName = tileData.name || '';
    window.selectedMaterialPrice = tileData.price_per_sqm || 0;

    console.log('Stored material info:', {
        id: window.selectedMaterialId,
        name: window.selectedMaterialName,
        price: window.selectedMaterialPrice,
        type: materialType
    });

    // Update tile info display
    document.getElementById('selectedTilePreview').src = image;
    document.getElementById('selectedTileName').textContent = tileData.name || 'Selected Material';
    document.getElementById('materialType').textContent = window.selectedTileSpecs.materialType;

    // Show/hide size info based on material type
    if (tileData.width && tileData.height) {
        document.getElementById('tileSizeContainer').style.display = 'block';
        document.getElementById('tileSize').textContent = `${tileData.width} x ${tileData.height} cm`;
    } else {
        document.getElementById('tileSizeContainer').style.display = 'none';
    }

    document.getElementById('tilePrice').textContent = tileData.price_per_sqm;

    fetch(`/apply_texture/${cleanImagePath}`, {
        method: 'POST'
    })
        .then(response => response.json())
        .then(data => {
            if (data.state === 'success') {
                const newImagePath = `/${data.room_path}?t=${new Date().getTime()}`;
                console.log('New image path:', newImagePath);
                document.getElementById('imageResult').src = newImagePath;
                document.getElementById('actionButtonsContainer').style.display = 'flex';
                document.getElementById('selectedTilePreview').src = image;
            } else {
                console.log('Server response:', data); // Add this to see the actual error
                alert('Error applying texture.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function handleTextureSelection(imagePath, tileData) {
    console.log("Handling texture selection:", imagePath);

    // Check which tab is active - more reliable method
    const threeDTab = document.getElementById('threed-visualizer-tab');
    const is3DTabActive = threeDTab && threeDTab.classList.contains('active');

    console.log("3D tab active?", is3DTabActive);

    if (is3DTabActive && typeof window.selectTexture3D === 'function') {
        console.log("Routing to 3D texture selection");
        window.selectTexture3D(imagePath, tileData);
    } else {
        console.log("Routing to AI texture selection");
        selectTexture(imagePath, tileData);
    }
}

window.handleTextureSelection = handleTextureSelection;

function calculateMaterials() {
    console.log('Calculating materials...'); // Debug log
    console.log('Selected Tile Specs:', window.selectedTileSpecs);

    if (!window.selectedTileSpecs) {
        alert('Please select a material first!');
        return;
    }

    const roomWidth = parseFloat(document.getElementById('roomWidth').value);
    const roomLength = parseFloat(document.getElementById('roomLength').value);
    const roomHeight = parseFloat(document.getElementById('roomHeight').value);

    if (!roomWidth || !roomLength || !roomHeight) {
        alert('Please enter all room dimensions');
        return;
    }

    // Calculate wall area (excluding ceiling)
    const wallArea = 2 * (roomLength * roomHeight + roomWidth * roomHeight);
    document.getElementById('totalArea').textContent = wallArea.toFixed(2);

    // Get material type
    const materialType = window.selectedTileSpecs.materialType || 'tile';
    console.log("Material type for calculation:", materialType);

    // Calculate based on material type
    let materialSummary = '';
    let calculatedQuantity = 0;

    switch (materialType.toLowerCase()) {
        case 'tile':
            // Calculate tiles needed
            const tileArea = (window.selectedTileSpecs.width * window.selectedTileSpecs.height) / 10000; // cm² to m²
            const tilesNeeded = Math.ceil(wallArea / tileArea);
            const totalTilesNeeded = Math.ceil(tilesNeeded * 1.1); // 10% extra for cuts

            // Update UI
            document.getElementById('tilesNeeded').textContent = totalTilesNeeded;
            materialSummary = `${totalTilesNeeded} tiles`;
            calculatedQuantity = totalTilesNeeded;
            break;

        case 'paint':
            // Get paint options
            const coatCount = parseInt(document.getElementById('coatCount').value) || 2;
            const includeCeiling = document.getElementById('includeCeiling').checked;

            // Calculate paint needed
            let totalArea = wallArea;
            if (includeCeiling) {
                const ceilingArea = roomWidth * roomLength;
                totalArea += ceilingArea;
            }

            // Assume 1 liter covers 10m² per coat
            const coveragePerLiter = 10; // m²
            const litersNeeded = (totalArea * coatCount) / coveragePerLiter;

            // Calculate recommended cans
            const canSizes = [1, 2.5, 5, 10]; // Standard can sizes in liters
            let recommendedCans = '';
            let remainingLiters = litersNeeded;

            // Start with the largest can size
            for (let i = canSizes.length - 1; i >= 0; i--) {
                const canSize = canSizes[i];
                const canCount = Math.floor(remainingLiters / canSize);

                if (canCount > 0) {
                    recommendedCans += `${canCount} × ${canSize}L`;
                    remainingLiters -= canCount * canSize;

                    if (remainingLiters > 0) {
                        recommendedCans += ' + ';
                    }
                }
            }

            // If there's still a small amount left, add the smallest can
            if (remainingLiters > 0) {
                recommendedCans += `1 × ${canSizes[0]}L`;
            }

            // Update UI
            document.getElementById('paintNeeded').textContent = litersNeeded.toFixed(2);
            document.getElementById('paintCans').textContent = recommendedCans;

            materialSummary = `${Math.ceil(litersNeeded)} liters (${coatCount} coats)`;
            if (includeCeiling) {
                materialSummary += ' including ceiling';
            }

            calculatedQuantity = Math.ceil(litersNeeded);
            break;

        case 'wallpaper':
            // Get wallpaper options
            const includeWaste = document.getElementById('includeWastePercentage').checked;

            // Calculate wallpaper needed
            // Standard wallpaper roll is 0.53m wide and 10m long
            const rollWidth = 0.53; // m
            const rollLength = 10; // m

            // Calculate how many strips we can get from one roll
            const stripsPerRoll = Math.floor(rollLength / roomHeight);

            // Calculate how many strips we need for the room
            const roomPerimeter = 2 * (roomWidth + roomLength);
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

            calculatedQuantity = rollsNeeded;
            break;

        default:
            // Default to tile calculation
            const defaultTileArea = 0.16; // Default to 40cm × 40cm tile
            const defaultTilesNeeded = Math.ceil(wallArea / defaultTileArea);
            const defaultTotalTilesNeeded = Math.ceil(defaultTilesNeeded * 1.1); // 10% extra

            materialSummary = `${defaultTotalTilesNeeded} pieces`;
            calculatedQuantity = defaultTotalTilesNeeded;
    }

    // Update the total material needed summary
    document.getElementById('totalMaterialNeeded').textContent = materialSummary;

    // Calculate cost for all material types
    const totalCost = wallArea * window.selectedTileSpecs.price_per_sqm;
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
    const tileWidthM = window.selectedTileSpecs.width / 100; // Convert cm to m
    const wallPerimeter = 2 * (parseFloat(document.getElementById('roomWidth').value) +
        parseFloat(document.getElementById('roomLength').value));
    const tilesPerRow = Math.ceil(wallPerimeter / tileWidthM);
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

    // Get wallpaper options
    const includeWaste = document.getElementById('includeWastePercentage').checked;

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
