/**
 * 3D Showcase Module
 * Handles isolated 3D preview of accessories and materials
 */

// Showcase-specific variables
let showcaseScene = null;
let showcaseCamera = null;
let showcaseRenderer = null;
let showcaseControls = null;
let showcaseObject = null;
let showcaseAnimationId = null;
let showcaseWireframe = false;
let currentAccessoryData = null;
let currentSelectedColor = null;

// Showcase initialization
function initializeShowcase() {
    const container = document.getElementById('showcase-viewer');
    if (!container) {
        console.error('Showcase container not found');
        return false;
    }

    // Create scene
    showcaseScene = new THREE.Scene();
    showcaseScene.background = new THREE.Color(0x1a1a1a);

    // Create camera
    const containerRect = container.getBoundingClientRect();
    showcaseCamera = new THREE.PerspectiveCamera(
        50,
        containerRect.width / containerRect.height,
        0.1,
        1000
    );
    showcaseCamera.position.set(2, 2, 2);

    // Create renderer
    showcaseRenderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
    });
    showcaseRenderer.setSize(containerRect.width, containerRect.height);
    showcaseRenderer.setPixelRatio(window.devicePixelRatio);
    showcaseRenderer.shadowMap.enabled = true;
    showcaseRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    showcaseRenderer.outputEncoding = THREE.sRGBEncoding;
    showcaseRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    showcaseRenderer.toneMappingExposure = 1.2;

    // Clear container and add renderer
    container.innerHTML = '';
    container.appendChild(showcaseRenderer.domElement);

    // Add lighting
    setupShowcaseLighting();

    // Add controls
    if (typeof THREE.OrbitControls !== 'undefined') {
        showcaseControls = new THREE.OrbitControls(showcaseCamera, showcaseRenderer.domElement);
        showcaseControls.enableDamping = true;
        showcaseControls.dampingFactor = 0.05;
        showcaseControls.enableZoom = true;
        showcaseControls.enablePan = false; // Disable panning for focused view
        showcaseControls.autoRotate = false;
        showcaseControls.maxDistance = 10;
        showcaseControls.minDistance = 0.5;
    } else {
        console.warn('OrbitControls not available, loading...');
        loadScript('https://unpkg.com/three@0.137.0/examples/js/controls/OrbitControls.js', () => {
            showcaseControls = new THREE.OrbitControls(showcaseCamera, showcaseRenderer.domElement);
            setupShowcaseControls();
        });
    }

    // Start render loop
    startShowcaseRenderLoop();

    // Handle window resize
    window.addEventListener('resize', onShowcaseResize);

    return true;
}

function setupShowcaseLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    showcaseScene.add(ambientLight);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    showcaseScene.add(mainLight);

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 3, -5);
    showcaseScene.add(fillLight);

    // Rim light for edge definition
    const rimLight = new THREE.DirectionalLight(0x4080ff, 0.3);
    rimLight.position.set(0, 5, -5);
    showcaseScene.add(rimLight);

    // Point light for close-up details
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 10);
    pointLight.position.set(2, 2, 2);
    showcaseScene.add(pointLight);
}

function setupShowcaseControls() {
    if (showcaseControls) {
        showcaseControls.enableDamping = true;
        showcaseControls.dampingFactor = 0.05;
        showcaseControls.enableZoom = true;
        showcaseControls.enablePan = false;
        showcaseControls.autoRotate = false;
        showcaseControls.maxDistance = 10;
        showcaseControls.minDistance = 0.5;
    }
}

function startShowcaseRenderLoop() {
    // Stop any existing loop first
    if (showcaseAnimationId) {
        cancelAnimationFrame(showcaseAnimationId);
        showcaseAnimationId = null;
    }
    
    function animate() {
        showcaseAnimationId = requestAnimationFrame(animate);
        
        if (showcaseControls) {
            showcaseControls.update();
        }
        
        if (showcaseRenderer && showcaseScene && showcaseCamera) {
            showcaseRenderer.render(showcaseScene, showcaseCamera);
        }
    }
    
    animate();
    console.log('Showcase render loop started');
}

function stopShowcaseRenderLoop() {
    if (showcaseAnimationId) {
        cancelAnimationFrame(showcaseAnimationId);
        showcaseAnimationId = null;
        console.log('Showcase render loop stopped');
    }
}


function onShowcaseResize() {
    if (!showcaseRenderer || !showcaseCamera) return;
    
    const container = document.getElementById('showcase-viewer');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    showcaseCamera.aspect = containerRect.width / containerRect.height;
    showcaseCamera.updateProjectionMatrix();
    
    showcaseRenderer.setSize(containerRect.width, containerRect.height);
}

