// 3D Visualizer using Three.js
console.log("3D visualizer script loaded");

// Global variables for the 3D visualizer
let scene, camera, renderer, controls;
let room;
let selectedSurfaces = [];
let raycaster, mouse;
let textureCache = {};
let isVisualizerInitialized = false;
let modelLoadingIndicator = null;
let selectedFixture = null;
let fixtureCategories = {
    'bathtub': 'bathtubs',
    'bath': 'bathtubs',
    'sink': 'sinks',
    'basin': 'sinks',
    'toilet': 'toilets',
    'wc': 'toilets',
    'shower': 'shower-systems',
    'shower-boxes': 'shower-boxes',
    'shower-system': 'shower-systems',
    'shower-systems': 'shower-systems',
    'cabinet': 'cabinets',
    'vanity': 'cabinets',
    'mirror': 'mirrors',
    'light': 'lighting',
    'lamp': 'lighting'
};
let currentLoadingMessage = null;

// Add this at the very beginning of 3d-visualizer.js
function isEnterpriseMode() {
    // Check if we're on an enterprise subdomain
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // Check body data attributes as well
    const userEnterprise = document.body.getAttribute('data-user-enterprise');
    
    return (parts.length >= 2 && parts[0] !== 'www' && parts[0] !== 'localhost' && hostname !== 'localhost') ||
           (userEnterprise && userEnterprise.trim());
}

// Add this function to check if enterprise rooms are loaded
function areEnterpriseRoomsLoaded() {
    return window.enterprise3DRooms && window.enterprise3DRooms.availableRooms && 
           window.enterprise3DRooms.availableRooms.length > 0;
}


function showModelLoading(modelName) {
    currentLoadingMessage = showMessage(`Loading ${modelName}... 0%`, 'info', false);
}