// Main showcase functions
function openShowcase(fixture) {
    console.log('Opening showcase for:', fixture.userData.originalName);
    
    // Store current accessory data
    currentAccessoryData = null;
    currentSelectedColor = null;
    
    // Check if this is an accessory with color options
    if (fixture.userData.replacement && fixture.userData.replacement.userData && fixture.userData.replacement.userData.accessoryData) {
        currentAccessoryData = fixture.userData.replacement.userData.accessoryData;
        console.log('Accessory data found:', currentAccessoryData);
    }
    
    // Show modal
    const modal = document.getElementById('showcase-modal');
    if (!modal) {
        console.error('Showcase modal not found');
        return;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Update title
    const title = document.getElementById('showcase-title');
    if (title) {
        title.textContent = `Preview: ${fixture.userData.originalName || 'Accessory'}`;
    }
    
    // Initialize showcase if not already done
    if (!showcaseRenderer) {
        setTimeout(() => {
            if (initializeShowcase()) {
                loadObjectIntoShowcase(fixture);
                // Setup color options if available
                setupColorOptions();
            }
        }, 100); // Small delay to ensure modal is visible
    } else {
        loadObjectIntoShowcase(fixture);
    
        // Setup color options if available
        setupColorOptions();
    }
}

function setupColorOptions() {
    const colorOptionsContainer = document.getElementById('showcase-color-options');
    const colorSwatchesContainer = document.getElementById('color-swatches');
    
    // Hide color options by default
    colorOptionsContainer.style.display = 'none';
    colorSwatchesContainer.innerHTML = '';
    
    // Check if we have accessory data with colors
    if (!currentAccessoryData || !currentAccessoryData.available_colors || !Array.isArray(currentAccessoryData.available_colors)) {
        console.log('No color options available for this item');
        return;
    }
    
    console.log('Setting up color options:', currentAccessoryData.available_colors);
    
    // Show color options container
    colorOptionsContainer.style.display = 'block';
    
    // Create color swatches
    currentAccessoryData.available_colors.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.title = `Color option ${index + 1}`;
        swatch.dataset.color = color;
        
        // Set default color as active
        if (color === currentAccessoryData.default_color) {
            swatch.classList.add('active');
            currentSelectedColor = color;
        }
        
        // Add click handler
        swatch.addEventListener('click', () => {
            selectColor(color, swatch);
        });
        
        colorSwatchesContainer.appendChild(swatch);
    });
    
    console.log(`Created ${currentAccessoryData.available_colors.length} color swatches`);
}

function selectColor(color, swatchElement) {
    console.log('Selecting color:', color);
    
    // Update active state
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.remove('active');
    });
    swatchElement.classList.add('active');
    
    // Store selected color
    currentSelectedColor = color;
    
    // Apply color to the 3D model
    applyColorToShowcaseObject(color);
}

// New function to apply color to the 3D object
function applyColorToShowcaseObject(color) {
    if (!showcaseObject) {
        console.log('No showcase object to apply color to');
        return;
    }
    
    console.log('Applying color to showcase object:', color);
    
    // Convert hex color to Three.js Color
    const threeColor = new THREE.Color(color);
    
    // Apply color to all meshes in the object
    showcaseObject.traverse(child => {
        if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                // Handle multiple materials
                child.material.forEach(material => {
                    if (material.color) {
                        material.color.copy(threeColor);
                        material.needsUpdate = true;
                    }
                });
            } else {
                // Handle single material
                if (child.material.color) {
                    child.material.color.copy(threeColor);
                    child.material.needsUpdate = true;
                }
            }
        }
    });
    
    console.log('Color applied successfully');
}


function loadObjectIntoShowcase(fixture) {
    console.log('Loading object into showcase:', fixture.userData);
    
    // STOP the current render loop first
    stopShowcaseRenderLoop();
    
    // PROPER CLEANUP - Clear previous object and dispose resources
    if (showcaseObject) {
        showcaseObject.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        
        showcaseScene.remove(showcaseObject);
        showcaseObject = null;
    }
    
    // COMPLETELY REINITIALIZE CONTROLS
    if (showcaseControls) {
        showcaseControls.dispose();
        showcaseControls = null;
    }
    
    // Show loading indicator
    showShowcaseLoading(true);
    
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
        try {
            // Check if this is a replacement object or original fixture
            let objectToClone = fixture;
            let isReplacement = false;
            
            if (fixture.userData.replacement) {
                objectToClone = fixture.userData.replacement;
                isReplacement = true;
                console.log('Using replacement object for showcase');
            }
            
            // Create a new group to hold the cloned meshes
            showcaseObject = new THREE.Group();
            
            // Manually traverse and clone only the mesh data we need
            objectToClone.traverse(child => {
                if (child.isMesh) {
                    const clonedGeometry = child.geometry.clone();
                    let clonedMaterial;
                    
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            clonedMaterial = child.material.map(mat => mat.clone());
                        } else {
                            clonedMaterial = child.material.clone();
                        }
                    } else {
                        clonedMaterial = new THREE.MeshStandardMaterial({
                            color: 0xffffff,
                            roughness: 0.7,
                            metalness: 0.1
                        });
                    }
                    
                    const clonedMesh = new THREE.Mesh(clonedGeometry, clonedMaterial);
                    
                    // Always reset transforms to avoid any inherited scaling issues
                    clonedMesh.position.set(0, 0, 0);
                    clonedMesh.rotation.set(0, 0, 0);
                    clonedMesh.scale.set(1, 1, 1);
                    
                    clonedMesh.castShadow = true;
                    clonedMesh.receiveShadow = true;
                    showcaseObject.add(clonedMesh);
                }
            });
            
            // Reset position and rotation of the group
            showcaseObject.position.set(0, 0, 0);
            showcaseObject.rotation.set(0, 0, 0);
            showcaseObject.scale.set(1, 1, 1);
            
            // Calculate bounding box FIRST
            const bbox = new THREE.Box3().setFromObject(showcaseObject);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            
            console.log('Original object size:', {
                x: size.x,
                y: size.y,
                z: size.z,
                maxDim: maxDim
            });
            
            // SMART SCALING - Target a reasonable size range
            let targetSize = 2; // Target maximum dimension
            let scaleFactor = 1;
            
            if (maxDim > 10) {
                // Very large objects (like your bath with 447 units)
                scaleFactor = targetSize / maxDim;
                console.log(`Very large object detected, scaling by ${scaleFactor}`);
            } else if (maxDim > 5) {
                // Medium large objects
                scaleFactor = targetSize / maxDim;
                console.log(`Large object detected, scaling by ${scaleFactor}`);
            } else if (maxDim < 0.1) {
                // Very small objects
                scaleFactor = targetSize / maxDim;
                console.log(`Very small object detected, scaling by ${scaleFactor}`);
            }
            // Objects between 0.1 and 5 units are left as-is
            
            // Apply scaling if needed
            if (scaleFactor !== 1) {
                showcaseObject.scale.multiplyScalar(scaleFactor);
                
                // Recalculate bounding box after scaling
                const scaledBbox = new THREE.Box3().setFromObject(showcaseObject);
                scaledBbox.getSize(size);
                console.log('New scaled size:', {
                    x: size.x,
                    y: size.y,
                    z: size.z,
                    maxDim: Math.max(size.x, size.y, size.z)
                });
            }
            
            // CENTER the object AFTER scaling
            const finalBbox = new THREE.Box3().setFromObject(showcaseObject);
            const center = new THREE.Vector3();
            finalBbox.getCenter(center);
            showcaseObject.position.sub(center);
            
            // Position camera based on FINAL object size
            const finalMaxDim = Math.max(size.x, size.y, size.z);
            const distance = finalMaxDim * 3; // Good viewing distance
            
            console.log('Final showcase setup:', {
                finalMaxDim: finalMaxDim,
                cameraDistance: distance,
                center: center.toArray()
            });
            
            // Reset camera position
            showcaseCamera.position.set(distance, distance * 0.7, distance);
            showcaseCamera.lookAt(0, 0, 0);
            showcaseCamera.updateProjectionMatrix();
            
            // Add to scene FIRST
            showcaseScene.add(showcaseObject);
            
            // RECREATE CONTROLS with reasonable limits
            if (typeof THREE.OrbitControls !== 'undefined') {
                showcaseControls = new THREE.OrbitControls(showcaseCamera, showcaseRenderer.domElement);
                showcaseControls.enableDamping = true;
                showcaseControls.dampingFactor = 0.05;
                showcaseControls.enableZoom = true;
                showcaseControls.enablePan = false;
                showcaseControls.autoRotate = false;
                
                // Set zoom limits based on final object size
                showcaseControls.minDistance = finalMaxDim * 0.5;
                showcaseControls.maxDistance = finalMaxDim * 10;
                showcaseControls.target.set(0, 0, 0);
                showcaseControls.update();
                
                console.log('OrbitControls limits set:', {
                    minDistance: showcaseControls.minDistance,
                    maxDistance: showcaseControls.maxDistance,
                    currentDistance: distance
                });
            } else {
                console.error('OrbitControls not available');
            }
            
            // RESTART the render loop
            startShowcaseRenderLoop();
            
            console.log('Object loaded into showcase successfully');
            
            // Hide loading indicator
            showShowcaseLoading(false);
            
        } catch (error) {
            console.error('Error loading object into showcase:', error);
            showShowcaseLoading(false);
            createShowcasePlaceholder();
            startShowcaseRenderLoop();
        }
    }, 150);
}