function updateModelLoadingProgress(percentage, status = '') {
    if (currentLoadingMessage) {
        const modelName = currentLoadingMessage.textContent.split('Loading ')[1].split('...')[0];
        const progressText = status || `${Math.round(percentage)}%`;
        currentLoadingMessage.innerHTML = `
            Loading ${modelName}... ${progressText}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
    }
}

function hideModelLoading() {
    if (currentLoadingMessage && currentLoadingMessage.parentNode) {
        currentLoadingMessage.classList.remove('show');
        setTimeout(() => {
            if (currentLoadingMessage.parentNode) {
                currentLoadingMessage.parentNode.removeChild(currentLoadingMessage);
            }
            currentLoadingMessage = null;
        }, 150);
    }
}

// Create a function to show/hide the loading indicator
function showModelLoadingIndicator(show, message = 'Loading room...') {
    if (!modelLoadingIndicator) {
        // Create the loading indicator if it doesn't exist
        modelLoadingIndicator = document.createElement('div');
        modelLoadingIndicator.className = 'model-loading-indicator';
        modelLoadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        `;
        document.body.appendChild(modelLoadingIndicator);
        
        // Add CSS for the loading indicator
        const style = document.createElement('style');
        style.textContent = `
            .model-loading-indicator {
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
            .loading-spinner {
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
            .loading-message {
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Update the message
    const messageElement = modelLoadingIndicator.querySelector('.loading-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
    
    // Show or hide the indicator
    modelLoadingIndicator.style.display = show ? 'flex' : 'none';

    // Hide the current message
    const messageElement2 = document.querySelector('.alert'); // or whatever class your messages use
    if (messageElement2) {
        messageElement2.remove();
    }
}

function checkObjectCollision(object1, object2, margin = 0.05) {
    const bbox1 = new THREE.Box3().setFromObject(object1);
    const bbox2 = new THREE.Box3().setFromObject(object2);
    
    // Expand bounding boxes by margin
    bbox1.expandByScalar(margin);
    bbox2.expandByScalar(margin);
    
    return bbox1.intersectsBox(bbox2);
}


let initialCameraSettings = {
    bathroom: {
        position: new THREE.Vector3(0, 1.5, 2.5),
        target: new THREE.Vector3(0, 1, 0)
    },
    kitchen: {
        position: new THREE.Vector3(0, 1.7, 3),
        target: new THREE.Vector3(0, 1.3, 0)
    },
    bedroom: {
        position: new THREE.Vector3(0, 1.6, 3),
        target: new THREE.Vector3(0, 1.0, -1.0)
    },
    living: {
        position: new THREE.Vector3(0, 1.4, 4),
        target: new THREE.Vector3(0, 0.8, 0)
    },
    hotel: {
        position: new THREE.Vector3(0, 1.6, 3.5),
        target: new THREE.Vector3(0, 1.2, 0)
    },
    // Default settings if room type is unknown
    default: {
        position: new THREE.Vector3(0, 1.6, 4),
        target: new THREE.Vector3(0, 1, 0)
    }
};
let currentRoomType = 'default';
let modelCache = {};
let preloadingComplete = false;
let preloadingProgress = 0;
let totalModelsToPreload = 5; // bathroom, kitchen, living, bedroom, hotel

// Preload all models when the page loads
function preloadModels() {
    console.log('Starting to preload 3D models...');
    
    // Create a loading indicator if it doesn't exist
    // let loadingIndicator = document.getElementById('model-preload-indicator');
    // if (!loadingIndicator) {
    //     loadingIndicator = document.createElement('div');
    //     loadingIndicator.id = 'model-preload-indicator';
    //     loadingIndicator.className = 'preload-indicator';
    //     loadingIndicator.innerHTML = `
    //         <div class="preload-spinner"></div>
    //         <div class="preload-text">Loading 3D models: <span id="preload-progress">0%</span></div>
    //     `;
    //     document.body.appendChild(loadingIndicator);
    // }
    
    // Add CSS for the loading indicator
    const style = document.createElement('style');
    style.textContent = `
        .preload-indicator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 9999;
            display: flex;
            align-items: center;
            font-size: 14px;
        }
        .preload-spinner {
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
            margin-right: 10px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // Create a loader specifically for preloading
    const loader = new THREE.GLTFLoader();
    
    // Function to update progress
    function updateProgress() {
        preloadingProgress++;
        const percent = Math.round((preloadingProgress / totalModelsToPreload) * 100);
        const progressElement = document.getElementById('preload-progress');
        if (progressElement) {
            progressElement.textContent = `${percent}%`;
        }
        
        if (preloadingProgress >= totalModelsToPreload) {
            preloadingComplete = true;
            // Hide the indicator after a delay
            setTimeout(() => {
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
            }, 1000);
            console.log('All 3D models preloaded successfully!');
        }
    }
    
    // Preload apartment model
    // loader.load(
    //     '/static/3drooms/Appartments/Handmade/E-unit/3-Bedroom-Apartment.glb',
    //     function(gltf) {
    //         modelCache['apartment'] = {
    //             url: '/static/3drooms/Appartments/Handmade/E-unit/3-Bedroom-Apartment.glb',
    //             loaded: true
    //         };
    //         console.log('Apartment model preloaded');
    //         updateProgress();
    //     },
    //     function(xhr) {
    //         // Progress callback
    //         console.log('Apartment: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    //     },
    //     function(error) {
    //         console.error('Error preloading bathroom model:', error);
    //         updateProgress(); // Still update progress even on error
    //     }
    // );
    
    // Preload bathroom model
    loader.load(
        '/static/3drooms/Bathroom/brown-bathroom.glb',
        function(gltf) {
            modelCache['bathroom'] = {
                url: '/static/3drooms/Bathroom/brown-bathroom.glb',
                loaded: true
            };
            console.log('Bathroom model preloaded');
            updateProgress();
        },
        function(xhr) {
            // Progress callback
            console.log('Bathroom: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function(error) {
            console.error('Error preloading bathroom model:', error);
            updateProgress(); // Still update progress even on error
        }
    );
    
    // Preload kitchen model
    loader.load(
        '/static/3drooms/Kitchen/kitchenx.glb',
        function(gltf) {
            modelCache['kitchen'] = {
                url: '/static/3drooms/Kitchen/kitchenx.glb',
                loaded: true
            };
            console.log('Kitchen model preloaded');
            updateProgress();
        },
        function(xhr) {
            console.log('Kitchen: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function(error) {
            console.error('Error preloading kitchen model:', error);
            updateProgress();
        }
    );
    
    // Preload living room model
    loader.load(
        '/static/3drooms/Living Room/livingz.glb',
        function(gltf) {
            modelCache['living'] = {
                url: '/static/3drooms/Living Room/livingz.glb',
                loaded: true
            };
            console.log('Living room model preloaded');
            updateProgress();
        },
        function(xhr) {
            console.log('Living room: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function(error) {
            console.error('Error preloading living room model:', error);
            updateProgress();
        }
    );
    
    // Preload bedroom model
    loader.load(
        '/static/3drooms/Bedroom/bedroomy.glb',
        function(gltf) {
            modelCache['bedroom'] = {
                url: '/static/3drooms/Bedroom/bedroomy.glb',
                loaded: true
            };
            console.log('Bedroom model preloaded');
            updateProgress();
        },
        function(xhr) {
            console.log('Bedroom: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function(error) {
            console.error('Error preloading bedroom model:', error);
            updateProgress();
        }
    );
    
    // Preload hotel model
    // loader.load(
    //     '/static/3drooms/Hotel/hotel.gltf',
    //     function(gltf) {
    //         modelCache['hotel'] = {
    //             url: '/static/3drooms/Hotel/hotel.gltf',
    //             loaded: true
    //         };
    //         console.log('Hotel model preloaded');
    //         updateProgress();
    //     },
    //     function(xhr) {
    //         console.log('Hotel: ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    //     },
    //     function(error) {
    //         console.error('Error preloading hotel model:', error);
    //         updateProgress();
    //     }
    // );
}

// Call preloadModels when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Start preloading after a short delay to allow the page to render first
    setTimeout(preloadModels, 1000);
});

// First, add a variable to track clicks
let lastClickTime = 0;
const doubleClickDelay = 300; // milliseconds

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM loaded in 3D visualizer");

    // Check if Three.js is already loaded
    if (typeof THREE === 'undefined') {
        console.log("THREE is not defined, loading Three.js");
        loadScript('https://unpkg.com/three@0.137.0/build/three.min.js', function () {
            console.log("Three.js loaded");
            loadScript('https://unpkg.com/three@0.137.0/examples/js/controls/OrbitControls.js', function () {
                console.log("OrbitControls loaded");
                initVisualizer();
            });
        });
    } else {
        console.log("THREE is already defined");
        initVisualizer();
    }

    // Add tab change event listeners
    const aiTab = document.getElementById('ai-visualizer-tab');
    const threeDTab = document.getElementById('threed-visualizer-tab');

    if (aiTab && threeDTab) {
        aiTab.addEventListener('click', function () {
            console.log("AI visualizer tab clicked");
            // Update navigation active state
            document.getElementById('ai-visualizer-nav-link').classList.add('active');
            document.getElementById('3d-visualizer-nav-link').classList.remove('active');
        });

        threeDTab.addEventListener('click', function () {
            console.log("3D visualizer tab clicked");
            // Update navigation active state
            document.getElementById('ai-visualizer-nav-link').classList.remove('active');
            document.getElementById('3d-visualizer-nav-link').classList.add('active');

            // This will trigger a resize event which helps the 3D renderer adjust
            window.dispatchEvent(new Event('resize'));
        });

        // Check if we're on the 3D tab by default (URL has #3d-visualizer)
        if (window.location.hash === '#3d-visualizer') {
            document.getElementById('ai-visualizer-nav-link').classList.remove('active');
            document.getElementById('3d-visualizer-nav-link').classList.add('active');
        } else {
            document.getElementById('ai-visualizer-nav-link').classList.add('active');
            document.getElementById('3d-visualizer-nav-link').classList.remove('active');
        }
    }



});

function loadScript(url, callback) {
    console.log("Loading script:", url);
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
}

// Use initVisualizer function to properly initialize OrbitControls
function initVisualizer() {
    console.log("Initializing visualizer");

    // Create container if it doesn't exist
    let container = document.getElementById('threed-visualizer-container');
    if (!container) {
        console.log("Creating container");
        container = document.createElement('div');
        container.id = 'threed-visualizer-container';
        container.style.width = '100%';
        container.style.height = '500px';
        container.style.backgroundColor = '#f0f0f0';

        // Find the tab content and append the container
        const tabContent = document.getElementById('threed-visualizer');
        if (tabContent) {
            tabContent.appendChild(container);
        } else {
            console.error("Could not find tab content");
            return;
        }
    }

    // Create a simple 3D scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    // camera.position.set(0, 1.5, 3);

    // Create renderer with improved settings for PBR materials
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    // renderer.outputEncoding = THREE.sRGBEncoding; // Important for correct color display
    // renderer.gammaFactor = 2.2; // Standard gamma correction
    // renderer.physicallyCorrectLights = true; // For PBR materials
    // Check if these properties exist before setting them

    if (THREE.sRGBEncoding !== undefined) {
        renderer.outputEncoding = THREE.sRGBEncoding;
    }

    // if (renderer.physicallyCorrectLights !== undefined) {
    //     renderer.physicallyCorrectLights = true;
    // }

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Initialize OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Add smooth damping
    controls.dampingFactor = 0.05;
    // controls.minDistance = 1;
    // controls.maxDistance = 1.8;
    // controls.maxPolarAngle = Math.PI / 1.5; // Limit vertical rotation
    // controls.minAzimuthAngle = -Math.PI / 5; // Limit left rotation to 45 degrees
    // controls.maxAzimuthAngle = Math.PI / 5;  // Limit right rotation to 45 degrees

    // Initialize raycaster and mouse for interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create a bathroom room
    // createBathroom();

    // Add debug controls after creating the bathroom
    // initDebugControls();

    // Add click event listener for surface selection
    renderer.domElement.addEventListener('click', onMouseClick);

    // Handle window resize
    window.addEventListener('resize', function () {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Update controls
        if (controls) {
            controls.update();
        }

        // Make indicators face the camera
        updateIndicatorsToFaceCamera();

        // Render the scene
        renderer.render(scene, camera);
    }

    // Start animation
    animate();

    // Remove loading message
    const loadingMessage = document.querySelector('.loading-indicator');
    if (loadingMessage) {
        loadingMessage.remove();
    }

    // Make the selected surfaces list available globally
    window.selectedSurfaces = selectedSurfaces;

    // Update the selected surfaces UI
    updateSelectedSurfacesUI();

    // Add control buttons
    addControlButtons();
    
    // Call the notification function at the end
    notifyVisualizerInitialized();

    // Add this to the initVisualizer function
    // Set up button event listeners
    const selectAllBtn = document.getElementById('selectAllSurfacesBtn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllSurfaces);
    }

    const clearAllBtn = document.getElementById('clearAllSurfacesBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllSurfaces);
    }

    // Check if OBJLoader is loaded, if not load it
    if (typeof THREE.OBJLoader === 'undefined') {
        loadScript('https://unpkg.com/three@0.137.0/examples/js/loaders/OBJLoader.js', function () {
            console.log("OBJLoader loaded");
        });
    }
    // Load MTLLoader
    if (typeof THREE.MTLLoader === 'undefined') {
        loadScript('https://unpkg.com/three@0.137.0/examples/js/loaders/MTLLoader.js', function () {
            console.log("MTLLoader loaded");
        });
    }


    // Set the initialization flag
    isVisualizerInitialized = true;

    console.log("Visualizer initialized successfully");
}

// Function to clear all selected surfaces
window.clearAllSurfaces = function () {
    // Hide all checkmarks and highlights
    selectedSurfaces.forEach(surface => {
        if (surface.object) {
            // Hide checkmark
            if (surface.object.userData.selectionCheckmark) {
                surface.object.userData.selectionCheckmark.visible = false;
            }

            // Hide highlight
            if (surface.object.userData.highlight) {
                surface.object.userData.highlight.visible = false;
            }
        }
    });

    // Clear the array
    selectedSurfaces = [];

    // Update UI
    updateSelectedSurfacesUI();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('surfaceSelectionChanged', {
        detail: { selectedSurfaces: selectedSurfaces }
    }));
};

// Add this function to select all surfaces
function selectAllSurfaces() {
    // Clear current selection first
    clearAllSurfaces();

    // Find all selectable surfaces
    room.traverse(object => {
        if (object.userData && object.userData.isSelectable && !object.userData.isHighlight && !object.userData.isIndicator) {
            // Add to selected surfaces
            selectedSurfaces.push({
                id: object.userData.id,
                name: object.userData.name,
                type: object.userData.type,
                object: object
            });

            // Show the highlight
            if (object.userData.highlight) {
                object.userData.highlight.visible = true;
            }

            // Update indicator color
            if (object.userData.indicator) {
                object.userData.indicator.material.color.set(0xff0000); // Red for selected
            }
        }
    });

    // Update the UI
    updateSelectedSurfacesUI();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('surfaceSelectionChanged', {
        detail: { selectedSurfaces: selectedSurfaces }
    }));

    console.log("Selected all surfaces:", selectedSurfaces.map(s => s.name));
}

// Update the clearAllSurfaces function to sync with indicators
window.clearAllSurfaces = function () {
    // Hide all highlights and reset indicators
    selectedSurfaces.forEach(surface => {
        if (surface.object) {
            // Hide highlight
            if (surface.object.userData.highlight) {
                surface.object.userData.highlight.visible = false;
            }

            // Reset indicator color
            if (surface.object.userData.indicator) {
                surface.object.userData.indicator.material.color.set(0x00ff00); // Green for unselected
            }
        }
    });

    // Clear the array
    selectedSurfaces = [];

    // Update UI
    updateSelectedSurfacesUI();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('surfaceSelectionChanged', {
        detail: { selectedSurfaces: selectedSurfaces }
    }));
};

window.load3DTemplate = function (templateName, modelPath) {
    console.log(`Loading 3D template: ${templateName}`, modelPath ? `with custom model: ${modelPath}` : '');
    
    // Show loading indicator immediately
    showModelLoadingIndicator(true, `Loading ${templateName}...`);
    
    // Check if 3D environment is initialized
    if (!isVisualizerInitialized) {
        console.log("3D environment not initialized, initializing now");
        initVisualizer();
        // Use setTimeout to ensure initialization completes
        setTimeout(() => {
            loadTemplateAfterInit(templateName, modelPath);
        }, 500);
        return;
    }
    loadTemplateAfterInit(templateName, modelPath);
};

function loadTemplateAfterInit(templateName, modelPath) {
    // Clear current selection
    if (typeof clearAllSurfaces === 'function') {
        clearAllSurfaces();
    }
    // Remove all indicators first to avoid traversal errors
    removeAllIndicators();
    
    // Set current room type based on template name
    currentRoomType = templateName.toLowerCase();
    
    // If modelPath is provided, load custom room
    if (modelPath) {
        loadCustom3DRoom(templateName, modelPath);
        return;
    }
    
    // Route to the appropriate default room creation function
    switch (templateName.toLowerCase()) {
        case 'bathroom':
            createBathroom();
            break;
        case 'kitchen':
            createKitchen();
            break;
        case 'living-room':
            createLiving();
            break;
        case 'bedroom':
            createBedroom();
            break;
        default:
            console.log(`Unknown template: ${templateName}, creating default room`);
            currentRoomType = 'bathroom';
            createBathroom();
    }
    
    // Show success message
    showSuccessMessage(`Loaded ${templateName} template`);
}

function loadCustom3DRoom(roomName, modelPath) {
    console.log('Loading custom 3D room:', roomName, modelPath);
    
    // Set current room type
    currentRoomType = roomName;
    
    // Clear any existing room first
    clearExistingRoom();
    
    // Create a new room group
    room = new THREE.Group();
    scene.add(room);
    
    // Set up proper lighting
    setupPBRLighting();
    
    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Load the custom model
    loader.load(
        modelPath,
        function(gltf) {
            console.log('Custom room model loaded successfully');
            
            // Fix texture formats
            const fixedGltf = fixTextureFormats(gltf);
            
            // Add the model to the scene
            room.add(fixedGltf.scene);
            
            // ENHANCED: Calculate proper camera position based on room size
            setupDynamicCameraForCustomRoom(fixedGltf.scene);
            
            // ENHANCED: Identify surfaces and fixtures with proper timing
            setTimeout(() => {
                identifyFixtures();
                debugRoomObjects();
                identifySurfaces(fixedGltf.scene);
                
                // ENHANCED: Update indicators to face camera after surface identification
                setTimeout(() => {
                    updateIndicatorsToFaceCamera();
                    // Store initial camera settings for this custom room
                    storeCustomRoomCameraSettings(roomName);
                }, 200);
            }, 500);
            
            // Force a render update
            renderer.render(scene, camera);
            
            // Hide loading indicator
            setTimeout(() => {
                showModelLoadingIndicator(false);
            }, 500);
            
            // Show success message
            showSuccessMessage(`Loaded custom ${roomName} room`);
        },
        function(xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function(error) {
            console.error('Error loading custom room model:', error);
            showModelLoadingIndicator(false);
            showErrorMessage(`Failed to load ${roomName} room`);
        }
    );
}

// NEW: Dynamic camera positioning for custom rooms
function setupDynamicCameraForCustomRoom(model) {
    // Calculate bounding box of the entire model
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    // Calculate optimal camera distance based on room size
    const maxDimension = Math.max(size.x, size.y, size.z);
    const optimalDistance = maxDimension * 1.2; // Adjust multiplier as needed
    
    // Position camera at an angle that shows the room well
    const cameraHeight = center.y + size.y * 0.3; // Slightly above center
    const cameraDistance = Math.max(optimalDistance, 2); // Minimum distance of 2
    
    // Set camera position
    camera.position.set(
        center.x + cameraDistance * 0.7,
        cameraHeight,
        center.z + cameraDistance * 0.7
    );
    
    // Set controls target to room center
    controls.target.copy(center);
    
    // Set dynamic distance limits based on room size
    controls.minDistance = cameraDistance * 0.5;
    controls.maxDistance = cameraDistance * 2;
    
    // Set reasonable angle limits (less restrictive than bathroom)
    controls.minPolarAngle = Math.PI / 6;    // 30 degrees from top
    controls.maxPolarAngle = Math.PI / 1.2;  // 150 degrees (can look down more)
    controls.minAzimuthAngle = -Math.PI / 2; // 90 degrees left
    controls.maxAzimuthAngle = Math.PI / 2;  // 90 degrees right
    
    controls.update();
    
    console.log(`Dynamic camera setup for custom room:`, {
        position: camera.position,
        target: controls.target,
        roomSize: size,
        distance: cameraDistance
    });
}

// NEW: Store camera settings for custom rooms
function storeCustomRoomCameraSettings(roomName) {
    // Initialize if doesn't exist
    if (!window.initialCameraSettings) {
        window.initialCameraSettings = {};
    }
    
    // Store settings for this custom room
    window.initialCameraSettings[roomName.toLowerCase()] = {
        position: camera.position.clone(),
        target: controls.target.clone(),
        minDistance: controls.minDistance,
        maxDistance: controls.maxDistance,
        minPolarAngle: controls.minPolarAngle,
        maxPolarAngle: controls.maxPolarAngle,
        minAzimuthAngle: controls.minAzimuthAngle,
        maxAzimuthAngle: controls.maxAzimuthAngle
    };
    
    console.log(`Stored camera settings for ${roomName}`);
}


// Add this function to help debug model positioning
function addBoundingBoxHelper(object) {
    const bbox = new THREE.Box3().setFromObject(object);
    const helper = new THREE.Box3Helper(bbox, 0xff0000);
    scene.add(helper);

    // Add a sphere at the center of the bounding box
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const centerSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    centerSphere.position.copy(center);
    scene.add(centerSphere);

    console.log('Added bounding box helper at:', center.toArray());
    return { helper, centerSphere };
}

// Fixture handling
function identifyFixtures() {
    console.log('Identifying fixtures in the room...');
    
    if (!room) {
        console.log('No room loaded yet');
        return;
    }
    
    let fixtureCount = 0;
    const processedGroups = new Set(); // Track already processed groups
    
    room.traverse(object => {
        if (object.isMesh) {
            const objectName = (object.name || '').toLowerCase();
            let isFixture = false;
            let fixtureType = '';
            let category = '';
            
            // Method 1: Check by name if it exists
            if (objectName) {
                for (const [fixtureKey, cat] of Object.entries(fixtureCategories)) {
                    if (objectName.includes(fixtureKey)) {
                        isFixture = true;
                        fixtureType = fixtureKey;
                        category = cat;
                        console.log(`Found fixture by name: ${object.name} (type: ${fixtureKey}) -> category: ${category}`);
                        break;
                    }
                }
            }
            
            // Method 1.5: Check by parent group name
            if (!isFixture) {
                let currentParent = object.parent;
                while (currentParent && currentParent !== room && currentParent !== scene) {
                    const parentName = (currentParent.name || '').toLowerCase();
                    
                    // Check if parent group name indicates fixture type
                    if (parentName.includes('shower')) {
                        isFixture = true;
                        fixtureType = 'shower-system';
                        category = 'shower-systems';
                        console.log(`Found shower fixture by parent group: ${currentParent.name} -> ${object.name}`);
                        break;
                    } else if (parentName.includes('sink') || parentName.includes('basin')) {
                        isFixture = true;
                        fixtureType = 'sink';
                        category = 'sinks';
                        console.log(`Found sink fixture by parent group: ${currentParent.name} -> ${object.name}`);
                        break;
                    } else if (parentName.includes('toilet') || parentName.includes('wc')) {
                        isFixture = true;
                        fixtureType = 'toilet';
                        category = 'toilets';
                        console.log(`Found toilet fixture by parent group: ${currentParent.name} -> ${object.name}`);
                        break;
                    } else if (parentName.includes('bath')) {
                        isFixture = true;
                        fixtureType = 'bathtub';
                        category = 'bathtubs';
                        console.log(`Found bathtub fixture by parent group: ${currentParent.name} -> ${object.name}`);
                        break;
                    }
                    
                    currentParent = currentParent.parent;
                }
            }
            
            // Method 2: Check by position and size (ONLY for very obvious cases)
            if (!isFixture) {
                const bbox = new THREE.Box3().setFromObject(object);
                const size = new THREE.Vector3();
                bbox.getSize(size);
                const position = new THREE.Vector3();
                object.getWorldPosition(position);
                
                // Only detect very obvious fixtures by size/position
                // Be more conservative with these detections
                if (size.x > 1.5 && size.z > 0.8 && size.y < 1 && position.y < 0.3) {
                    // Very large, low object - likely a bathtub
                    isFixture = true;
                    fixtureType = 'bathtub';
                    category = 'bathtubs';
                    console.log(`Found bathtub by size/position (confident):`, { size: size.toArray(), position: position.toArray() });
                }
                else if (size.x < 0.6 && size.z < 0.6 && position.y < 0.5 && size.y > 0.6 && size.y < 1.2) {
                    // Small, tall object on floor - likely a toilet
                    isFixture = true;
                    fixtureType = 'toilet';
                    category = 'toilets';
                    console.log(`Found toilet by size/position (confident):`, { size: size.toArray(), position: position.toArray() });
                }
                // Remove the sink detection by size - too unreliable
                // else if (size.x < 1 && size.z < 1 && position.y > 0.5 && position.y < 1.5) {
                //     // This was causing the shower system to be detected as a sink
                // }
            }
            
            // Method 3: Detect generic fixtures (objects that look like fixtures but we can't categorize)
            if (!isFixture) {
                const bbox = new THREE.Box3().setFromObject(object);
                const size = new THREE.Vector3();
                bbox.getSize(size);
                const position = new THREE.Vector3();
                object.getWorldPosition(position);
                
                // Check if this looks like a fixture but we can't identify what type
                const isReasonableSize = size.x > 0.2 && size.y > 0.2 && size.z > 0.2 && 
                                       size.x < 3 && size.y < 3 && size.z < 3;
                const isInReasonablePosition = position.y >= 0 && position.y < 2;
                const hasReasonableName = objectName && objectName !== 'no_name' && 
                                        !objectName.includes('wall') && !objectName.includes('floor') && 
                                        !objectName.includes('ceiling');
                
                if (isReasonableSize && isInReasonablePosition && (hasReasonableName || size.volume() > 0.1)) {
                    isFixture = true;
                    fixtureType = 'unknown';
                    category = 'all'; // ← Default to 'all' instead of guessing wrong
                    console.log(`Found unidentified fixture: ${object.name} - will show all categories`);
                }
            }
            
            // Mark as fixture if identified
            if (isFixture) {
                fixtureCount++;
                
                // Find the Blender group this object belongs to
                let groupId = null;
                let groupRoot = null;
                let currentParent = object.parent;
                while (currentParent && currentParent !== room && currentParent !== scene) {
                    const parentName = (currentParent.name || '').toLowerCase();
                    
                    const isFixtureGroup = parentName.includes('group') ||
                                        parentName.includes('toilet') ||
                                        parentName.includes('sink') ||
                                        parentName.includes('bath') ||
                                        parentName.includes('shower') ||
                                        parentName.includes('wc');
                    
                    const hasReasonableChildCount = currentParent.children.length > 1 && currentParent.children.length < 20;
                    
                    if (isFixtureGroup && hasReasonableChildCount) {
                        groupRoot = currentParent;
                        groupId = currentParent.name || currentParent.uuid;
                        console.log(`Found specific fixture group: ${groupId} for object: ${objectName} (${currentParent.children.length} children)`);
                        break;
                    }
                    
                    if (currentParent.children.length > 20) {
                        console.log(`Stopping at parent with too many children (${currentParent.children.length}): ${currentParent.name || 'unnamed'}`);
                        break;
                    }
                    
                    currentParent = currentParent.parent;
                }
                
                if (!groupId) {
                    groupId = `individual_${fixtureCount}`;
                    console.log(`No group found for ${objectName}, using individual ID: ${groupId}`);
                }
                
                object.userData = {
                    ...object.userData,
                    isFixture: true,
                    fixtureType: fixtureType,
                    fixtureCategory: category,
                    originalName: object.name || `${fixtureType}_${fixtureCount}`,
                    fixtureId: `fixture_${fixtureCount}`,
                    fixtureGroupId: groupId,
                    groupRoot: groupRoot,
                    isFixtureComponent: true
                };
                
                object.userData.isSelectable = true;
                
                console.log(`Marked as fixture: ${object.userData.originalName} (${fixtureType}) - Group: ${groupId} - Category: ${category}`);
            }
        }
    });
    
    console.log(`Total fixtures identified: ${fixtureCount}`);
}

// Function to show color options for a selected fixture
async function showColorOptionsForFixture(fixture) {
    const colorOptionsContainer = document.getElementById('fixture-color-options');
    const colorSwatchesContainer = document.getElementById('fixture-color-swatches');
    
    if (!colorOptionsContainer || !colorSwatchesContainer) {
        console.log('Color options containers not found');
        return;
    }
    
    // Check if fixture has replacement with accessory data
    let accessoryData = null;
    
    if (fixture.userData.replacement && fixture.userData.replacement.userData.accessoryData) {
        accessoryData = fixture.userData.replacement.userData.accessoryData;
    } else if (fixture.userData.accessoryData) {
        accessoryData = fixture.userData.accessoryData;
    }
    
    // If no accessory data, try to fetch it based on the replacement model
    if (!accessoryData && fixture.userData.replacement) {
        try {
            const modelPath = fixture.userData.replacement.userData.modelPath;
            if (modelPath) {
                accessoryData = await fetchAccessoryData(modelPath);
            }
        } catch (error) {
            console.error('Error fetching accessory data for color options:', error);
        }
    }
    
    // Show color options if available
    if (accessoryData && accessoryData.available_colors && accessoryData.available_colors.length > 1) {
        displayColorOptions(accessoryData.available_colors, fixture);
        colorOptionsContainer.style.display = 'block';
    } else {
        colorOptionsContainer.style.display = 'none';
    }
}

// Function to display color options
function displayColorOptions(colors, fixture) {
    const colorSwatchesContainer = document.getElementById('fixture-color-swatches');
    colorSwatchesContainer.innerHTML = '';
    
    colors.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.title = `Color option ${index + 1}`;
        swatch.onclick = () => selectFixtureColor(color, fixture, swatch);
        
        // Mark first color as selected by default
        if (index === 0) {
            swatch.classList.add('selected');
        }
        
        colorSwatchesContainer.appendChild(swatch);
    });
}

// Function to apply color to fixture
function applyColorToFixture(replacementObject, color) {
    replacementObject.traverse(child => {
        if (child.isMesh && child.material) {
            // Create a new material with the selected color
            const newMaterial = child.material.clone();
            newMaterial.color.setStyle(color);
            child.material = newMaterial;
        }
    });
    
    // Force render update
    if (typeof renderer !== 'undefined') {
        renderer.render(scene, camera);
    }
}


// Function to select a fixture
async function selectFixture(fixture) {
    console.log('Selecting fixture:', fixture.userData.originalName);
    
    // Clear previous fixture selection
    clearFixtureSelection();
    
    // Clear any surface selections
    if (typeof clearAllSurfaces === 'function') {
        clearAllSurfaces();
    }
    
    await showColorOptionsForFixture(fixture);

    // Set as selected fixture
    selectedFixture = fixture;
    const groupId = fixture.userData.fixtureGroupId;
    if (groupId) {
        console.log(`Highlighting fixture group: ${groupId}`);
        highlightFixtureGroup(groupId);
    } else {
        highlightFixture(fixture);
    }
    
    // Get the fixture category and map it to database category
    let rawCategory = fixture.userData.fixtureCategory || 'all';
    let mappedCategory = fixtureCategories[rawCategory] || rawCategory;
    
    // If we couldn't identify the fixture type, show all categories
    if (rawCategory === 'all' || mappedCategory === 'all') {
        mappedCategory = 'all';
        console.log(`Unknown fixture type - showing all categories`);
    }
    
    console.log(`Raw category: ${rawCategory} -> Mapped category: ${mappedCategory}`);
    
    // Show success message
    const fixtureTypeName = fixture.userData.fixtureType === 'unknown' ? 'fixture' : fixture.userData.fixtureType;
    console.log(`Selected ${fixtureTypeName}. Switching to accessories tab...`);
    
    // Switch to accessories tab and filter by mapped category
    switchToAccessoriesTab(mappedCategory);
}


function highlightFixtureGroup(groupId) {
    // Collect all objects in the group
    const groupObjects = [];
    room.traverse(groupObject => {
        if (groupObject.userData &&
            groupObject.userData.fixtureGroupId === groupId) {
            groupObjects.push(groupObject);
        }
    });
    
    if (groupObjects.length === 0) {
        console.log('No objects found in group:', groupId);
        return;
    }
    
    // Calculate bounding box that encompasses all group objects
    const groupBbox = new THREE.Box3();
    groupObjects.forEach(obj => {
        const objBbox = new THREE.Box3().setFromObject(obj);
        groupBbox.union(objBbox);
    });
    
    const size = new THREE.Vector3();
    groupBbox.getSize(size);
    
    // Create a wireframe box slightly larger than the entire group
    const geometry = new THREE.BoxGeometry(size.x * 1.1, size.y * 1.1, size.z * 1.1);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.7
    });
    
    const highlight = new THREE.Mesh(geometry, material);
    highlight.userData = { isHighlight: true, groupId: groupId };
    
    // Position the highlight at the center of the group
    const center = new THREE.Vector3();
    groupBbox.getCenter(center);
    highlight.position.copy(center);
    
    // Add to scene
    scene.add(highlight);
    
    // Store reference to highlight in the selected fixture (main fixture in group)
    selectedFixture.userData.highlight = highlight;
    
    console.log(`Created group highlight for ${groupObjects.length} objects in group ${groupId}`);
}


// Function to highlight a fixture
function highlightFixture(fixture) {
    // Create a bounding box for the fixture
    const bbox = new THREE.Box3().setFromObject(fixture);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    // Create a wireframe box slightly larger than the fixture
    const geometry = new THREE.BoxGeometry(size.x * 1.1, size.y * 1.1, size.z * 1.1);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.7
    });
    
    const highlight = new THREE.Mesh(geometry, material);
    highlight.userData = { isHighlight: true };
    
    // Position the highlight at the center of the fixture
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    highlight.position.copy(center);
    
    // Add to scene
    scene.add(highlight);
    
    // Store reference to highlight
    fixture.userData.highlight = highlight;
}

// Function to clear fixture selection
function clearFixtureSelection() {
    if (selectedFixture) {
        // Remove highlights from all components in the group
        const groupId = selectedFixture.userData.fixtureGroupId;
        if (groupId) {
            console.log(`Clearing highlights for group: ${groupId}`);
            // For groups, the highlight is stored on the selectedFixture
            if (selectedFixture.userData.highlight) {
                scene.remove(selectedFixture.userData.highlight);
                selectedFixture.userData.highlight = null;
                console.log(`Removed group highlight for: ${groupId}`);
            }
        } else {
            // Remove highlight from single fixture
            if (selectedFixture.userData.highlight) {
                scene.remove(selectedFixture.userData.highlight);
                selectedFixture.userData.highlight = null;
            }
            // Also check replacement
            if (selectedFixture.userData.replacement && selectedFixture.userData.replacement.userData.highlight) {
                scene.remove(selectedFixture.userData.replacement.userData.highlight);
                selectedFixture.userData.replacement.userData.highlight = null;
            }
        }
        
        console.log('Cleared fixture selection');
        selectedFixture = null;
    }
    
    
    // Hide color options
    const colorOptionsContainer = document.getElementById('fixture-color-options');
    if (colorOptionsContainer) {
        colorOptionsContainer.style.display = 'none';
    }
    
}

// Function to switch to accessories tab
function switchToAccessoriesTab(category) {
    console.log('Switching to accessories tab, category:', category);
    
    // Find the accessories tab button and click it
    const accessoriesTab = document.querySelector('.material-type-btn[data-category="3d-accessories"]');
    if (accessoriesTab) {
        accessoriesTab.click();
        
        // Set the category filter after a short delay
        setTimeout(() => {
            const categoryFilter = document.getElementById('accessory-category-filter');
            if (categoryFilter) {
                categoryFilter.value = category;
                
                // Trigger change event to update the display
                const event = new Event('change');
                categoryFilter.dispatchEvent(event);
                
                console.log(`Filtered accessories to category: ${category}`);
            }
        }, 200);
    }
}

// Add this function to create a highlight for fixtures
function addFixtureHighlight(fixture) {
    // Create a bounding box for the fixture
    const bbox = new THREE.Box3().setFromObject(fixture);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    // Create a wireframe box slightly larger than the fixture
    const geometry = new THREE.BoxGeometry(size.x * 1.05, size.y * 1.05, size.z * 1.05);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        transparent: true,
        opacity: 0.5
    });
    
    const highlight = new THREE.Mesh(geometry, material);
    
    // Position the highlight at the center of the fixture
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    highlight.position.copy(center);
    
    // Make it invisible by default
    highlight.visible = false;
    highlight.userData = { isHighlight: true, targetFixture: fixture };
    
    // Add to room
    room.add(highlight);
    
    // Store reference to highlight in the fixture
    fixture.userData.highlight = highlight;
}


// Add this function to handle showing color options
function showFixtureColorOptions(fixture) {
    const colorOptionsPanel = document.getElementById('fixture-color-options');
    const colorSwatchesContainer = document.getElementById('fixture-color-swatches');
    
    // Hide by default
    colorOptionsPanel.style.display = 'none';
    colorSwatchesContainer.innerHTML = '';
    
    // Check if fixture has replacement with accessory data
    let accessoryData = null;
    if (fixture.userData.replacement && fixture.userData.replacement.userData && fixture.userData.replacement.userData.accessoryData) {
        accessoryData = fixture.userData.replacement.userData.accessoryData;
    }
    
    // If no accessory data or no colors, hide panel
    if (!accessoryData || !accessoryData.available_colors || !Array.isArray(accessoryData.available_colors)) {
        return;
    }
    
    console.log('Showing color options for:', accessoryData.name, accessoryData.available_colors);
    
    // Show the panel
    colorOptionsPanel.style.display = 'block';
    
    // Create color swatches
    accessoryData.available_colors.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.title = `Color option ${index + 1}`;
        swatch.dataset.color = color;
        
        // Set default color as active
        if (color === accessoryData.default_color) {
            swatch.classList.add('active');
        }
        
        // Add click handler
        swatch.addEventListener('click', () => {
            selectFixtureColor(color, swatch, fixture);
        });
        
        colorSwatchesContainer.appendChild(swatch);
    });
}

// Add this function to handle color selection
function selectFixtureColor(color, swatchElement, fixture) {
    console.log('Selecting color for fixture:', color);
    
    // Update active state
    document.querySelectorAll('#fixture-color-swatches .color-swatch').forEach(swatch => {
        swatch.classList.remove('active');
    });
    swatchElement.classList.add('active');
    
    // Apply color to the fixture's replacement object
    if (fixture.userData.replacement) {
        applyColorToObject(fixture.userData.replacement, color);
    }
}

// Add this function to apply color to 3D object
function applyColorToObject(object, color) {
    console.log('Applying color to object:', color);
    
    // Convert hex color to Three.js Color
    const threeColor = new THREE.Color(color);
    
    // Apply color to all meshes in the object
    object.traverse(child => {
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
    
    // Force render update
    if (typeof renderer !== 'undefined') {
        renderer.render(scene, camera);
    }
}

// Hide color options when no fixture is selected
function hideFixtureColorOptions() {
    const colorOptionsPanel = document.getElementById('fixture-color-options');
    if (colorOptionsPanel) {
        colorOptionsPanel.style.display = 'none';
    }
}


// Helper function to handle surface selection
function handleSurfaceSelection(surfaceName) {
    // Find the surface object by name
    let surfaceObject = null;
    room.traverse(object => {
        if (object.userData && object.userData.name === surfaceName) {
            surfaceObject = object;
        }
    });
    
    if (surfaceObject) {
        toggleSurfaceSelection(surfaceObject);
    } else {
        console.log(`Surface not found: ${surfaceName}`);
    }
}


function findObjectByName(name) {
    let foundObject = null;
    
    scene.traverse(object => {
        if (object.name === name) {
            foundObject = object;
        }
    });
    
    return foundObject;
}

function getSurfaceNameFromObject(object) {
    // First check if the object itself has a name and userData
    if (object.userData && object.userData.name) {
        return object.userData.name;
    }
    
    // Check the object's name directly
    if (object.name) {
        return object.name;
    }
    
    // If no name found, return null
    return null;
}


function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    script.onerror = function() {
        console.error('Failed to load script:', src);
    };
    document.head.appendChild(script);
}

// function loadOBJModel(loader, modelPath, modelName, fixtureToReplace) {
//     loader.load(
//         modelPath,
//         function(object) {
//             console.log('OBJ loaded successfully:', object);
            
//             // Scale and position the object
//             const box = new THREE.Box3().setFromObject(object);
//             const size = box.getSize(new THREE.Vector3());
//             const center = box.getCenter(new THREE.Vector3());
            
//             // Scale to fit fixture
//             const maxDimension = Math.max(size.x, size.y, size.z);
//             const targetSize = 1.0; // Adjust as needed
//             const scale = targetSize / maxDimension;
//             object.scale.setScalar(scale);
            
//             // Center the object
//             object.position.copy(fixtureToReplace.position);
//             object.position.sub(center.multiplyScalar(scale));
            
//             // Copy rotation and other properties
//             object.rotation.copy(fixtureToReplace.rotation);
//             object.userData = { ...fixtureToReplace.userData, replacedWith: modelName };
            
//             // Replace in scene
//             scene.remove(fixtureToReplace);
//             scene.add(object);
            
//             // Update selection
//             selectedFixture = object;
            
//             showMessage(`${modelName} loaded successfully!`, 'success');
//         },
//         function(progress) {
//             console.log('Loading progress:', progress);
//         },
//         function(error) {
//             console.error('Error loading OBJ:', error);
//             showMessage(`Error loading ${modelName}: ${error.message}`, 'error');
//         }
//     );
// }

function loadGLTFModel(loader, modelPath, modelName, fixtureToReplace) {
    loader.load(
        modelPath,
        function(gltf) {
            console.log('GLTF loaded successfully:', gltf);
            
            const object = gltf.scene;
            
            // Scale and position the object
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            
            // Scale to fit fixture
            const maxDimension = Math.max(size.x, size.y, size.z);
            const targetSize = 1.0; // Adjust as needed
            const scale = targetSize / maxDimension;
            object.scale.setScalar(scale);
            
            // Center the object
            object.position.copy(fixtureToReplace.position);
            object.position.sub(center.multiplyScalar(scale));
            
            // Copy rotation and other properties
            object.rotation.copy(fixtureToReplace.rotation);
            object.userData = { ...fixtureToReplace.userData, replacedWith: modelName };
            
            // Replace in scene
            scene.remove(fixtureToReplace);
            scene.add(object);
            
            // Update selection
            selectedFixture = object;
            
            showMessage(`${modelName} loaded successfully!`, 'success');
        },
        function(progress) {
            console.log('Loading progress:', progress);
        },
        function(error) {
            console.error('Error loading GLTF:', error);
            showMessage(`Error loading ${modelName}: ${error.message}`, 'error');
        }
    );
}

async function fetchAccessoryData(modelPath) {
    try {
        const response = await fetch('/api/accessories/');
        if (response.ok) {
            const data = await response.json();
            const matchingAccessory = data.accessories.find(acc => 
                acc.model_path === modelPath || acc.model_path === `/${modelPath}`
            );
            
            if (matchingAccessory) {
                console.log('Found matching accessory data:', matchingAccessory);
                return matchingAccessory;
            }
        }
    } catch (error) {
        console.error('Error fetching accessory data:', error);
    }
    return null;
}


// Function to replace a fixture with a new model
async function replaceFixture(modelPath, modelName) {
    if (!selectedFixture) {
        showMessage('No fixture selected. Please select a fixture first.', 'error');
        return;
    }
    
    console.log('Replacing fixture:', selectedFixture.userData.originalName, 'with model:', modelPath);

    let accessoryData = null;
    try {
        updateModelLoadingProgress(5, 'Fetching accessory information...');
        accessoryData = await fetchAccessoryData(modelPath);
        if (accessoryData) {
            console.log('Accessory data loaded:', accessoryData);
        }
    } catch (error) {
        console.error('Error fetching accessory data:', error);
    }
    
    // Show loading animation with progress
    showModelLoading(modelName);

    const fixtureToReplace = selectedFixture;

    // Get original fixture properties and bounding box
    const originalBbox = new THREE.Box3().setFromObject(selectedFixture);
    const originalCenter = new THREE.Vector3();
    originalBbox.getCenter(originalCenter);
    const originalSize = new THREE.Vector3();
    originalBbox.getSize(originalSize);
    
    console.log('Original fixture:', {
        center: originalCenter.toArray(),
        size: originalSize.toArray(),
        position: selectedFixture.position.toArray()
    });
    
    // Determine loader based on file extension
    let loader;
    if (modelPath.toLowerCase().endsWith('.obj')) {
        loadOBJWithMTL(modelPath, modelName, originalBbox, originalCenter, originalSize, accessoryData);
        return; // Exit here since loadOBJWithMTL handles everything
    } else if (modelPath.toLowerCase().endsWith('.gltf') || modelPath.toLowerCase().endsWith('.glb')) {
        loader = new THREE.GLTFLoader();
    } else {
        hideModelLoading();
        showMessage('Unsupported model format', 'error');
        return;
    }
    
    
    // Load the model
    loader.load(
        modelPath,
        function(object) {

            // Hide loading when complete
            hideModelLoading();

            // For GLTF/GLB models, the structure is different
            if (modelPath.toLowerCase().endsWith('.gltf') || modelPath.toLowerCase().endsWith('.glb')) {
                object = object.scene;
            }
            
            // Apply materials - preserve original textures instead of making everything white
            object.traverse(child => {
                if (child.isMesh) {
                    // Only modify material properties if the child doesn't already have a good material
                    if (!child.material || child.material.type === 'MeshBasicMaterial') {
                        // If no material or basic material, create a new one
                        child.material = new THREE.MeshStandardMaterial({
                            color: 0xffffff,
                            roughness: 0.7,
                            metalness: 0.1
                        });
                    } else {
                        // Preserve existing material but ensure it's a PBR material for better lighting
                        if (child.material.type !== 'MeshStandardMaterial' && child.material.type !== 'MeshPhysicalMaterial') {
                            // Convert existing material to MeshStandardMaterial while preserving properties
                            const oldMaterial = child.material;
                            const newMaterial = new THREE.MeshStandardMaterial();
                            
                            // Preserve color
                            if (oldMaterial.color) {
                                newMaterial.color.copy(oldMaterial.color);
                            }
                            
                            // Preserve texture maps
                            if (oldMaterial.map) newMaterial.map = oldMaterial.map;
                            if (oldMaterial.normalMap) newMaterial.normalMap = oldMaterial.normalMap;
                            if (oldMaterial.roughnessMap) newMaterial.roughnessMap = oldMaterial.roughnessMap;
                            if (oldMaterial.metalnessMap) newMaterial.metalnessMap = oldMaterial.metalnessMap;
                            if (oldMaterial.aoMap) newMaterial.aoMap = oldMaterial.aoMap;
                            if (oldMaterial.emissiveMap) newMaterial.emissiveMap = oldMaterial.emissiveMap;
                            if (oldMaterial.bumpMap) newMaterial.bumpMap = oldMaterial.bumpMap;
                            if (oldMaterial.displacementMap) newMaterial.displacementMap = oldMaterial.displacementMap;
                            
                            // Set reasonable PBR values if not already set
                            newMaterial.roughness = oldMaterial.roughness !== undefined ? oldMaterial.roughness : 0.7;
                            newMaterial.metalness = oldMaterial.metalness !== undefined ? oldMaterial.metalness : 0.1;
                            
                            // Preserve transparency
                            if (oldMaterial.transparent) {
                                newMaterial.transparent = oldMaterial.transparent;
                                newMaterial.opacity = oldMaterial.opacity !== undefined ? oldMaterial.opacity : 1.0;
                            }
                            
                            child.material = newMaterial;
                        } else {
                            // Already a good PBR material, just ensure shadow properties are set
                            // Don't change the material itself
                        }
                    }
                    
                    // Always ensure shadow properties are set regardless of material changes
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });


            // Remove any existing replacement before adding new one
            if (fixtureToReplace.userData.replacement) {
                console.log('Removing existing replacement');
                room.remove(fixtureToReplace.userData.replacement);
                fixtureToReplace.userData.replacement = null;
            }
            
            // Get the bounding box of the new model
            const newBbox = new THREE.Box3().setFromObject(object);
            const newCenter = new THREE.Vector3();
            newBbox.getCenter(newCenter);
            const newSize = new THREE.Vector3();
            newBbox.getSize(newSize);
            
            console.log('New model before positioning:', {
                center: newCenter.toArray(),
                size: newSize.toArray(),
                position: object.position.toArray()
            });

            // Fix rotation first - ensure the model is upright
            object.rotation.set(0, 0, 0); // Reset rotation
            // If the model is lying flat, rotate it to be upright
            if (newSize.y < newSize.x || newSize.y < newSize.z) {
                // Model might be lying flat, try to make it upright
                if (newSize.x > newSize.y && newSize.z > newSize.y) {
                    // Rotate around X-axis to make it stand up
                    object.rotation.y = -Math.PI / 2;
                    console.log('Applied rotation to make model upright');
                }
            }

            // Recalculate bounding box after rotation
            const rotatedBbox = new THREE.Box3().setFromObject(object);
            const rotatedCenter = new THREE.Vector3();
            rotatedBbox.getCenter(rotatedCenter);
            const rotatedSize = new THREE.Vector3();
            rotatedBbox.getSize(rotatedSize);

            console.log('After rotation:', {
                center: rotatedCenter.toArray(),
                size: rotatedSize.toArray(),
                rotation: object.rotation.toArray()
            });

            // Calculate scale to match original fixture size
            const scaleX = originalSize.x / rotatedSize.x;
            const scaleY = originalSize.y / rotatedSize.y;
            const scaleZ = originalSize.z / rotatedSize.z;
            
            // Use a more aggressive scaling approach
            // Instead of using the smallest scale, use a weighted average that favors fitting the bounding box
            let uniformScale;
            
            // Method 1: Use the largest scale factor (makes it fit the largest dimension)
            // uniformScale = Math.max(scaleX, scaleY, scaleZ);
            
            // Method 2: Use average of the two largest scale factors
            // const scales = [scaleX, scaleY, scaleZ].sort((a, b) => b - a);
            // uniformScale = (scales[0] + scales[1]) / 2;
            
            // Method 3: Apply a multiplier to make it slightly larger
            uniformScale = Math.min(scaleX, scaleY, scaleZ) * 1.2; // 20% larger
            
            // Clamp the scale to reasonable bounds to avoid extremely large or small objects
            // uniformScale = Math.max(0.5, Math.min(uniformScale, 3.0));
            
            console.log('Scale factors:', { scaleX, scaleY, scaleZ });
            console.log('Selected uniform scale:', uniformScale);
            
            // Apply scale
            object.scale.set(uniformScale, uniformScale, uniformScale);
            
            // Recalculate bounding box after scaling
            const scaledBbox = new THREE.Box3().setFromObject(object);
            const scaledCenter = new THREE.Vector3();
            scaledBbox.getCenter(scaledCenter);
            
            // Position the new object so its center matches the original fixture's center
            const offset = new THREE.Vector3().subVectors(originalCenter, scaledCenter);
            object.position.add(offset);

            // Apply constraints to prevent going through walls/floor
            const finalBbox = new THREE.Box3().setFromObject(object);
            const roomBbox = new THREE.Box3().setFromObject(room);

            // Floor constraint - if object goes below floor
            if (finalBbox.min.y < roomBbox.min.y) {
                const floorCorrection = roomBbox.min.y - finalBbox.min.y + 0.02;
                object.position.y += floorCorrection;
                console.log('Applied floor constraint, moved up by:', floorCorrection);
            }

            // Wall constraints - check if object extends beyond room boundaries
            let positionChanged = false;
            const safetyMargin = 0.1;

            // X-axis constraints (left/right walls)
            if (finalBbox.min.x < roomBbox.min.x + safetyMargin) {
                const correction = (roomBbox.min.x + safetyMargin) - finalBbox.min.x;
                object.position.x += correction;
                positionChanged = true;
                console.log('Applied left wall constraint, moved right by:', correction);
            } else if (finalBbox.max.x > roomBbox.max.x - safetyMargin) {
                const correction = finalBbox.max.x - (roomBbox.max.x - safetyMargin);
                object.position.x -= correction;
                positionChanged = true;
                console.log('Applied right wall constraint, moved left by:', correction);
            }

            // Z-axis constraints (front/back walls)
            if (finalBbox.min.z < roomBbox.min.z + safetyMargin) {
                const correction = (roomBbox.min.z + safetyMargin) - finalBbox.min.z;
                object.position.z += correction;
                positionChanged = true;
                console.log('Applied back wall constraint, moved forward by:', correction);
            } else if (finalBbox.max.z > roomBbox.max.z - safetyMargin) {
                const correction = finalBbox.max.z - (roomBbox.max.z - safetyMargin);
                object.position.z -= correction;
                positionChanged = true;
                console.log('Applied front wall constraint, moved back by:', correction);
            }

            if (positionChanged) {
                console.log('Position adjusted due to wall constraints:', object.position.toArray());
            }

            console.log('Applied positioning:', {
                scale: uniformScale,
                offset: offset.toArray(),
                finalPosition: object.position.toArray()
            });

            // NEW: Check for overlaps with other objects in the room
            const objectsToCheck = [];
            room.traverse(child => {
                if (child.isMesh && 
                    child !== object && 
                    child.visible && 
                    !child.userData.isReplacement && // Don't check against other replacements
                    child.userData.fixtureType) { // Only check against fixtures
                    objectsToCheck.push(child);
                }
            });

            // Also check against replacement objects
            room.traverse(child => {
                if (child.userData && child.userData.isReplacement && child !== object) {
                    objectsToCheck.push(child);
                }
            });

            console.log(`Checking for overlaps with ${objectsToCheck.length} objects`);
            // Check for overlaps and resolve them
            for (let otherObject of objectsToCheck) {
                const otherBbox = new THREE.Box3().setFromObject(otherObject);
                let currentBbox = new THREE.Box3().setFromObject(object);
                
                // Check if bounding boxes intersect
                if (currentBbox.intersectsBox(otherBbox)) {
                    console.log('Overlap detected with:', otherObject.userData.originalName || 'unnamed object');
                    
                    // Calculate overlap distances in each direction
                    const overlapX = Math.min(currentBbox.max.x - otherBbox.min.x, otherBbox.max.x - currentBbox.min.x);
                    const overlapZ = Math.min(currentBbox.max.z - otherBbox.min.z, otherBbox.max.z - currentBbox.min.z);
                    
                    // Move in the direction with smaller overlap (easier to resolve)
                    if (overlapX < overlapZ) {
                        // Move along X-axis
                        if (object.position.x < otherObject.position.x) {
                            // Move left
                            object.position.x -= overlapX + 0.05; // 5cm extra space
                            console.log('Moved object left to avoid overlap');
                        } else {
                            // Move right
                            object.position.x += overlapX + 0.05;
                            console.log('Moved object right to avoid overlap');
                        }
                    } else {
                        // Move along Z-axis
                        if (object.position.z < otherObject.position.z) {
                            // Move back
                            object.position.z -= overlapZ + 0.05;
                            console.log('Moved object back to avoid overlap');
                        } else {
                            // Move forward
                            object.position.z += overlapZ + 0.05;
                            console.log('Moved object forward to avoid overlap');
                        }
                    }
                    
                    positionChanged = true;
                    
                    // After moving, check if we're still within room bounds
                    const adjustedBbox = new THREE.Box3().setFromObject(object);
                    
                    // Re-apply wall constraints if needed
                    if (adjustedBbox.min.x < roomBbox.min.x + safetyMargin) {
                        object.position.x = roomBbox.min.x + safetyMargin + (adjustedBbox.max.x - adjustedBbox.min.x) / 2;
                    } else if (adjustedBbox.max.x > roomBbox.max.x - safetyMargin) {
                        object.position.x = roomBbox.max.x - safetyMargin - (adjustedBbox.max.x - adjustedBbox.min.x) / 2;
                    }
                    
                    if (adjustedBbox.min.z < roomBbox.min.z + safetyMargin) {
                        object.position.z = roomBbox.min.z + safetyMargin + (adjustedBbox.max.z - adjustedBbox.min.z) / 2;
                    } else if (adjustedBbox.max.z > roomBbox.max.z - safetyMargin) {
                        object.position.z = roomBbox.max.z - safetyMargin - (adjustedBbox.max.z - adjustedBbox.min.z) / 2;
                    }
                }
            }

            if (positionChanged) {
                console.log('Final position after all constraints:', object.position.toArray());
            }

            // NEW: Validate final position is safe
            const finalValidationBbox = new THREE.Box3().setFromObject(object);
            if (!roomBbox.containsBox(finalValidationBbox)) {
                console.warn('Object extends beyond room boundaries after all adjustments');
                // If object is still outside room, scale it down
                const currentScale = object.scale.x;
                const newScale = currentScale * 0.8; // Reduce by 20%
                object.scale.set(newScale, newScale, newScale);
                
                // Recenter after scaling
                const scaledBbox = new THREE.Box3().setFromObject(object);
                const scaledCenter = new THREE.Vector3();
                scaledBbox.getCenter(scaledCenter);
                const offset = new THREE.Vector3().subVectors(originalCenter, scaledCenter);
                object.position.add(offset);
                
                console.log('Scaled down object to fit within room bounds, new scale:', newScale);
            }

            // Handle group replacements - hide all components in the group
            const groupId = fixtureToReplace.userData.fixtureGroupId;
            let groupComponents = [fixtureToReplace]; // Default to just the selected fixture

            if (groupId) {
                groupComponents = [];
                room.traverse(groupObject => {
                    if (groupObject.userData && 
                        groupObject.userData.fixtureGroupId === groupId) {
                        groupComponents.push(groupObject);
                        // Remove any existing replacements for group components
                        if (groupObject.userData.replacement) {
                            room.remove(groupObject.userData.replacement);
                            groupObject.userData.replacement = null;
                        }
                    }
                });
                console.log(`Found ${groupComponents.length} components in group ${groupId} for replacement`);
            }

            // Hide all components in the group
            groupComponents.forEach(component => {
                component.visible = false;
                console.log(`Hiding component: ${component.userData.originalName || 'unnamed'}`);
            });

            // Store reference to the replacement in each component
            groupComponents.forEach(component => {
                component.userData.replacement = object;
            });

            // Store reference to all original group components in the replacement
            object.userData = {
                isReplacement: true,
                originalFixture: fixtureToReplace,
                originalGroup: groupComponents,
                fixtureType: fixtureToReplace.userData.fixtureType,
                fixtureGroupId: groupId,
                accessoryData: accessoryData,
                isFixture: true,
                originalName: modelName,
                fixtureCategory: fixtureToReplace.userData.fixtureCategory
            };

            // Make sure the object is visible and properly added
            object.visible = true;
            object.castShadow = true;
            object.receiveShadow = true;

            // Add to the room (not directly to scene)
            room.add(object);

            console.log('Added replacement object to room:', {
                position: object.position.toArray(),
                scale: object.scale.toArray(),
                visible: object.visible,
                parent: object.parent ? object.parent.name : 'no parent'
            });

            // Force a render update
            if (typeof renderer !== 'undefined') {
                renderer.render(scene, camera);
            }
            
            // Clear selection
            selectedFixture = null;        
            // showMessage(`Replaced with ${modelName}`, 'success');    
        },
        function(xhr) {
             if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            updateModelLoadingProgress(percentComplete, `Loading... ${Math.round(percentComplete)}%`);
    }
        },
        function(error) {
            hideModelLoading();
            console.error('Error loading model:', error);
            showMessage('Failed to load model', 'error');
        }
    );
    
    // Clear highlights before replacement
    if (selectedFixture) {
        const groupId = selectedFixture.userData.fixtureGroupId;
        if (groupId) {
            room.traverse(groupObject => {
                if (groupObject.userData && groupObject.userData.fixtureGroupId === groupId && groupObject.userData.highlight) {
                    scene.remove(groupObject.userData.highlight);
                    groupObject.userData.highlight = null;
                }
            });
        } else {
            if (selectedFixture.userData.highlight) {
                scene.remove(selectedFixture.userData.highlight);
                selectedFixture.userData.highlight = null;
            }
        }
    }
    // At the end of replaceFixture function, after line 2261:
    console.log('Added replacement object to room:', {position: object.position.toArray(), scale: object.scale.toArray(), visible: object.visible});

    // NEW: Add this line
    await showColorOptionsForFixture(selectedFixture);

    showMessage(`Replaced with ${modelName}`, 'success');

}
async function loadOBJWithMTL(modelPath, modelName, originalBbox, originalCenter, originalSize, accessoryData) {
    // Check if MTLLoader is available
    if (typeof THREE.MTLLoader === 'undefined') {
        console.log('MTLLoader not available, loading script...');
        updateModelLoadingProgress(10, 'Loading required libraries...');
        
        loadScript('https://unpkg.com/three@0.137.0/examples/js/loaders/MTLLoader.js', function() {
            console.log("MTLLoader loaded, retrying...");
            updateModelLoadingProgress(20, 'Libraries loaded, processing model...');
            loadOBJWithMTL(modelPath, modelName, originalBbox, originalCenter, originalSize, accessoryData);
        });
        return;
    }
    
    // Extract base name for MTL file
    const fileName = modelPath.split('/').pop();
    const baseName = fileName.replace('.obj', '');
    console.log('Attempting to load MTL for:', baseName);
    console.log('MTL path will be:', '/static/accessories/material/' + baseName + '.mtl');
    updateModelLoadingProgress(30, 'Loading materials...');
    
    // Load MTL first
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath('/static/accessories/material/');
    mtlLoader.load(
        baseName + '.mtl',
        function(materials) {
            console.log('MTL loaded successfully for:', baseName);
            materials.preload();
            updateModelLoadingProgress(50, 'Materials loaded, loading 3D model...');
            const objLoader = new THREE.OBJLoader();
            objLoader.setMaterials(materials);
            loadOBJModel(objLoader, modelPath, modelName, originalBbox, originalCenter, originalSize, true, accessoryData);
        },
        function(progress) {
            console.log('MTL loading progress:', progress);
            // Update progress for MTL loading (30-50%)
            if (progress.lengthComputable) {
                const mtlProgress = 30 + (progress.loaded / progress.total) * 20;
                updateModelLoadingProgress(mtlProgress, 'Loading materials...');
            }
        },
        function(error) {
            console.log('MTL not found for:', baseName, 'Error:', error);
            console.log('Using default materials instead');
            updateModelLoadingProgress(40, 'Loading 3D model with default materials...');
            
            const objLoader = new THREE.OBJLoader();
            loadOBJModel(objLoader, modelPath, modelName, originalBbox, originalCenter, originalSize, false, accessoryData);
        }
    );
}

async function loadOBJModel(objLoader, modelPath, modelName, originalBbox, originalCenter, originalSize, hasMTL, accessoryData) {
    console.log('Loading OBJ model:', modelPath, 'Has MTL:', hasMTL);
    
    objLoader.load(modelPath, function(object) {
        console.log('OBJ loaded successfully, applying materials...');
        updateModelLoadingProgress(60, 'Applying materials...');
        
        // Apply materials only if MTL wasn't loaded
        object.traverse(child => {
            if (child.isMesh) {
                if (!hasMTL || !child.material || child.material.type === 'MeshBasicMaterial') {
                    console.log('Applying default material to mesh:', child.name);
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0xffffff,
                        roughness: 0.7,
                        metalness: 0.1
                    });
                } else {
                    console.log('Using MTL material for mesh:', child.name, 'Material type:', child.material.type);
                }
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        updateModelLoadingProgress(70, 'Positioning model...');
        
        // Remove any existing replacement before adding new one
        const fixtureToReplace = selectedFixture;
        if (fixtureToReplace.userData.replacement) {
            console.log('Removing existing replacement');
            room.remove(fixtureToReplace.userData.replacement);
            fixtureToReplace.userData.replacement = null;
        }
        
        // Get the bounding box of the new model
        const newBbox = new THREE.Box3().setFromObject(object);
        const newCenter = new THREE.Vector3();
        newBbox.getCenter(newCenter);
        const newSize = new THREE.Vector3();
        newBbox.getSize(newSize);
        
        console.log('New model before positioning:', {
            center: newCenter.toArray(),
            size: newSize.toArray(),
            position: object.position.toArray()
        });
        
        updateModelLoadingProgress(75, 'Calculating scale...');
        
        // Fix rotation first - ensure the model is upright
        object.rotation.set(0, 0, 0);
        if (newSize.y < newSize.x || newSize.y < newSize.z) {
            if (newSize.x > newSize.y && newSize.z > newSize.y) {
                object.rotation.y = -Math.PI / 2;
                console.log('Applied rotation to make model upright');
            }
        }
        
        // Recalculate bounding box after rotation
        const rotatedBbox = new THREE.Box3().setFromObject(object);
        const rotatedCenter = new THREE.Vector3();
        rotatedBbox.getCenter(rotatedCenter);
        const rotatedSize = new THREE.Vector3();
        rotatedBbox.getSize(rotatedSize);
        
        // Calculate scale
        const scaleX = originalSize.x / rotatedSize.x;
        const scaleY = originalSize.y / rotatedSize.y;
        const scaleZ = originalSize.z / rotatedSize.z;
        let uniformScale = Math.min(scaleX, scaleY, scaleZ) * 1.2;
        
        console.log('Scale factors:', { scaleX, scaleY, scaleZ });
        console.log('Selected uniform scale:', uniformScale);
        
        object.scale.set(uniformScale, uniformScale, uniformScale);
        
        updateModelLoadingProgress(80, 'Applying positioning...');
        
        // Recalculate bounding box after scaling
        const scaledBbox = new THREE.Box3().setFromObject(object);
        const scaledCenter = new THREE.Vector3();
        scaledBbox.getCenter(scaledCenter);
        
        // Position the new object
        const offset = new THREE.Vector3().subVectors(originalCenter, scaledCenter);
        object.position.add(offset);
        
        // ENHANCED COLLISION DETECTION - Apply constraints to prevent going through walls/floor and overlapping with other objects
        const finalBbox = new THREE.Box3().setFromObject(object);
        const roomBbox = new THREE.Box3().setFromObject(room);
        
        // Floor constraint - if object goes below floor
        if (finalBbox.min.y < roomBbox.min.y) {
            const floorCorrection = roomBbox.min.y - finalBbox.min.y + 0.02;
            object.position.y += floorCorrection;
            console.log('Applied floor constraint, moved up by:', floorCorrection);
        }
        
        // Enhanced wall constraints with safety margins
        let positionChanged = false;
        const safetyMargin = 0.1; // 10cm safety margin from walls
        
        // X-axis constraints (left/right walls)
        if (finalBbox.min.x < roomBbox.min.x + safetyMargin) {
            const correction = (roomBbox.min.x + safetyMargin) - finalBbox.min.x;
            object.position.x += correction;
            positionChanged = true;
            console.log('Applied left wall constraint, moved right by:', correction);
        } else if (finalBbox.max.x > roomBbox.max.x - safetyMargin) {
            const correction = finalBbox.max.x - (roomBbox.max.x - safetyMargin);
            object.position.x -= correction;
            positionChanged = true;
            console.log('Applied right wall constraint, moved left by:', correction);
        }
        
        // Z-axis constraints (front/back walls)
        if (finalBbox.min.z < roomBbox.min.z + safetyMargin) {
            const correction = (roomBbox.min.z + safetyMargin) - finalBbox.min.z;
            object.position.z += correction;
            positionChanged = true;
            console.log('Applied back wall constraint, moved forward by:', correction);
        } else if (finalBbox.max.z > roomBbox.max.z - safetyMargin) {
            const correction = finalBbox.max.z - (roomBbox.max.z - safetyMargin);
            object.position.z -= correction;
            positionChanged = true;
            console.log('Applied front wall constraint, moved back by:', correction);
        }
        
        // Check for overlaps with other objects in the room
        const objectsToCheck = [];
        room.traverse(child => {
            if (child.isMesh && 
                child !== object && 
                child.visible && 
                !child.userData.isReplacement && // Don't check against other replacements
                child.userData.fixtureType) { // Only check against fixtures
                objectsToCheck.push(child);
            }
        });
        
        // Also check against replacement objects
        room.traverse(child => {
            if (child.userData && child.userData.isReplacement && child !== object) {
                objectsToCheck.push(child);
            }
        });
        
        if (positionChanged) {
            console.log('Final position after all constraints:', object.position.toArray());
        }
        
        // Validate final position is safe
        const finalValidationBbox = new THREE.Box3().setFromObject(object);
        if (!roomBbox.containsBox(finalValidationBbox)) {
            console.warn('Object extends beyond room boundaries after all adjustments');
            // If object is still outside room, scale it down
            const currentScale = object.scale.x;
            const newScale = currentScale * 0.8; // Reduce by 20%
            object.scale.set(newScale, newScale, newScale);
            
            // Recenter after scaling
            const scaledBbox = new THREE.Box3().setFromObject(object);
            const scaledCenter = new THREE.Vector3();
            scaledBbox.getCenter(scaledCenter);
            const offset = new THREE.Vector3().subVectors(originalCenter, scaledCenter);
            object.position.add(offset);
            
            console.log('Scaled down object to fit within room bounds, new scale:', newScale);
        }
        
        updateModelLoadingProgress(85, 'Handling group replacements...');
        
        // Handle group replacements
        const groupId = fixtureToReplace.userData.fixtureGroupId;
        let groupComponents = [fixtureToReplace];
        
        if (groupId) {
            groupComponents = [];
            room.traverse(groupObject => {
                if (groupObject.userData && groupObject.userData.fixtureGroupId === groupId) {
                    groupComponents.push(groupObject);
                    if (groupObject.userData.replacement) {
                        room.remove(groupObject.userData.replacement);
                        groupObject.userData.replacement = null;
                    }
                }
            });
            console.log(`Found ${groupComponents.length} components in group ${groupId} for replacement`);
        }
        
        updateModelLoadingProgress(90, 'Finalizing replacement...');
        
                // Hide all components in the group
        groupComponents.forEach(component => {
            component.visible = false;
            console.log(`Hiding component: ${component.userData.originalName || 'unnamed'}`);
        });
        
        // Store references
        groupComponents.forEach(component => {
            component.userData.replacement = object;
        });
        
        object.userData = {
            isReplacement: true,
            originalFixture: fixtureToReplace,
            originalGroup: groupComponents,
            fixtureType: fixtureToReplace.userData.fixtureType,
            fixtureGroupId: groupId,
            accessoryData: accessoryData
        };
        
        object.visible = true;
        object.castShadow = true;
        object.receiveShadow = true;
        room.add(object);
        
        console.log('Added replacement object to room:', {
            position: object.position.toArray(),
            scale: object.scale.toArray(),
            visible: object.visible
        });
        
        if (typeof renderer !== 'undefined') {
            renderer.render(scene, camera);
        }
        
        updateModelLoadingProgress(95, 'Cleaning up...');
        
        // Clear selection and highlights
        if (selectedFixture) {
            const groupId = selectedFixture.userData.fixtureGroupId;
            if (groupId) {
                room.traverse(groupObject => {
                    if (groupObject.userData && groupObject.userData.fixtureGroupId === groupId && groupObject.userData.highlight) {
                        scene.remove(groupObject.userData.highlight);
                        groupObject.userData.highlight = null;
                    }
                });
            } else {
                if (selectedFixture.userData.highlight) {
                    scene.remove(selectedFixture.userData.highlight);
                    selectedFixture.userData.highlight = null;
                }
            }
        }
        
        selectedFixture = null;
        
        updateModelLoadingProgress(100, 'Complete!');
        
        // Hide loading after a brief delay to show completion
        setTimeout(() => {
            hideModelLoading();
            showMessage(`Replaced with ${modelName}`, 'success');
        }, 500);
        
    }, function(xhr) {
        // Progress callback for OBJ loading
        if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 50; // OBJ loading is first 50%
            updateModelLoadingProgress(percentComplete, 'Loading model...');
        }
    }, function(error) {
        hideModelLoading();
        console.error('Error loading OBJ model:', error);
        showMessage('Failed to load model', 'error');
    });
}


// Function to show messages
function showMessage(message, type = 'info', autoHide = true) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create or get message container
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '50px';
        messageContainer.style.right = '20px';
        messageContainer.style.zIndex = '100000';
        document.body.appendChild(messageContainer);
    }
    
    // Determine alert class
    let alertClass = 'alert-info';
    if (type === 'success') alertClass = 'alert-success';
    if (type === 'error') alertClass = 'alert-danger';
    if (type === 'warning') alertClass = 'alert-warning';
    
    // Remove existing loading messages if this is a new loading message
    if (message.includes('Loading') || message.includes('loading')) {
        const existingMessages = messageContainer.querySelectorAll('.alert');
        existingMessages.forEach(msg => {
            if (msg.textContent.includes('Loading') || msg.textContent.includes('loading')) {
                messageContainer.removeChild(msg);
            }
        });
    }
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `alert ${alertClass} alert-dismissible fade show`;
    messageElement.setAttribute('data-loading-message', message.includes('Loading') ? 'true' : 'false');
    messageElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to container
    messageContainer.appendChild(messageElement);
    
    // Auto-dismiss after 5 seconds (only if autoHide is true)
    if (autoHide) {
        setTimeout(() => {
            if (messageContainer.contains(messageElement)) {
                messageElement.classList.remove('show');
                setTimeout(() => {
                    if (messageContainer.contains(messageElement)) {
                        messageContainer.removeChild(messageElement);
                    }
                }, 150);
            }
        }, 5000);
    }
    
    return messageElement; // Return the element so we can update it
}


// Function to clear selection
function clearSelection() {
    clearFixtureSelection();
    // Also clear surface selections if they exist
    if (typeof clearAllSurfaces === 'function') {
        clearAllSurfaces();
    }
}

// Add this function to create a simple bathroom from scratch
function createSimpleBathroom() {
    console.log('Creating simple bathroom from scratch');

    // Clear any existing room first
    clearExistingRoom();

    // Clear any existing room and indicators
    // scene.traverse(object => {
    //     if (object.userData && object.userData.isIndicator) {
    //         scene.remove(object);
    //     }
    // });

    // Create a new room group
    room = new THREE.Group();
    scene.add(room);

    // Define room dimensions
    const width = 3;
    const height = 2.5;
    const depth = 3;

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(width, depth);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xe0e0e0,
        roughness: 0.7,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    floor.castShadow = false;
    floor.userData = {
        id: 'floor',
        name: 'Floor',
        type: 'floor',
        isSelectable: true
    };
    room.add(floor);

    // Create ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(width, depth);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        metalness: 0.1
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    ceiling.receiveShadow = true;
    ceiling.castShadow = false;
    ceiling.userData = {
        id: 'ceiling',
        name: 'Ceiling',
        type: 'ceiling',
        isSelectable: true
    };
    room.add(ceiling);

    // Create back wall (facing the camera)
    const backWallGeometry = new THREE.PlaneGeometry(width, height);
    const backWallMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide // Make sure both sides are visible
    });
    const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    backWall.userData = {
        id: 'backWall',
        name: 'Back Wall',
        type: 'wall',
        isSelectable: true
    };
    room.add(backWall);

    // Create left wall
    const leftWallGeometry = new THREE.PlaneGeometry(depth, height);
    const leftWallMaterial = backWallMaterial.clone();
    const leftWall = new THREE.Mesh(leftWallGeometry, leftWallMaterial);
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    leftWall.userData = {
        id: 'leftWall',
        name: 'Left Wall',
        type: 'wall',
        isSelectable: true
    };
    room.add(leftWall);

    // Create right wall
    const rightWallGeometry = new THREE.PlaneGeometry(depth, height);
    const rightWallMaterial = backWallMaterial.clone();
    const rightWall = new THREE.Mesh(rightWallGeometry, rightWallMaterial);
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    rightWall.userData = {
        id: 'rightWall',
        name: 'Right Wall',
        type: 'wall',
        isSelectable: true
    };
    room.add(rightWall);

    // Add bathroom fixtures (if needed)
    // addBathroomFixtures();

    // Store all selectable surfaces for easy access
    const selectableSurfaces = [floor, ceiling, backWall, leftWall, rightWall];

    // Create selection indicators for each surface
    selectableSurfaces.forEach(surface => {
        createSelectionIndicator(surface);
        console.log(`Created selectable surface: ${surface.userData.name}`);
    });

    // Reset selected surfaces
    selectedSurfaces = [];

    // Adjust camera position
    camera.position.set(0, 1.6, 3);
    controls.target.set(0, 1, 0);
    controls.update();

    console.log('Simple bathroom created successfully with', selectableSurfaces.length, 'selectable surfaces');

    // Force a render update
    renderer.render(scene, camera);
}

// Create Apartment
function createApartment() {
    // Set current room type
    currentRoomType = 'apartment';

    // Show loading indicator
    showModelLoadingIndicator(true, 'Loading apartment...');

    // Clear any existing room first
    clearExistingRoom();

    // Create a new room group
    room = new THREE.Group();
    scene.add(room);

    // Set up proper lighting first
    setupPBRLighting();

    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Check if the model was preloaded
    const isPreloaded = modelCache['apartment'] && modelCache['apartment'].loaded;
    
    if (isPreloaded) {
        console.log('Using preloaded apartment model path');
    }
    
    // Load the model (even if preloaded, we need a fresh instance)
    loader.load(
        isPreloaded ? modelCache['apartment'].url : '/static/3drooms/Appartments/Handmade/E-unit/3-Bedroom-Apartment.glb',
        function(gltf) {
            // Fix texture formats if gltf is valid
            if (gltf && gltf.scene) {
                const fixedGltf = fixTextureFormats(gltf);
                
                // Add the model to the scene
                room.add(fixedGltf.scene);

                setTimeout(() => {
                    identifyFixtures();
                    debugRoomObjects();
                }, 500);
                                
                console.log('Apartment model added to scene' + (isPreloaded ? ' (preloaded)' : ''));
                
                // Process the model to identify surfaces
                identifySurfaces(fixedGltf.scene);

                // Adjust camera position
                camera.position.set(0, 1.6, 4);
                controls.target.set(0, 1, 0);

                // Apartment-specific control limitations
                controls.minDistance = 2;
                controls.maxDistance = 6;
                controls.minPolarAngle = Math.PI / 4; // Limit vertical rotation
                controls.maxPolarAngle = Math.PI / 1.8; // Limit vertical rotation
                controls.minAzimuthAngle = -Math.PI / 2; // More horizontal freedom
                controls.maxAzimuthAngle = Math.PI / 2;  // More horizontal freedom

                // Store the initial camera settings for reset functionality
                initialCameraSettings.apartment = {
                    position: new THREE.Vector3(0, 1.6, 4),
                    target: new THREE.Vector3(0, 1, 0)
                };
        
                controls.update();
                
                // Force a render update
                renderer.render(scene, camera);
            } else {
                console.error("Invalid GLTF model loaded");
                createSimpleApartment(); // Fallback
            }
            
            // Hide loading indicator after a short delay to ensure rendering is complete
            setTimeout(() => {
                showModelLoadingIndicator(false);
            }, 500);
        },

        // Called while loading is progressing
        function (xhr) {
            if (xhr.lengthComputable) {
                const percentComplete = (xhr.loaded / xhr.total) * 100;
                updateModelLoadingProgress(percentComplete, `Loading... ${Math.round(percentComplete)}%`);
            }
        },

        // Called when loading has errors
        function (error) {
            console.error('Error loading apartment model:', error);
            createSimpleApartment(); // Fallback
            showModelLoadingIndicator(false);
        }
    );
}

// Create a simple apartment as fallback
function createSimpleApartment() {
    console.log('Creating simple apartment from scratch');

    // Clear any existing room first
    clearExistingRoom();

    // Create a new room group
    room = new THREE.Group();
    scene.add(room);

    // Define room dimensions
    const width = 6;
    const height = 3;
    const depth = 8;

    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(width, depth);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xd2b48c, // Tan color for apartment floor
        roughness: 0.7,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    floor.castShadow = false;
    floor.userData = {
        id: 'floor',
        name: 'Apartment Floor',
        type: 'floor',
        isSelectable: true
    };
    room.add(floor);

    // Create ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(width, depth);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        metalness: 0.1
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    ceiling.receiveShadow = true;
    ceiling.castShadow = false;
    ceiling.userData = {
        id: 'ceiling',
        name: 'Ceiling',
        type: 'ceiling',
        isSelectable: true
    };
    room.add(ceiling);

    // Create walls
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5dc, // Beige color for walls
        roughness: 0.8,
        metalness: 0.1
    });

    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(width, height);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.receiveShadow = true;
    backWall.userData = {
        id: 'backWall',
        name: 'Back Wall',
        type: 'wall',
        isSelectable: true
    };
    room.add(backWall);

    // Left wall
    const leftWallGeometry = new THREE.PlaneGeometry(depth, height);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.userData = {
        id: 'leftWall',
        name: 'Left Wall',
        type: 'wall',
        isSelectable: true
    };
    room.add(leftWall);

    // Right wall
    const rightWallGeometry = new THREE.PlaneGeometry(depth, height);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.userData = {
        id: 'rightWall',
        name: 'Right Wall',
        type: 'wall',
        isSelectable: true
    };
    room.add(rightWall);

    // Front wall with door opening
const frontWallLeftGeometry = new THREE.PlaneGeometry(width * 0.3, height);
const frontWallLeft = new THREE.Mesh(frontWallLeftGeometry, wallMaterial);
frontWallLeft.position.set(-width * 0.35, height / 2, depth / 2);
frontWallLeft.rotation.y = Math.PI;
frontWallLeft.receiveShadow = true;
frontWallLeft.userData = {
    id: 'frontWallLeft',
    name: 'Front Wall Left',
    type: 'wall',
    isSelectable: true
};
room.add(frontWallLeft);

const frontWallRightGeometry = new THREE.PlaneGeometry(width * 0.3, height);
const frontWallRight = new THREE.Mesh(frontWallRightGeometry, wallMaterial);
frontWallRight.position.set(width * 0.35, height / 2, depth / 2);
frontWallRight.rotation.y = Math.PI;
frontWallRight.receiveShadow = true;
frontWallRight.userData = {
    id: 'frontWallRight',
    name: 'Front Wall Right',
    type: 'wall',
    isSelectable: true
};
room.add(frontWallRight);

const frontWallTopGeometry = new THREE.PlaneGeometry(width * 0.4, height * 0.3);
const frontWallTop = new THREE.Mesh(frontWallTopGeometry, wallMaterial);
frontWallTop.position.set(0, height * 0.85, depth / 2);
frontWallTop.rotation.y = Math.PI;
frontWallTop.receiveShadow = true;
frontWallTop.userData = {
    id: 'frontWallTop',
    name: 'Front Wall Top',
    type: 'wall',
    isSelectable: true
};
room.add(frontWallTop);

// Add some furniture to make it look like an apartment
// Simple couch
const couchGeometry = new THREE.BoxGeometry(2, 0.8, 0.8);
const couchMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b8e23, // Olive green for couch
    roughness: 0.8,
    metalness: 0.1
});
const couch = new THREE.Mesh(couchGeometry, couchMaterial);
couch.position.set(0, 0.4, -depth / 2 + 1);
couch.receiveShadow = true;
couch.castShadow = true;
couch.userData = {
    id: 'couch',
    name: 'Couch',
    type: 'furniture',
    isSelectable: false
};
room.add(couch);

// Coffee table
const tableGeometry = new THREE.BoxGeometry(1.2, 0.4, 0.8);
const tableMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513, // Brown for table
    roughness: 0.6,
    metalness: 0.2
});
const table = new THREE.Mesh(tableGeometry, tableMaterial);
table.position.set(0, 0.2, -depth / 2 + 2.2);
table.receiveShadow = true;
table.castShadow = true;
table.userData = {
    id: 'table',
    name: 'Coffee Table',
    type: 'furniture',
    isSelectable: false
};
room.add(table);

// Simple kitchen counter
const counterGeometry = new THREE.BoxGeometry(2, 0.9, 0.6);
const counterMaterial = new THREE.MeshStandardMaterial({
    color: 0xd3d3d3, // Light gray for counter
    roughness: 0.5,
    metalness: 0.3
});
const counter = new THREE.Mesh(counterGeometry, counterMaterial);
counter.position.set(-width / 2 + 1.2, 0.45, depth / 2 - 1);
counter.receiveShadow = true;
counter.castShadow = true;
counter.userData = {
    id: 'counter',
    name: 'Kitchen Counter',
    type: 'furniture',
    isSelectable: false
};
room.add(counter);

// Adjust camera position
camera.position.set(0, 1.6, 4);
controls.target.set(0, 1, 0);
controls.update();

// Store the initial camera settings for reset functionality
initialCameraSettings.apartment = {
    position: new THREE.Vector3(0, 1.6, 4),
    target: new THREE.Vector3(0, 1, 0)
};

// Force a render update
renderer.render(scene, camera);

// Identify surfaces for texture application
identifySurfaces(room);
}

// Create Bathroom
function createBathroom() {
    // Set current room type
    currentRoomType = 'bathroom';

    // Show loading indicator
    showModelLoadingIndicator(true, 'Loading bathroom...');

    // Clear any existing room first
    clearExistingRoom();

    // Create a new room group
    room = new THREE.Group();
    scene.add(room);

    // Show loading indicator
    const loadingElem = document.querySelector('.loading-indicator');
    if (loadingElem) loadingElem.style.display = 'block';

    // Set up proper lighting first
    setupPBRLighting();

    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Check if the model was preloaded
    const isPreloaded = modelCache['bathroom'] && modelCache['bathroom'].loaded;
    
    if (isPreloaded) {
        console.log('Using preloaded bathroom model path');
    }
    
    // Load the model (even if preloaded, we need a fresh instance)
    loader.load(
        isPreloaded ? modelCache['bathroom'].url : '/static/3drooms/Bathroom/brown-bathroom.glb',
        function(gltf) {
            
            // Fix texture formats
            const fixedGltf = fixTextureFormats(gltf);
            
            // Add the model to the scene
            room.add(fixedGltf.scene);
                
            setTimeout(() => {
                identifyFixtures();
                debugRoomObjects();
            }, 500);
            
            console.log('Bathroom model added to scene' + (isPreloaded ? ' (preloaded)' : ''));
            
            // Process the model to identify surfaces and fixtures
            identifySurfaces(fixedGltf.scene);

            // Adjust camera position
            camera.position.set(0, 1, 2);
            controls.target.set(0, 1, 0);

            controls.minDistance = 1;
            controls.maxDistance = 1.8;
            controls.minPolarAngle = Math.PI / 4.2; // Limit vertical rotation
            controls.maxPolarAngle = Math.PI / 1.5; // Limit vertical rotation
            controls.minAzimuthAngle = -Math.PI / 5; // Limit left rotation to 45 degrees
            controls.maxAzimuthAngle = Math.PI / 5;  // Limit right rotation to 45 degrees

            // Store the initial camera settings for reset functionality
            initialCameraSettings.bathroom.position.copy(camera.position);
            initialCameraSettings.bathroom.target.copy(controls.target);
    
            controls.update();
            
            // Force a render update
            renderer.render(scene, camera);
            
            // Hide loading indicator after a short delay to ensure rendering is complete
            setTimeout(() => {
                showModelLoadingIndicator(false);
            }, 500);
        },

        // Called while loading is progressing
        function (xhr) {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },

        // Called when loading has errors
        function (error) {
            console.error('Error loading bathroom model:', error);
            if (loadingElem) {
                loadingElem.innerHTML = 'Error loading model';
                loadingElem.style.color = 'red';
            }

            // Fallback to creating a simple bathroom if loading fails
            createSimpleBathroom();
        }
    );
}

// Create Kitchen
function createKitchen() {
    // Set current room type
    currentRoomType = 'kitchen';

    // Show loading indicator
    showModelLoadingIndicator(true, 'Loading kitchen...');

    // Clear any existing room first
    clearExistingRoom();

    // Create a new room group
    room = new THREE.Group();
    scene.add(room);

    // Show loading indicator
    const loadingElem = document.querySelector('.loading-indicator');
    if (loadingElem) loadingElem.style.display = 'block';

    // Set up proper lighting first
    setupPBRLighting();

    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Check if the model was preloaded
    const isPreloaded = modelCache['kitchen'] && modelCache['kitchen'].loaded;
    
    if (isPreloaded) {
        console.log('Using preloaded kitchen model path');
    }
    
    // Load the model (even if preloaded, we need a fresh instance)
    loader.load(
        isPreloaded ? modelCache['kitchen'].url : '/static/3drooms/Kitchen/kitchenx.glb',
        function(gltf) {
            
            // Fix texture formats
            const fixedGltf = fixTextureFormats(gltf);
            
            // Add the model to the scene
            room.add(fixedGltf.scene);
                
            setTimeout(() => {
                identifyFixtures();
                debugRoomObjects();
            }, 500);
            
            console.log('Kitchen model added to scene' + (isPreloaded ? ' (preloaded)' : ''));
            
            // Process the model to identify surfaces
            identifySurfaces(fixedGltf.scene);

            // Adjust camera position
            camera.position.set(4, 1.6, 5);
            controls.target.set(4, 2, -3);

            controls.minDistance = 3;
            controls.maxDistance = 5;
            controls.minPolarAngle = Math.PI / 2.1; // Slightly more vertical freedom
            controls.maxPolarAngle = Math.PI / 1.6; // Slightly more vertical freedom
            controls.minAzimuthAngle = -Math.PI / 15; // More horizontal freedom
            controls.maxAzimuthAngle = Math.PI / 9;

            // Store the initial camera settings for reset functionality
            initialCameraSettings.kitchen.position.copy(camera.position);
            initialCameraSettings.kitchen.target.copy(controls.target);
    
            controls.update();
            
            // Force a render update
            renderer.render(scene, camera);
            
            // Hide loading indicator after a short delay to ensure rendering is complete
            setTimeout(() => {
                showModelLoadingIndicator(false);
            }, 500);
        },

        // Called while loading is progressing
        function (xhr) {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },

        // Called when loading has errors
        function (error) {
            console.error('Error loading kitchen model:', error);
            if (loadingElem) {
                loadingElem.innerHTML = 'Error loading model';
                loadingElem.style.color = 'red';
            }

            // Fallback to creating a simple kitchen if loading fails
            createSimpleKitchen();
        }
    );
}

// Create Living
function createLiving() {
    // Set current room type
    currentRoomType = 'living';

    // Show loading indicator
    showModelLoadingIndicator(true, 'Loading living room...');

    // Clear any existing room first
    clearExistingRoom();

    // Create a new room group
    room = new THREE.Group();
    scene.add(room);

    // Show loading indicator
    const loadingElem = document.querySelector('.loading-indicator');
    if (loadingElem) loadingElem.style.display = 'block';

    // Set up proper lighting first
    setupPBRLighting();

    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Check if the model was preloaded
    const isPreloaded = modelCache['living'] && modelCache['living'].loaded;
    
    if (isPreloaded) {
        console.log('Using preloaded living model path');
    }
    
    // Load the model (even if preloaded, we need a fresh instance)
    loader.load(
        isPreloaded ? modelCache['living'].url : '/static/3drooms/Living Room/livingz.glb',
        function(gltf) {
            
            // Fix texture formats
            const fixedGltf = fixTextureFormats(gltf);
            
            // Add the model to the scene
            room.add(fixedGltf.scene);
                
            setTimeout(() => {
                identifyFixtures();
                debugRoomObjects();
            }, 500);
            
            console.log('living model added to scene' + (isPreloaded ? ' (preloaded)' : ''));
            
            // Process the model to identify surfaces
            identifySurfaces(fixedGltf.scene);

            // Adjust camera position
            camera.position.set(1, 1.4, 1);
            controls.target.set(-1, 1, -0.5);

            // Living room-specific control limitations
            controls.minDistance = 0;
            controls.maxDistance = 2.5;
            controls.minPolarAngle = Math.PI / 6; // Limit vertical rotation
            controls.maxPolarAngle = Math.PI / 1.8; // More vertical freedom
            controls.minAzimuthAngle = -Math.PI / 2.5; // More horizontal freedom
            controls.maxAzimuthAngle = Math.PI / 2.5;

            // Store the initial camera settings for reset functionality
            initialCameraSettings.living.position.copy(camera.position);
            initialCameraSettings.living.target.copy(controls.target);
    
            controls.update();
            
            // Force a render update
            renderer.render(scene, camera);
            
            // Hide loading indicator after a short delay to ensure rendering is complete
            setTimeout(() => {
                showModelLoadingIndicator(false);
            }, 500);
        },

        // Called while loading is progressing
        function (xhr) {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },

        // Called when loading has errors
        function (error) {
            console.error('Error loading living model:', error);
            if (loadingElem) {
                loadingElem.innerHTML = 'Error loading model';
                loadingElem.style.color = 'red';
            }

            // Fallback to creating a simple living if loading fails
            createSimpleLiving();
        }
    );
}// Create Bedroom
function createBedroom() {
    // Set current room type
    currentRoomType = 'bedroom';

    // Show loading indicator
    showModelLoadingIndicator(true, 'Loading bedroom...');

    // Clear any existing room first
    clearExistingRoom();

    // Create a new room group
    room = new THREE.Group();
    scene.add(room);

    // Show loading indicator
    const loadingElem = document.querySelector('.loading-indicator');
    if (loadingElem) loadingElem.style.display = 'block';

    // Set up proper lighting first
    setupPBRLighting();

    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Check if the model was preloaded
    const isPreloaded = modelCache['bedroom'] && modelCache['bedroom'].loaded;
    
    if (isPreloaded) {
        console.log('Using preloaded bedroom model path');
    }
    
    // Load the model (even if preloaded, we need a fresh instance)
    loader.load(
        isPreloaded ? modelCache['bedroom'].url : '/static/3drooms/Bedroom/bedroomy.glb',
        function(gltf) {
            
            // Fix texture formats
            const fixedGltf = fixTextureFormats(gltf);
            
            // Add the model to the scene
            room.add(fixedGltf.scene);
                
            setTimeout(() => {
                identifyFixtures();
                debugRoomObjects();
            }, 500);
            
            console.log('Bedroom model added to scene' + (isPreloaded ? ' (preloaded)' : ''));
            
            // Process the model to identify surfaces
            identifySurfaces(fixedGltf.scene);

            // First, analyze the model to find its bounding box
            const bbox = new THREE.Box3().setFromObject(gltf.scene);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            const size = new THREE.Vector3();
            bbox.getSize(size);

            console.log('Model bounding box:', {
                center: center.toArray(),
                size: size.toArray(),
                min: bbox.min.toArray(),
                max: bbox.max.toArray()
            });

            // Offset the model to center it at the origin
            gltf.scene.position.set(-center.x, 0, -center.z);

            // Add the model to the scene
            room.add(gltf.scene);

            console.log('Bedroom model added to scene with position adjustment');

            // Process the model to identify surfaces
            if (gltf.scene) {
                identifySurfaces(gltf.scene);
            } else {
                console.error("Invalid scene in loaded model");
                createSimpleBedroom(); // Fallback
            }

            // Recalculate bounding box after positioning
            const adjustedBbox = new THREE.Box3().setFromObject(room);
            const adjustedCenter = new THREE.Vector3();
            adjustedBbox.getCenter(adjustedCenter);

            // Set camera to look at the bed (typically near the center of the room)
            // Position camera at a good viewing angle
            camera.position.set(
                adjustedCenter.x,
                adjustedCenter.y + 1.6, // Eye level
                adjustedCenter.z + 1    // 3 meters back from center
            );

            // Look at the center of the room
            controls.target.set(
                adjustedCenter.x,
                adjustedCenter.y + 1.0, // Look slightly down
                adjustedCenter.z + 1.0  // Look slightly forward into the room
            );

            // Adjust camera position
            camera.position.set(0, 1.6, 0.01);
            controls.target.set(0, 1.6, 0);

            // Bedroom-specific control limitations
            controls.minDistance = 0;
            controls.maxDistance = 1;
            controls.minPolarAngle = Math.PI / 3;
            controls.maxPolarAngle = Math.PI / 1.3;
            controls.minAzimuthAngle = -Math.PI / 7;
            controls.maxAzimuthAngle = Math.PI / 7;

            // Store the initial camera settings for reset functionality
            initialCameraSettings.bedroom.position.copy(camera.position);
            initialCameraSettings.bedroom.target.copy(controls.target);
    
            controls.update();
            
            // Force a render update
            renderer.render(scene, camera);
            
            // Hide loading indicator after a short delay to ensure rendering is complete
            setTimeout(() => {
                showModelLoadingIndicator(false);
            }, 500);
        },

        // Called while loading is progressing
        function (xhr) {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },

        // Called when loading has errors
        function (error) {
            console.error('Error loading bedroom model:', error);
            if (loadingElem) {
                loadingElem.innerHTML = 'Error loading model';
                loadingElem.style.color = 'red';
            }

            // Fallback to creating a simple bathroom if loading fails
            createSimpleBedroom();
        }
    );
}

// Create Hotel
function createHotel() {
    // Set current room type
    currentRoomType = 'hotel';

    // Show loading indicator
    showModelLoadingIndicator(true, 'Loading hotel...');

    // Clear any existing room first
    clearExistingRoom();

    // Create a new room group
    room = new THREE.Group();
    scene.add(room);

    // Set up proper lighting first
    setupPBRLighting();

    // Check if the model is already preloaded
    if (modelCache['hotel'] && modelCache['hotel'].loaded) {
        console.log('Using preloaded hotel model');
        
        // Hide loading indicator
        showModelLoadingIndicator(false);
        
        // Create a GLTFLoader
        const loader = new THREE.GLTFLoader();

        // Load the hotel model
        loader.load(
            // Model URL - ensure this path is correct
            '/static/3drooms/Hotel/hotel.gltf',

            // Called when the resource is loaded
            function (gltf) {
                // Fix texture formats
                const fixedGltf = fixTextureFormats(gltf);

                // Log the model structure to debug
                console.log('Loaded GLTF model:', gltf);

                // Add the model to the scene
                room.add(gltf.scene);

                console.log('Hotel model added to scene');

                // Process the model to identify surfaces
                if (gltf.scene) {
                    identifySurfaces(gltf.scene);
                } else {
                    console.error("Invalid scene in loaded model");
                    createSimpleHotel(); // Fallback
                }

                // Adjust camera position
                camera.position.set(0, 1, 2);
                controls.target.set(0, 1, 0);
                controls.update();

                // Force a render update
                renderer.render(scene, camera);
                
                // Hide loading indicator
                showModelLoadingIndicator(false);
            },

            // Called while loading is progressing
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },

            // Called when loading has errors
            function (error) {
                console.error('Error loading hotel model:', error);
                createSimpleHotel(); // Fallback
                showModelLoadingIndicator(false);
            }
        );
        
        return;
    }

    // Create a GLTFLoader
    const loader = new THREE.GLTFLoader();

    // Add a preprocessor to fix texture formats
    loader.preprocessUrl = function (url) {
        console.log("Loading model from:", url);
        return url;
    };

    // Load the hotel model
    loader.load(
        // Model URL - ensure this path is correct
        '/static/3drooms/Hotel/hotel.gltf',

        // Called when the resource is loaded
        function (gltf) {
            // Fix texture formats - only if gltf is valid
            if (gltf && gltf.scene) {
                gltf = fixTextureFormats(gltf);
            } else {
                console.error("Invalid GLTF model loaded");
                createSimpleHotel(); // Fallback
                showModelLoadingIndicator(false);
                return;
            }

            // Log the model structure to debug
            console.log('Loaded GLTF model:', gltf);

            // Add the model to the scene
            room.add(gltf.scene);

            console.log('Hotel model added to scene');

            // Process the model to identify surfaces
            if (gltf.scene) {
                identifySurfaces(gltf.scene);
            } else {
                console.error("Invalid scene in loaded model");
                createSimpleHotel(); // Fallback
            }

            // Adjust camera position
            camera.position.set(0, 1, 2);
            controls.target.set(0, 1, 0);
            controls.update();

            // Force a render update
            renderer.render(scene, camera);
            
            // Hide loading indicator
            showModelLoadingIndicator(false);
        },

        // Called while loading is progressing
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },

        // Called when loading has errors
        function (error) {
            console.error('Error loading hotel model:', error);
            createSimpleHotel(); // Fallback
            showModelLoadingIndicator(false);
        }
    );
}


function createSimpleHotel() {
    console.log("Creating hotel room");

    // Clear any existing room first
    clearExistingRoom();

    // Remove placeholder if it exists
    const placeholder = document.getElementById('room-placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    // Create a new room group
    room = new THREE.Group();
    scene.add(room);

    // Set up proper lighting
    setupPBRLighting();

    // Create a simple hotel room with basic geometry
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(5, 5);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xd2b48c, // Tan color for hotel carpet
        roughness: 0.9,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    floor.userData = {
        id: 'floor',
        name: 'Hotel Floor',
        type: 'floor',
        isSelectable: true
    };
    room.add(floor);

    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5dc, // Beige color for hotel walls
        roughness: 0.8,
        metalness: 0.1
    });

    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(5, 3);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 1.5, -2.5);
    backWall.receiveShadow = true;
    backWall.userData = {
        id: 'backWall',
        name: 'Back Wall',
        type: 'wall',
        isSelectable: true
    };
    room.add(backWall);

    // Left wall
    const leftWallGeometry = new THREE.PlaneGeometry(5, 3);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-2.5, 1.5, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    leftWall.userData = {
        id: 'leftWall',
        name: 'Left Wall',
        type: 'wall',
        isSelectable: true
    };
    room.add(leftWall);

    // Right wall
    const rightWallGeometry = new THREE.PlaneGeometry(5, 3);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(2.5, 1.5, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    rightWall.userData = {
        id: 'rightWall',
        name: 'Right Wall',
        type: 'wall',
        isSelectable: true
    };
    room.add(rightWall);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(5, 5);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        metalness: 0.1
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3;
    ceiling.receiveShadow = true;
    ceiling.userData = {
        id: 'ceiling',
        name: 'Ceiling',
        type: 'ceiling',
        isSelectable: true
    };
    room.add(ceiling);

    // Add hotel furniture
    addHotelFurniture();

    // Add selection indicators
    [floor, backWall, leftWall, rightWall, ceiling].forEach(surface => {
        createSelectionIndicator(surface);
        addHighlightEffect(surface);
    });

    console.log("Hotel room created successfully");
}

// Add hotel furniture
function addHotelFurniture() {
    // Add a bed
    const bedBaseGeometry = new THREE.BoxGeometry(2, 0.3, 1.8);
    const bedBaseMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513, // Brown
        roughness: 0.8,
        metalness: 0.2
    });
    const bedBase = new THREE.Mesh(bedBaseGeometry, bedBaseMaterial);
    bedBase.position.set(0, 0.15, -1);
    bedBase.castShadow = true;
    bedBase.receiveShadow = true;
    room.add(bedBase);

    // Add mattress
    const mattressGeometry = new THREE.BoxGeometry(1.9, 0.2, 1.7);
    const mattressMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        metalness: 0.1
    });
    const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
    mattress.position.set(0, 0.4, -1);
    mattress.castShadow = true;
    mattress.receiveShadow = true;
    room.add(mattress);

    // Add a nightstand
    const nightstandGeometry = new THREE.BoxGeometry(0.6, 0.5, 0.6);
    const nightstandMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513, // Brown
        roughness: 0.8,
        metalness: 0.2
    });
    const nightstand = new THREE.Mesh(nightstandGeometry, nightstandMaterial);
    nightstand.position.set(1.5, 0.25, -1.5);
    nightstand.castShadow = true;
    nightstand.receiveShadow = true;
    room.add(nightstand);

    // Add a lamp on the nightstand
    const lampBaseGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.5, 16);
    const lampBaseMaterial = new THREE.MeshStandardMaterial({
        color: 0xd4af37, // Gold
        roughness: 0.5,
        metalness: 0.8
    });
    const lampBase = new THREE.Mesh(lampBaseGeometry, lampBaseMaterial);
    lampBase.position.set(1.5, 0.75, -1.5);
    lampBase.castShadow = true;
    lampBase.receiveShadow = true;
    room.add(lampBase);

    // Add a lamp shade
    const lampShadeGeometry = new THREE.ConeGeometry(0.2, 0.3, 16, 1, true);
    const lampShadeMaterial = new THREE.MeshStandardMaterial({
        color: 0xfffacd, // Light yellow
        roughness: 0.5,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    const lampShade = new THREE.Mesh(lampShadeGeometry, lampShadeMaterial);
    lampShade.position.set(1.5, 1.1, -1.5);
    lampShade.castShadow = true;
    lampShade.receiveShadow = true;
    room.add(lampShade);

    // Add a small light at the lamp position
    const lampLight = new THREE.PointLight(0xfffacd, 0.5, 3);
    lampLight.position.set(1.5, 1.1, -1.5);
    room.add(lampLight);

    console.log("Hotel furniture added");
}

// Function to create a selection indicator for a surface
function clearExistingRoom() {
    // Check if scene exists
    if (!scene) {
        console.error("Scene is undefined in clearExistingRoom");
        return;
    }

    // Remove all indicators first
    removeAllIndicators();

    // Check if room exists
    if (room) {
        while (room.children.length > 0) {
            const object = room.children[0];
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
            room.remove(object);
        }
        scene.remove(room);
    }

    // Create a new room group
    room = new THREE.Group();
    scene.add(room);
}


// Function to restore original textures
function restoreOriginalTextures() {
    console.log('Restoring original textures');
    
    // FIRST: Clear all fixture selections and highlights
    clearFixtureSelection();
    
    // Traverse the room to find all objects with applied textures
    room.traverse(object => {
        if (object.userData && object.userData.originalMaterial) {
            // Restore the original material
            object.material = object.userData.originalMaterial.clone();
            console.log(`Restored original material for ${object.userData.name || 'unnamed object'}`);
        }
    });
    
    // Traverse the room to find all fixtures
    room.traverse(object => {
        if (object.userData && object.userData.isFixture) {
            // Show the original fixture if it was hidden
            object.visible = true;
            
            // Remove any replacement if it exists
            if (object.userData.replacement) {
                // Clear highlights from replacement before removing
                if (object.userData.replacement.userData && object.userData.replacement.userData.highlight) {
                    scene.remove(object.userData.replacement.userData.highlight);
                }
                // Clear highlights from replacement children
                object.userData.replacement.traverse(child => {
                    if (child.userData && child.userData.highlight) {
                        scene.remove(child.userData.highlight);
                    }
                });
                
                room.remove(object.userData.replacement);
                object.userData.replacement = null;
                console.log(`Removed replacement for ${object.userData.originalName || 'fixture'}`);
            }
            
            // Clear any remaining highlights from original fixture
            if (object.userData.highlight) {
                scene.remove(object.userData.highlight);
                object.userData.highlight = null;
            }
        }
    });
    
    // Final cleanup: Remove any remaining highlight objects
    const remainingHighlights = [];
    scene.traverse(object => {
        if (object.userData && object.userData.isHighlight) {
            remainingHighlights.push(object);
        }
    });
    
    remainingHighlights.forEach(highlight => {
        scene.remove(highlight);
    });
    
    console.log(`Removed ${remainingHighlights.length} remaining highlights`);
    
    // Show success message
    showSuccessMessage('Original textures and accessories restored');
}

// Function to reset camera to initial position
function resetCamera() {
    console.log('Resetting camera position');

    // Use hardcoded values based on room type
    switch (currentRoomType) {
        case 'bathroom':
            camera.position.set(0, 1, 2);
            controls.target.set(0, 1, 0);
            break;

        case 'kitchen':
            camera.position.set(4, 1.6, 5);
            controls.target.set(4, 2, -3);
            break;

        case 'living':
            camera.position.set(1, 1.4, 1);
            controls.target.set(-1, 1, -0.5);
            break;

        case 'bedroom':
            camera.position.set(0, 1.6, 3);
            controls.target.set(0, 1.0, -1.0);
            break;

        case 'hotel':
            camera.position.set(0, 1.6, 3.5);
            controls.target.set(0, 1.2, 0);
            break;

        default:
            camera.position.set(0, 1.6, 4);
            controls.target.set(0, 1, 0);
            break;
    }
    // Update controls
    controls.update();

    // Show success message
    showSuccessMessage('Camera position reset');
}

// Add UI buttons for restore and reset camera
function addControlButtons() {
    const container = document.getElementById('threed-visualizer-container');
    if (!container) return;

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'control-buttons';
    buttonContainer.style.position = 'absolute';
    buttonContainer.style.bottom = '10px';
    buttonContainer.style.left = '10px';
    buttonContainer.style.zIndex = '1000';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';

    // Create restore button
    const restoreButton = document.createElement('button');
    restoreButton.className = 'btn btn-warning';
    restoreButton.innerHTML = '<i class="fas fa-undo-alt mr-2"></i> Restore';
    restoreButton.onclick = restoreOriginalTextures;

    // Create reset camera button
    const resetCameraButton = document.createElement('button');
    resetCameraButton.className = 'btn btn-dark';
    resetCameraButton.innerHTML = '<i class="fas fa-video mr-2"></i> Reset';
    resetCameraButton.onclick = resetCamera;
    
    // Create showcase button (initially hidden)
    const showcaseButton = document.createElement('button');
    showcaseButton.id = 'showcase-button';
    showcaseButton.className = 'btn btn-info';
    showcaseButton.innerHTML = '<i class="fas fa-search-plus mr-2"></i> Preview';
    showcaseButton.style.display = 'none';
    showcaseButton.onclick = () => {
        if (selectedFixture) {
            openShowcase(selectedFixture);
        }
    };

    // Add buttons to container
    buttonContainer.appendChild(restoreButton);
    buttonContainer.appendChild(resetCameraButton);
    buttonContainer.appendChild(showcaseButton);

    // Add container to the visualizer
    container.appendChild(buttonContainer);
}

// Add this function to debug the scene
function debugScene() {
    console.log('--- SCENE DEBUG ---');
    console.log('Room children:', room.children.map(child => ({
        name: child.userData.name,
        type: child.userData.type,
        isSelectable: child.userData.isSelectable,
        position: child.position
    })));

    console.log('Indicators:', scene.children.filter(obj =>
        obj.userData && obj.userData.isIndicator
    ).map(indicator => ({
        targetSurface: indicator.userData.targetSurface?.userData.name,
        position: indicator.position,
        visible: indicator.visible
    })));

    console.log('Selected surfaces:', selectedSurfaces);
}

// Call this after creating the bathroom
// function initDebugControls() {
//     // Add a debug button to the UI
//     const debugButton = document.createElement('button');
//     debugButton.textContent = 'Debug Scene';
//     debugButton.className = 'btn btn-sm btn-info mt-2';
//     debugButton.style.position = 'absolute';
//     debugButton.style.bottom = '10px';
//     debugButton.style.right = '10px';
//     debugButton.style.zIndex = '1000';
//     debugButton.onclick = debugScene;

//     const container = document.getElementById('threed-visualizer-container');
//     if (container) {
//         container.appendChild(debugButton);
//     }
// }

// Better lighting
function setupPBRLighting() {
    // Clear existing lights
    scene.children.forEach(child => {
        if (child.isLight) {
            scene.remove(child);
        }
    });

    // Set scene background to light color
    scene.background = new THREE.Color(0xf0f0f0);

    // Add ambient light - more balanced
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15); // Reduced intensity
    scene.add(ambientLight);

    // Add main directional light (like sunlight)
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.1); // Reduced intensity
    mainLight.position.set(2, 8, 5); // Adjusted position
    mainLight.castShadow = true;

    // Configure shadow properties
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.bias = -0.0001;
    mainLight.shadow.radius = 5; // Add blur to shadows

    // Set up shadow camera to cover the scene
    const d = 10;
    mainLight.shadow.camera.left = -d;
    mainLight.shadow.camera.right = d;
    mainLight.shadow.camera.top = d;
    mainLight.shadow.camera.bottom = -d;

    scene.add(mainLight);

    // Add more balanced fill lights
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.5); // Front fill
    fillLight1.position.set(0, 5, 8);
    scene.add(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.5); // Left fill
    fillLight2.position.set(-8, 5, 0);
    scene.add(fillLight2);

    const fillLight3 = new THREE.DirectionalLight(0xffffff, 0.5); // Right fill
    fillLight3.position.set(8, 5, 0);
    scene.add(fillLight3);

    // Add a soft light from below to reduce harsh shadows
    const bottomLight = new THREE.DirectionalLight(0xffffff, 0.2);
    bottomLight.position.set(0, -5, 0);
    scene.add(bottomLight);

    console.log('PBR lighting setup complete with balanced lighting');
}

// Add this function to enable shadows without changing materials
function enableShadows(model) {
    model.traverse(function (child) {
        if (child.isMesh) {
            // Enable shadows
            child.castShadow = true;
            child.receiveShadow = true;

            // Store original material for later restoration
            child.userData.originalMaterial = child.material.clone();
        }
    });
}

function tryAlternativeModel() {
    console.log('Trying to load alternative model format');

    // Try loading an OBJ model instead
    const objLoader = new THREE.OBJLoader();

    objLoader.load(
        '/static/3drooms/Bathroom/bathroom-simple.obj',
        function (object) {
            console.log('Loaded OBJ model:', object);

            // Apply materials
            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0xffffff,
                        roughness: 0.7,
                        metalness: 0.1
                    });
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Add to scene
            room.add(object);

            // Process the model
            identifySurfaces(object);

            // Adjust camera
            camera.position.set(0, 1.6, 4);
            controls.target.set(0, 1, 0);
            controls.update();
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('Error loading OBJ model:', error);
            // Fall back to creating a simple bathroom
            createSimpleBathroom();
        }
    );
}

// Add this function to fix texture format issues
function fixTextureFormats(gltf) {
    // Check if gltf is valid
    if (!gltf || !gltf.scene) {
        console.error("Invalid GLTF model passed to fixTextureFormats");
        return gltf;
    }

    gltf.scene.traverse(function (child) {
        if (child.isMesh) {
            // Handle material and texture issues
            if (child.material) {
                // Fix material settings
                child.material.needsUpdate = true;

                // Fix texture format issues
                if (child.material.map) {
                    child.material.map.format = THREE.RGBAFormat;
                    child.material.map.type = THREE.UnsignedByteType;
                    child.material.map.encoding = THREE.sRGBEncoding;
                    child.material.map.minFilter = THREE.LinearFilter;
                    child.material.map.magFilter = THREE.LinearFilter;
                    child.material.map.generateMipmaps = false; // Disable mipmaps to avoid errors
                    child.material.map.needsUpdate = true;
                }

                // Fix other texture types if they exist
                const textureTypes = ['normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'];
                textureTypes.forEach(texType => {
                    if (child.material[texType]) {
                        child.material[texType].minFilter = THREE.LinearFilter;
                        child.material[texType].magFilter = THREE.LinearFilter;
                        child.material[texType].generateMipmaps = false;
                        child.material[texType].needsUpdate = true;
                    }
                });
            }
        }
    });

    return gltf;
}

function applyDefaultMaterials(model) {
    // Create some basic materials
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,  // Off-white for walls
        roughness: 0.7,
        metalness: 0.1
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xe0e0e0,  // Light gray for floor
        roughness: 0.8,
        metalness: 0.1
    });

    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,  // White for ceiling
        roughness: 0.6,
        metalness: 0.1
    });

    const fixtureMaterial = new THREE.MeshStandardMaterial({
        color: 0xfafafa,  // White for fixtures
        roughness: 0.3,
        metalness: 0.2
    });

    // Apply materials based on position or name
    model.traverse(function (child) {
        if (child.isMesh) {
            // Store original material
            child.userData.originalMaterial = child.material.clone();

            // Get position to help determine what kind of object this is
            const position = new THREE.Vector3();
            child.getWorldPosition(position);

            // Get bounding box to determine size
            const bbox = new THREE.Box3().setFromObject(child);
            const size = new THREE.Vector3();
            bbox.getSize(size);

            const name = child.name.toLowerCase();

            // Apply materials based on name or position
            if (name.includes('floor') || position.y < 0.1) {
                child.material = floorMaterial.clone();
            } else if (name.includes('ceiling') || position.y > 2.5) {
                child.material = ceilingMaterial.clone();
            } else if (name.includes('wall') ||
                (size.y > 2 && (Math.abs(position.x) > 1.5 || Math.abs(position.z) > 1.5))) {
                child.material = wallMaterial.clone();
            } else {
                // Assume it's a fixture
                child.material = fixtureMaterial.clone();
            }

            // Enable shadows
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // Enhance lighting to better show the model
    // enhanceLighting();
}

function enhanceLighting() {
    // Remove existing lights
    scene.children.forEach(child => {
        if (child.isLight) {
            scene.remove(child);
        }
    });

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light (like sunlight)
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.7);
    mainLight.position.set(5, 10, 7.5);
    mainLight.castShadow = true;

    // Improve shadow quality
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.bias = -0.001;

    scene.add(mainLight);

    // Add some fill lights
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight1.position.set(-5, 8, -5);
    scene.add(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight2.position.set(5, 7, -8);
    scene.add(fillLight2);
}

// NEW: Enable material filtering based on identified surfaces
function enableSurfaceBasedMaterialFiltering(surfaces) {
    const surfaceTypes = [...new Set(surfaces.map(s => s.userData.type))];
    console.log('Available surface types in custom room:', surfaceTypes);
    
    // You can use this to show/hide material categories
    // For example, if no floors are found, hide flooring materials
    const hasFloors = surfaceTypes.includes('floor');
    const hasWalls = surfaceTypes.includes('wall');
    const hasCeiling = surfaceTypes.includes('ceiling');
    
    // Store this info for material filtering
    window.customRoomSurfaceTypes = surfaceTypes;
}

// NEW: Add click handlers specifically for custom rooms
function addCustomRoomClickHandlers() {
    // This ensures custom rooms have the same click functionality as default rooms
    if (typeof addSurfaceClickHandlers === 'function') {
        addSurfaceClickHandlers();
    }
}

// Function to identify surfaces in the loaded model
function identifySurfaces(model) {
    console.log('Identifying surfaces in model by name');

    // Check if model is valid
    if (!model) {
        console.error("Invalid model passed to identifySurfaces");
        return;
    }

    // Remove all existing indicators
    removeAllIndicators();

    // Define the surface names to look for and their types
    const surfaceMapping = {
        'Floor': { type: 'floor', id: 'floor' },
        'Ceiling': { type: 'ceiling', id: 'ceiling' },
        'Wall-Left': { type: 'wall', id: 'leftWall' },
        'Wall-Right': { type: 'wall', id: 'rightWall' },
        'Wall-Front': { type: 'wall', id: 'frontWall' },
        'Wall-Back': { type: 'wall', id: 'backWall' }
    };

    const foundSurfaces = [];

    // Look for objects with specific names
    try {
        model.traverse(function (child) {
            if (child.isMesh) {
                // Check if the mesh name matches any of our surface names
                for (const [surfaceName, surfaceInfo] of Object.entries(surfaceMapping)) {
                    // Use includes instead of exact match to be more flexible
                    if (child.name.includes(surfaceName)) {
                        // Make sure the material is set up for proper interaction
                        if (child.material) {
                            // Enable double-sided rendering for walls
                            if (surfaceInfo.type === 'wall') {
                                child.material.side = THREE.DoubleSide;
                            }
                            child.material.needsUpdate = true;
                        }

                        // Set up the userData for this surface
                        child.userData = {
                            ...child.userData,
                            id: surfaceInfo.id,
                            name: surfaceName,
                            type: surfaceInfo.type,
                            isSelectable: true
                        };

                        // Enable shadows
                        child.castShadow = true;
                        child.receiveShadow = true;

                        foundSurfaces.push(child);
                        break;
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error traversing model:", error);
        return;
    }

    console.log(`Identified ${foundSurfaces.length} surfaces by name:`,
        foundSurfaces.map(s => s.userData.name));

    // Add selection indicators to all identified surfaces
    foundSurfaces.forEach(surface => {
        createSelectionIndicator(surface);
        addHighlightEffect(surface);
    });

    // If we didn't find any surfaces, fall back to the position-based detection
    if (foundSurfaces.length === 0) {
        console.log('No surfaces found by name, falling back to position-based detection');
        identifySurfacesByPosition(model);
    }
    // ENHANCED: Update indicators to face camera and enable material filtering
    setTimeout(() => {
        updateIndicatorsToFaceCamera();
        
        // Enable material filtering based on identified surfaces
        if (foundSurfaces.length > 0) {
            console.log('Custom room surfaces identified, enabling material filtering');
            // You can add logic here to show/hide material categories based on available surfaces
            enableSurfaceBasedMaterialFiltering(foundSurfaces);
        }
    }, 100);

    // ENHANCED: Add click handlers for custom room surfaces
    addCustomRoomClickHandlers();
}

// Function to safely remove all indicators from the scene
function removeAllIndicators() {
    if (!scene) {
        console.error("Scene is undefined when trying to remove indicators");
        return;
    }

    // First, collect all indicators in an array
    const indicatorsToRemove = [];
    scene.traverse(object => {
        if (object.userData && object.userData.isIndicator) {
            indicatorsToRemove.push(object);
        }
    });

    // Then remove them all at once after traversal is complete
    indicatorsToRemove.forEach(indicator => {
        scene.remove(indicator);
    });

    console.log(`Removed ${indicatorsToRemove.length} indicators from scene`);
}


// Fallback function to identify surfaces by their position and orientation
function identifySurfacesByPosition(model) {
    const createdSurfaces = [];
    const bbox = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Traverse the model to find large flat surfaces
    model.traverse(function (child) {
        if (child.isMesh) {
            // Get the bounding box of this mesh
            const meshBbox = new THREE.Box3().setFromObject(child);
            const meshSize = new THREE.Vector3();
            meshBbox.getSize(meshSize);

            // Check if this is a large flat surface
            const isLarge = (meshSize.x > size.x * 0.4 && meshSize.z > size.z * 0.4) ||
                (meshSize.x > size.x * 0.4 && meshSize.y > size.y * 0.4) ||
                (meshSize.y > size.y * 0.4 && meshSize.z > size.z * 0.4);

            if (isLarge) {
                // Get the world position
                const position = new THREE.Vector3();
                child.getWorldPosition(position);

                // Determine surface type by position
                let surfaceType = '';
                let surfaceName = '';

                // Check if it's near the bottom (floor)
                if (Math.abs(position.y - bbox.min.y) < size.y * 0.2) {
                    surfaceType = 'floor';
                    surfaceName = 'Floor';
                }
                // Check if it's near the top (ceiling)
                else if (Math.abs(position.y - bbox.max.y) < size.y * 0.2) {
                    surfaceType = 'ceiling';
                    surfaceName = 'Ceiling';
                }
                // Otherwise it's probably a wall
                else {
                    surfaceType = 'wall';

                    // Determine which wall by position
                    if (Math.abs(position.x - bbox.min.x) < size.x * 0.2) {
                        surfaceName = 'Left Wall';
                    } else if (Math.abs(position.x - bbox.max.x) < size.x * 0.2) {
                        surfaceName = 'Right Wall';
                    } else if (Math.abs(position.z - bbox.min.z) < size.z * 0.2) {
                        surfaceName = 'Back Wall';
                    } else if (Math.abs(position.z - bbox.max.z) < size.z * 0.2) {
                        surfaceName = 'Front Wall';
                    } else {
                        // Skip if we can't determine which wall it is
                        return;
                    }
                }

                console.log(`Identified surface by position: ${surfaceName} (${surfaceType})`);

                // Add metadata to the mesh
                child.userData = {
                    id: surfaceName.toLowerCase().replace(' ', ''),
                    name: surfaceName,
                    type: surfaceType,
                    isSelectable: true,
                    originalMaterial: child.material.clone()
                };

                // Make the material cloneable
                if (!child.material.isMaterial) {
                    child.material = Array.isArray(child.material)
                        ? child.material.map(m => m.clone())
                        : child.material.clone();
                }

                // Enable shadows
                child.receiveShadow = true;

                // Add to created surfaces
                createdSurfaces.push(child);
            }
        }
    });

    // Add selection indicators to the identified surfaces
    createdSurfaces.forEach(surface => {
        createSelectionIndicator(surface);
    });
}

// Function to add selection indicators to surfaces
function addSelectionIndicators() {
    // Find all selectable surfaces
    const selectableSurfaces = [];
    room.traverse(object => {
        if (object.userData && object.userData.isSelectable) {
            selectableSurfaces.push(object);
        }
    });

    // Create indicators for each surface
    selectableSurfaces.forEach(surface => {
        createSelectionIndicator(surface);
    });
}

// Function to create a selection indicator for a surface
function createSelectionIndicator(surface) {
    // Create a more visible indicator
    const geometry = new THREE.SphereGeometry(0.08, 16, 16);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.9
    });

    const indicator = new THREE.Mesh(geometry, material);

    // Calculate the center position of the surface
    const boundingBox = new THREE.Box3().setFromObject(surface);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    // Set the indicator position to the center of the surface
    indicator.position.copy(center);

    // Move the indicator slightly in front of the surface based on its type
    if (surface.userData.type === 'floor') {
        indicator.position.y += 0.1; // Move up from floor
    } else if (surface.userData.type === 'ceiling') {
        indicator.position.y -= 0.1; // Move down from ceiling
    } else if (surface.userData.type === 'wall') {
        // For walls, move perpendicular to the wall
        // Get the normal vector of the wall
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(surface.quaternion);
        normal.multiplyScalar(0.1);
        indicator.position.add(normal);
    }

    // Make sure the indicator is visible
    indicator.visible = true;
    indicator.renderOrder = 999; // Ensure it renders on top

    // Add userData to identify it as an indicator
    indicator.userData = {
        isIndicator: true,
        targetSurface: surface,
        surfaceId: surface.userData.id
    };

    // Store reference to the indicator in the surface's userData
    surface.userData.indicator = indicator;

    // Add the indicator to the scene (not to the room group)
    scene.add(indicator);

    console.log(`Created indicator for ${surface.userData.name} at position:`, indicator.position);

    return indicator;
}

//  onMouseClick function with better detection
function onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);

    // Get all intersected objects
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
        console.log('Clicked on:', intersects.length, 'objects');
        
        // First, check if we clicked on a fixture
        for (let i = 0; i < intersects.length; i++) {
            const object = intersects[i].object;
            
            console.log(`Checking object ${i} for fixture:`, {
                name: object.name || 'NO_NAME',
                userData: object.userData,
                isFixture: object.userData?.isFixture
            });
            
            // Skip highlights and helpers
            if (object.userData && (object.userData.isHighlight || object.userData.isHelper)) {
                console.log('Skipping highlight/helper object');
                continue;
            }
            
            // Check if it's a fixture or fixture component
            if (object.userData && (object.userData.isFixture || object.userData.isFixtureComponent)) {
            console.log('Found fixture component!', {
                name: object.userData.originalName,
                groupId: object.userData.fixtureGroupId,
                groupRoot: object.userData.groupRoot ? object.userData.groupRoot.name : 'none'
            });
            
            // If object has a group root, validate it's a proper fixture group
            let targetForSelection = object;
            if (object.userData.groupRoot) {
                const groupRoot = object.userData.groupRoot;
                const groupName = (groupRoot.name || '').toLowerCase();
                
                // Validate this is actually a fixture group, not the scene collection
                const isValidFixtureGroup = (groupName.includes('group') || 
                                        groupName.includes('toilet') || 
                                        groupName.includes('sink') || 
                                        groupName.includes('bath') || 
                                        groupName.includes('shower')) &&
                                        groupRoot.children.length < 20; // Reasonable group size
                
                if (isValidFixtureGroup) {
                    targetForSelection = groupRoot;
                    
                    // Ensure the group root has proper fixture data
                    if (!targetForSelection.userData || !targetForSelection.userData.isFixture) {
                        targetForSelection.userData = {
                            ...object.userData,
                            isFixture: true,
                            originalName: targetForSelection.name || object.userData.originalName,
                            isGroupRoot: true
                        };
                    }
                    console.log(`Selecting valid fixture group: ${targetForSelection.name || 'unnamed group'} (${groupRoot.children.length} children)`);
                } else {
                    console.log(`Invalid group detected (${groupRoot.children.length} children), selecting individual object: ${object.userData.originalName}`);
                    // Fall back to individual selection
                }
            } else {
                console.log(`Selecting individual fixture: ${object.userData.originalName}`);
            }
            
            selectFixture(targetForSelection);
            return; // Exit early - fixture selection takes priority
        }
        }
        
        console.log('No fixtures found, checking for surfaces/walls...');
        
        // If no fixture was clicked, check for surface selection (walls, floor, ceiling)
        // First check for indicators
        const indicatorIntersects = raycaster.intersectObjects(
            scene.children.filter(obj => obj.userData && obj.userData.isIndicator),
            false
        );

        if (indicatorIntersects.length > 0) {
            const indicator = indicatorIntersects[0].object;
            const targetSurface = indicator.userData.targetSurface;

            console.log('Clicked on indicator for surface:', targetSurface.userData.name);

            if (targetSurface) {
                // Clear any fixture selection when selecting surfaces
                clearFixtureSelection();
                
                // Switch back to materials tab
                switchToMaterialsTab();
                
                toggleSurfaceSelection(targetSurface);
                return;
            }
        }

        // If no indicator was clicked, check for direct surface clicks
        const surfaceIntersects = raycaster.intersectObjects(room.children, true);

        for (let i = 0; i < surfaceIntersects.length; i++) {
            const object = surfaceIntersects[i].object;

            // Skip if it's not a selectable surface or if it's a fixture
            if (!object.userData || !object.userData.isSelectable || object.userData.isFixture) {
                continue;
            }

            console.log('Clicked directly on surface:', object.userData.name);
            
            // Clear any fixture selection when selecting surfaces
            clearFixtureSelection();
            
            // Switch back to materials tab
            switchToMaterialsTab();
            
            toggleSurfaceSelection(object);
            return;
        }
        
        console.log('No selectable surfaces or fixtures found');
    }
}

// Function to switch back to materials tab
function switchToMaterialsTab() {
    console.log('Switching back to materials tab');
    
    // Find the first material type button (tiles, ceramics, etc.) and click it
    const materialTab = document.querySelector('.material-type-btn:not([data-category="3d-accessories"])');
    if (materialTab) {
        materialTab.click();
        console.log('Switched to materials tab');
    }
}


// Add this function to make the indicators face the camera
function updateIndicatorsToFaceCamera() {
    scene.traverse(object => {
        if (object.userData && object.userData.isIndicator) {
            // Make the indicator look at the camera
            object.lookAt(camera.position);

            // If it has a label, make that face the camera too
            if (object.userData.label) {
                object.userData.label.lookAt(camera.position);
            }
        }
    });
}


function createSurface(surfaceData) {
    // Create geometry based on dimensions
    const geometry = new THREE.PlaneGeometry(surfaceData.width, surfaceData.height);

    // Create material with a different color for each surface type
    let color;
    switch (surfaceData.type) {
        case 'floor':
            color = 0xcccccc; // Gray
            break;
        case 'ceiling':
            color = 0xffffff; // White
            break;
        case 'wall':
            color = 0xf5f5f5; // Light gray
            break;
        default:
            color = 0xffffff;
    }

    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.1
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);

    // Set position and rotation
    mesh.position.set(...surfaceData.position);
    mesh.rotation.set(...surfaceData.rotation);

    // Enable shadows
    mesh.receiveShadow = true;

    // Add metadata to the mesh
    mesh.userData = {
        id: surfaceData.id,
        name: surfaceData.name,
        type: surfaceData.type,
        isSelectable: true
    };

    // Add to room
    room.add(mesh);

    // Add a highlight effect for hover
    addHighlightEffect(mesh);

    // Log the surface creation for debugging
    console.log(`Created surface: ${surfaceData.name} at position:`, mesh.position.toArray());

    return mesh;
}

function addHighlightEffect(mesh) {
    // Create an EdgesGeometry to highlight only the edges
    const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,  // Red color
        linewidth: 2      // Line width (note: this may not work in all browsers)
    });

    const highlight = new THREE.LineSegments(edgesGeometry, edgesMaterial);

    // Copy position, rotation, and scale from the original mesh
    highlight.position.copy(mesh.position);
    highlight.rotation.copy(mesh.rotation);
    highlight.scale.copy(mesh.scale);

    // Scale slightly to avoid z-fighting
    highlight.scale.multiplyScalar(1.01);

    // Make it invisible by default
    highlight.visible = false;
    highlight.userData = { isHighlight: true, targetMesh: mesh };
    highlight.renderOrder = 999; // Ensure it renders on top

    // Add to room
    room.add(highlight);

    // Store reference to highlight in the original mesh
    mesh.userData.highlight = highlight;
}

function addBathroomFixtures() {
    // Add a simple bathtub
    const bathtubGeometry = new THREE.BoxGeometry(1.5, 0.6, 0.8);
    const bathtubMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.2
    });
    const bathtub = new THREE.Mesh(bathtubGeometry, bathtubMaterial);
    bathtub.position.set(-1, 0.3, -1.2);
    bathtub.castShadow = true;
    bathtub.receiveShadow = true;
    room.add(bathtub);

    // Add a sink
    const sinkGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32);
    const sinkMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.2
    });
    const sink = new THREE.Mesh(sinkGeometry, sinkMaterial);
    sink.position.set(1.2, 0.8, -1.7);
    sink.castShadow = true;
    sink.receiveShadow = true;
    room.add(sink);

    // Add a sink counter
    const counterGeometry = new THREE.BoxGeometry(1, 0.1, 0.6);
    const counterMaterial = new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        roughness: 0.5,
        metalness: 0.1
    });
    const counter = new THREE.Mesh(counterGeometry, counterMaterial);
    counter.position.set(1.2, 0.75, -1.7);
    counter.castShadow = true;
    counter.receiveShadow = true;
    room.add(counter);

    // Add a toilet
    const toiletBaseGeometry = new THREE.BoxGeometry(0.5, 0.4, 0.6);
    const toiletMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.1
    });
    const toiletBase = new THREE.Mesh(toiletBaseGeometry, toiletMaterial);
    toiletBase.position.set(1.5, 0.2, -0.5);
    toiletBase.castShadow = true;
    toiletBase.receiveShadow = true;
    room.add(toiletBase);

    const toiletTankGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.2);
    const toiletTank = new THREE.Mesh(toiletTankGeometry, toiletMaterial);
    toiletTank.position.set(1.5, 0.5, -0.7);
    toiletTank.castShadow = true;
    toiletTank.receiveShadow = true;
    room.add(toiletTank);
}

// Update the toggleSurfaceSelection function to only work with indicators
function toggleSurfaceSelection(surface) {
    if (!surface.userData || !surface.userData.isSelectable) {
        return;
    }

    const surfaceId = surface.userData.id;
    const surfaceName = surface.userData.name;
    const surfaceType = surface.userData.type;

    // Check if this surface is already selected
    const index = selectedSurfaces.findIndex(s => s.id === surfaceId);

    if (index === -1) {
        // Find all surfaces with the same name
        const matchingSurfaces = [];
        room.traverse(object => {
            if (object.isMesh && 
                object.userData && 
                object.userData.isSelectable && 
                object.userData.name === surfaceName &&
                !object.userData.isHighlight) {
                matchingSurfaces.push(object);
            }
        });
        
        console.log(`Found ${matchingSurfaces.length} surfaces named "${surfaceName}"`);
        
        // Clear existing selection with the same name to avoid duplicates
        selectedSurfaces = selectedSurfaces.filter(s => s.name !== surfaceName);
        
        // Add all matching surfaces to selected surfaces
        matchingSurfaces.forEach(matchingSurface => {
            // Add to selected surfaces
            selectedSurfaces.push({
                id: matchingSurface.userData.id || `${surfaceName}-${selectedSurfaces.length}`,
                name: matchingSurface.userData.name,
                type: matchingSurface.userData.type,
                object: matchingSurface
            });

            // Show the highlight
            if (matchingSurface.userData.highlight) {
                matchingSurface.userData.highlight.visible = true;
            }

            // Change indicator color to indicate selection
            if (matchingSurface.userData.indicator) {
                matchingSurface.userData.indicator.material.color.set(0xff0000); // Red for selected
            }
        });

        console.log(`Selected ${matchingSurfaces.length} surfaces named: ${surfaceName}`);
        console.log('Current selection:', selectedSurfaces);
    } else {
        // Find all surfaces with the same name
        const matchingSurfaces = [];
        room.traverse(object => {
            if (object.isMesh && 
                object.userData && 
                object.userData.isSelectable && 
                object.userData.name === surfaceName) {
                matchingSurfaces.push(object);
            }
        });
        
        // Remove all matching surfaces from selected surfaces
        selectedSurfaces = selectedSurfaces.filter(s => s.name !== surfaceName);
        
        // Reset highlights and indicators
        matchingSurfaces.forEach(matchingSurface => {
            // Reset highlight
            if (matchingSurface.userData.highlight) {
                matchingSurface.userData.highlight.visible = false;
            }

            // Reset indicator color
            if (matchingSurface.userData.indicator) {
                matchingSurface.userData.indicator.material.color.set(0x00ff00); // Green for unselected
            }
        });

        console.log(`Deselected ${matchingSurfaces.length} surfaces named: ${surfaceName}`);
    }

    // Update the UI
    updateSelectedSurfacesUI();

    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent('surfaceSelectionChanged', {
        detail: { selectedSurfaces: selectedSurfaces }
    }));
}

function updateSelectedSurfacesUI() {
    // Find or create the selected surfaces list container
    let listContainer = document.getElementById('selected-surfaces-list');

    if (!listContainer) {
        // Create the container if it doesn't exist
        const container = document.createElement('div');
        container.className = 'selected-surfaces-container mt-3';
        container.innerHTML = `
        <h5>Selected Surfaces</h5>
        <div id="selected-surfaces-list" class="selected-surfaces-list"></div>
      `;

        // Find the 3D visualizer container and append this container
        const visualizerContainer = document.getElementById('threed-visualizer');
        if (visualizerContainer) {
            visualizerContainer.appendChild(container);
            listContainer = document.getElementById('selected-surfaces-list');
        }
    }

    // Update the list if we found/created the container
    if (listContainer) {
        if (selectedSurfaces.length === 0) {
            listContainer.innerHTML = '<p class="text-muted">No surfaces selected. Click on a surface to select it.</p>';
        } else {
            listContainer.innerHTML = '';

            // Create a badge for each selected surface
            selectedSurfaces.forEach(surface => {
                const badge = document.createElement('span');
                badge.className = 'badge bg-primary me-2 mb-2';
                badge.innerHTML = `
            ${surface.name}
            <button type="button" class="btn-close btn-close-white ms-1" aria-label="Remove" 
              style="font-size: 0.5rem;" onclick="removeSurface('${surface.id}')"></button>
          `;
                listContainer.appendChild(badge);
            });

            // Add a clear all button if multiple surfaces are selected
            if (selectedSurfaces.length > 1) {
                const clearButton = document.createElement('button');
                clearButton.className = 'btn btn-sm btn-outline-danger ms-2';
                clearButton.textContent = 'Clear All';
                clearButton.onclick = clearAllSurfaces;
                listContainer.appendChild(clearButton);
            }
        }
    }
}

// Function to remove a surface (called from the UI)
window.removeSurface = function (surfaceId) {
    const index = selectedSurfaces.findIndex(s => s.id === surfaceId);

    if (index !== -1) {
        const surface = selectedSurfaces[index];

        if (surface.object) {
            // Hide checkmark
            if (surface.object.userData.selectionCheckmark) {
                surface.object.userData.selectionCheckmark.visible = false;
            }

            // Hide highlight
            if (surface.object.userData.highlight) {
                surface.object.userData.highlight.visible = false;
            }
        }

        // Remove from array
        selectedSurfaces.splice(index, 1);

        // Update UI
        updateSelectedSurfacesUI();

        // Dispatch event
        document.dispatchEvent(new CustomEvent('surfaceSelectionChanged', {
            detail: { selectedSurfaces: selectedSurfaces }
        }));
    }
};

// Function to apply texture to all meshes with the same name
function applyTextureToMatchingMeshes(targetName, texture, materialData) {
    console.log(`Applying texture to all meshes named: ${targetName}`);

    // Keep track of how many meshes were updated
    let updatedCount = 0;

    // Traverse the room to find all meshes with matching names
    room.traverse(object => {
        if (object.isMesh && object.userData && object.userData.name === targetName) {
            // Apply texture to this mesh
            applySurfaceTexture(object, texture, materialData);
            updatedCount++;
        }
    });

    console.log(`Applied texture to ${updatedCount} meshes named "${targetName}"`);
    return updatedCount;
}

// Function for 3D texture selection
function selectTexture3D(imagePath, tileData) {
    console.log("3D Visualizer: Texture selected:", imagePath);
    console.log("Tile data:", tileData);

    // Store the current texture information (shared with 2D visualizer)
    currentTexturePath = imagePath;
    currentTextureName = tileData.name || imagePath.split('/').pop();
    window.selectedTileSpecs = tileData;

    // Apply texture to selected surfaces in 3D
    if (selectedSurfaces.length === 0) {
        alert('Please select at least one surface first by clicking on it in the 3D view.');
        return;
    }

    // Load the texture
    loadTexture(imagePath, function (texture) {
        // Get unique surface names from selected surfaces
        const uniqueNames = [...new Set(selectedSurfaces.map(s => s.name))];
        let totalSurfacesUpdated = 0;
        
        // For each unique name, find all matching meshes and apply texture
        uniqueNames.forEach(name => {
            // Find all meshes with this name in the room
            const matchingMeshes = [];
            room.traverse(object => {
                if (object.isMesh && 
                    object.userData && 
                    object.userData.isSelectable && 
                    object.userData.name === name) {
                    matchingMeshes.push(object);
                }
            });
            
            console.log(`Applying texture to ${matchingMeshes.length} surfaces named "${name}"`);
            
            // Apply texture to each matching mesh
            matchingMeshes.forEach(mesh => {
                applySurfaceTexture(mesh, texture, tileData);
                totalSurfacesUpdated++;
            });
        });

        // Show success message
        showSuccessMessage(`Applied ${tileData.name || 'texture'} to ${totalSurfacesUpdated} surface(s)`);

        // Hide loading indicator
        document.getElementById('texture-loading-indicator').style.display = 'none';
    
        // NEW: Hide the materials panel on mobile
        if (window.innerWidth < 768) {
            const materialsSidebar = document.getElementById('materialsSidebar');
            if (materialsSidebar) {
                materialsSidebar.classList.remove('show');
            }
            
            // Update active button in mobile navigation
            const mobile3DBtn = document.getElementById('mobile3DBtn');
            if (mobile3DBtn) {
                const buttons = document.querySelectorAll('.mobile-nav-bar .btn');
                buttons.forEach(btn => btn.classList.remove('active'));
                mobile3DBtn.classList.add('active');
            }
        }
    });
}

// Function to apply texture to selected surfaces
function applyTextureToSelectedSurfaces(textureUrl, materialData) {
    if (selectedSurfaces.length === 0) {
        alert('Please select at least one surface first by clicking on it in the 3D view.');
        return;
    }

    console.log("Applying texture to selected surfaces:", textureUrl);
    console.log("Material data:", materialData);

    // Load the texture
    loadTexture(textureUrl, function (texture) {
        // Apply to each selected surface
        selectedSurfaces.forEach(surface => {
            applySurfaceTexture(surface.object, texture, materialData);
        });

        // Hide loading indicator
        document.getElementById('texture-loading-indicator').style.display = 'none';

        // Show success message
        showSuccessMessage(`Applied ${materialData.name || 'texture'} to ${selectedSurfaces.length} surface(s)`);
    });

    
}

// Function to load a texture with caching
function loadTexture(url, callback) {
    console.log("Loading texture:", url);

    // Check if texture is already cached
    if (textureCache[url]) {
        console.log("Using cached texture");
        callback(textureCache[url]);
        return;
    }

    // Load the texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";

    textureLoader.load(
        url,
        function (texture) {
            console.log("Texture loaded successfully");

            // Configure texture
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;

            // Cache the texture
            textureCache[url] = texture;

            // Call the callback
            callback(texture);
        },
        undefined,
        function (error) {
            console.error('Error loading texture:', error);
            alert('Failed to load texture. Please try again.');
        }
    );
}

// Function to apply a texture to a surface
function applySurfaceTexture(object, texture, materialData) {
    console.log("Applying texture to surface:", object.userData.name);
    console.log("Material data:", materialData);

    // Create a new material with the texture
    const newMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 2,
        metalness: 0.01,
        side: THREE.DoubleSide, // Ensure both sides are visible
        envMapIntensity: 0.1    // Reduce environment map intensity
    });

    // Set texture repeat based on surface dimensions and material dimensions
    if (materialData) {
        // Get the surface dimensions from the bounding box
        const bbox = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        // Determine which dimensions to use based on object type
        let width, height;

        if (object.userData.type === 'floor' || object.userData.type === 'ceiling') {
            width = size.x;
            height = size.z;
        } else {
            // For walls
            if (size.x > size.z) {
                width = size.x;
                height = size.y;
            } else {
                width = size.z;
                height = size.y;
            }
        }

        console.log(`Surface dimensions: ${width}m x ${height}m`);

        // Calculate how many times to repeat the texture
        let repeatX = 2; // Default
        let repeatY = 2; // Default

        if (materialData.width && materialData.height &&
            materialData.width > 0 && materialData.height > 0) {
            // Assuming material dimensions are in cm and surface dimensions are in meters
            repeatX = width / (materialData.width / 100);
            repeatY = height / (materialData.height / 100);
        } else if (object.userData.type === 'wall') {
            // For walls without material dimensions, use reasonable defaults
            repeatX = width * 0.5;
            repeatY = height * 0.5;
        } else if (object.userData.type === 'floor' || object.userData.type === 'ceiling') {
            // For floors/ceilings without material dimensions
            repeatX = width * 0.5;
            repeatY = height * 0.5;
        }

        console.log(`Setting texture repeat: ${repeatX} x ${repeatY}`);
        texture.repeat.set(repeatX, repeatY);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
    }

    // If we haven't stored the original material yet, do it now
    if (!object.userData.originalMaterial) {
        object.userData.originalMaterial = object.material.clone();
    }

    // Apply the new material
    object.material = newMaterial;

    // Store the material data in the object's userData
    object.userData.materialData = materialData;
}

// Add a resetSurfaceTexture function if you need to restore original materials
function resetSurfaceTexture(object) {
    if (object.userData.originalMaterial) {
        object.material = object.userData.originalMaterial.clone();
        console.log(`Restored original material for ${object.userData.name}`);
    }
}

// Function to show a success message
function showSuccessMessage(message) {
    console.log("Success message:", message);

    // Create or update the message element
    let messageElement = document.getElementById('texture-applied-message');
    const messageElement2 = document.createElement('div');
    let messageContainer = document.getElementById('message-container');

    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'texture-applied-message';
        messageElement.className = 'alert alert-success position-fixed';
        messageElement.style.bottom = '20px';
        messageElement.style.right = '20px';
        messageElement.style.zIndex = '100000';
        messageElement.style.opacity = '0';
        messageElement.style.transition = 'opacity 0.3s ease-in-out';
        document.body.appendChild(messageElement);
    }

    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '50px';
        messageContainer.style.right = '20px';
        messageContainer.style.zIndex = '100000';
        document.body.appendChild(messageContainer);
    }

    // Update message content
    messageElement.textContent = message;

    // Show the message
    setTimeout(() => {
        messageElement.style.opacity = '1';
    }, 10);

    // Hide after 3 seconds
    setTimeout(() => {
        messageElement.style.opacity = '0';
    }, 3000);

    messageElement2.className = 'alert alert-success alert-dismissible fade show';
    messageElement2.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to container
    messageContainer.appendChild(messageElement2);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        messageElement2.classList.remove('show');
        setTimeout(() => {
            messageContainer.removeChild(messageElement2);
        }, 150);
    }, 5000);
}

function showErrorMessage(message) {
    // Create or get the message container
    let messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'message-container';
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '50px';
        messageContainer.style.right = '20px';
        messageContainer.style.zIndex = '100000';
        document.body.appendChild(messageContainer);
    }
    
    // Create the message element
    const messageElement = document.createElement('div');
    messageElement.className = 'alert alert-danger alert-dismissible fade show';
    messageElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to container
    messageContainer.appendChild(messageElement);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        messageElement.classList.remove('show');
        setTimeout(() => {
            messageContainer.removeChild(messageElement);
        }, 150);
    }, 5000);
}


function notifyVisualizerInitialized() {
    console.log('3D Visualizer initialized');
    isVisualizerInitialized = true;
    
    // Call the onVisualizerInitialized callback if it exists
    if (typeof window.onVisualizerInitialized === 'function') {
        window.onVisualizerInitialized();
    }
}

function debugRoomObjects() {
    console.log('=== DEBUGGING ROOM OBJECTS ===');
    if (!room) {
        console.log('No room loaded');
        return;
    }
    
    let objectCount = 0;
    room.traverse(object => {
        if (object.isMesh) {
            objectCount++;
            console.log(`Object ${objectCount}:`, {
                name: object.name || 'NO_NAME',
                type: object.type,
                position: object.position,
                userData: object.userData,
                geometry: object.geometry.type,
                material: object.material.type
            });
        }
    });
    
    console.log(`Total mesh objects found: ${objectCount}`);
    console.log('=== END DEBUG ===');
}



// Expose the selectTexture3D function globally
window.selectTexture3D = selectTexture3D;
window.replaceFixture = replaceFixture;

window.debugRoomObjects = debugRoomObjects;


console.log("3D visualizer loaded, selectTexture3D function available:", typeof window.selectTexture3D === 'function');