function createShowcasePlaceholder() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x888888,
        roughness: 0.5,
        metalness: 0.1
    });
    
    showcaseObject = new THREE.Mesh(geometry, material);
    showcaseObject.castShadow = true;
    showcaseObject.receiveShadow = true;
    
    showcaseScene.add(showcaseObject);
    
    // Position camera
    showcaseCamera.position.set(3, 3, 3);
    showcaseCamera.lookAt(0, 0, 0);
    
    if (showcaseControls) {
        showcaseControls.target.set(0, 0, 0);
        showcaseControls.update();
    }
}

function showShowcaseLoading(show) {
    const loading = document.querySelector('.showcase-loading');
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    }
}

function closeShowcase() {
    const modal = document.getElementById('showcase-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    // Stop render loop to save resources
    stopShowcaseRenderLoop();
    
    // PROPER CLEANUP - Dispose of resources
    if (showcaseObject) {
        showcaseObject.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        
        showcaseScene.remove(showcaseObject);
        showcaseObject = null;
    }
    
    // Dispose controls properly
    if (showcaseControls) {
        showcaseControls.dispose();
        showcaseControls = null;
    }
    
    // Clear the scene
    while(showcaseScene.children.length > 0) {
        const child = showcaseScene.children[0];
        if (child.dispose) child.dispose();
        showcaseScene.remove(child);
    }
    
    // Re-add lighting after clearing
    setupShowcaseLighting();
    
    // Remove event listener
    window.removeEventListener('resize', onShowcaseResize);
    
    console.log('Showcase closed and cleaned up');
}


// Showcase control functions
function resetShowcaseView() {
    if (!showcaseObject || !showcaseCamera || !showcaseControls) return;
    
    // Calculate optimal camera position
    const bbox = new THREE.Box3().setFromObject(showcaseObject);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2.5;
    
    // Animate camera to new position
    animateShowcaseCamera(
        showcaseCamera.position,
        new THREE.Vector3(distance, distance * 0.7, distance),
        1000
    );
    
    showcaseControls.target.set(0, 0, 0);
    showcaseControls.update();
}

function toggleShowcaseWireframe() {
    if (!showcaseObject) return;
    
    showcaseWireframe = !showcaseWireframe;
    
    showcaseObject.traverse(child => {
        if (child.isMesh && child.material) {
            child.material.wireframe = showcaseWireframe;
        }
    });
    
    console.log('Wireframe mode:', showcaseWireframe ? 'ON' : 'OFF');
}

function animateShowcaseCamera(startPos, endPos, duration) {
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing function
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        showcaseCamera.position.lerpVectors(startPos, endPos, easeProgress);
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Integration with main 3D visualizer
function showShowcaseButton() {
    const button = document.getElementById('showcase-button');
    if (button) {
        button.style.display = 'block';
    }
}

function hideShowcaseButton() {
    const button = document.getElementById('showcase-button');
    if (button) {
        button.style.display = 'none';
    }
}

// Auto-show/hide showcase button based on selection
document.addEventListener('DOMContentLoaded', function() {
    // Override the original selectFixture function to show/hide showcase button
    if (typeof window.originalSelectFixture === 'undefined' && typeof selectFixture === 'function') {
        window.originalSelectFixture = selectFixture;
        
        window.selectFixture = function(fixture) {
            // Call original function
            window.originalSelectFixture(fixture);
            
            // Show showcase button
            showShowcaseButton();
        };
    }
    
    // Also handle surface selection clearing
    if (typeof window.originalClearAllSurfaces === 'undefined' && typeof clearAllSurfaces === 'function') {
        window.originalClearAllSurfaces = clearAllSurfaces;
        
        window.clearAllSurfaces = function() {
            // Call original function
            window.originalClearAllSurfaces();
            
            // Hide showcase button if no fixture is selected
            if (!selectedFixture) {
                hideShowcaseButton();
            }
        };
    }
});

// Keyboard shortcuts for showcase
document.addEventListener('keydown', function(event) {
    // Only handle shortcuts when showcase is open
    const modal = document.getElementById('showcase-modal');
    if (!modal || modal.style.display === 'none') return;
    
    switch(event.key) {
        case 'Escape':
            closeShowcase();
            break;
        case 'r':
        case 'R':
            resetShowcaseView();
            break;
        case 'w':
        case 'W':
            toggleShowcaseWireframe();
            break;
    }
});

// Export functions for global access
window.openShowcase = openShowcase;
window.openShowcase = openShowcase;
window.closeShowcase = closeShowcase;
window.resetShowcaseView = resetShowcaseView;
window.toggleShowcaseWireframe = toggleShowcaseWireframe;
window.showShowcaseButton = showShowcaseButton;
window.hideShowcaseButton = hideShowcaseButton;

console.log('3D Showcase module loaded successfully');
