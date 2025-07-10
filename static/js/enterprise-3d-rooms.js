// Enterprise 3D Rooms Management
class Enterprise3DRooms {
    constructor() {
        this.currentEnterprise = null;
        this.availableRooms = [];
        this.defaultRooms = [
            {
                id: 'bathroom',
                name: 'Bathroom',
                thumbnail: '/static/3drooms/Bathroom/bathroom.jpg',
                model_path: '/static/3drooms/Bathroom/bathroom.gltf',
                is_default: true
            },
            {
                id: 'kitchen',
                name: 'Kitchen', 
                thumbnail: '/static/3drooms/Kitchen/kitchen.jpg',
                model_path: '/static/3drooms/Kitchen/kitchen.gltf',
                is_default: true
            },
            {
                id: 'living-room',
                name: 'Living Room',
                thumbnail: '/static/3drooms/Living Room/living-room.jpg',
                model_path: '/static/3drooms/Living Room/living-room.gltf',
                is_default: true
            },
            {
                id: 'bedroom',
                name: 'Bedroom',
                thumbnail: '/static/3drooms/Bedroom/bedroom.jpg',
                model_path: '/static/3drooms/Bedroom/bedroom.gltf',
                is_default: true
            }
        ];
        this.init();
    }

    init() {
        console.log('Initializing Enterprise3DRooms...');
        this.detectEnterprise();
        
        // Wait for DOM to be fully ready, then load rooms
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.loadRoomsWhenReady();
            });
        } else {
            this.loadRoomsWhenReady();
        }
        
        this.setupEventListeners();
    }
    
    loadRoomsWhenReady() {
        if (this.currentEnterprise) {
            console.log('Enterprise mode detected, loading enterprise rooms');
            this.loadAvailableRooms();
        } else {
            console.log('Main site mode, keeping default rooms');
            this.isInitialized = true;
        }
    }

    detectEnterprise() {
        // Check if we're on an enterprise subdomain
        const hostname = window.location.hostname;
        console.log('Current hostname:', hostname);
        
        // Check for subdomain pattern
        const parts = hostname.split('.');
        console.log('Hostname parts:', parts);
        
        if (parts.length >= 2) {
            // Check if first part is not 'www' and not 'localhost'
            if (parts[0] !== 'www' && parts[0] !== 'localhost' && hostname !== 'localhost') {
                this.currentEnterprise = parts[0];
                console.log('Enterprise detected:', this.currentEnterprise);
            } else if (hostname === 'localhost' || hostname.includes('localhost')) {
                // For localhost testing, check if there's a subdomain in the host header
                // This would be set by nginx proxy
                this.currentEnterprise = null;
                console.log('Localhost detected - no enterprise');
            }
        }
        
        // Also check body data attributes as fallback
        const userEnterprise = document.body.getAttribute('data-user-enterprise');
        if (userEnterprise && userEnterprise.trim()) {
            this.currentEnterprise = userEnterprise.trim();
            console.log('Enterprise from body attribute:', this.currentEnterprise);
        }
    }

    async loadAvailableRooms() {
        console.log('Loading available rooms for enterprise:', this.currentEnterprise);
        
        try {
            let apiUrl = '/api/enterprise/3d-rooms';
            
            // Add enterprise parameter if we have one
            if (this.currentEnterprise) {
                apiUrl += `?enterprise=${this.currentEnterprise}`;
            }
            
            console.log('Fetching from:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Add host header for enterprise detection
                    ...(this.currentEnterprise && {
                        'X-Enterprise': this.currentEnterprise
                    })
                }
            });
            
            console.log('API response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('API response data:', data);
                
                if (data.rooms && data.rooms.length > 0) {
                    this.availableRooms = data.rooms;
                    console.log('Loaded rooms:', this.availableRooms);
                } else {
                    console.log('No rooms in response, using defaults');
                    this.availableRooms = this.defaultRooms;
                }
            } else {
                console.warn('API request failed with status:', response.status);
                const errorText = await response.text();
                console.warn('Error response:', errorText);
                this.availableRooms = this.defaultRooms;
            }
        } catch (error) {
            console.error('Error loading 3D rooms:', error);
            this.availableRooms = this.defaultRooms;
        }
        
        // Always render the rooms after loading
        this.renderRoomTemplates();
    }

    renderRoomTemplates() {
        console.log('Rendering room templates with rooms:', this.availableRooms);
        
        // Find the room templates container
        const container = document.querySelector('#room-templates-container');
        if (!container) {
            console.error('Room templates container not found');
            return;
        }

        // Clear existing content for enterprise mode
        if (this.currentEnterprise) {
            console.log('Clearing existing room templates for enterprise');
            container.innerHTML = '';
        }

        // Render each room
        this.availableRooms.forEach(room => {
            const roomCard = this.createRoomCard(room);
            container.appendChild(roomCard);
        });

        // Add upload button for enterprise admins
        if (this.currentEnterprise && this.isEnterpriseAdmin()) {
            const uploadCard = this.createUploadCard();
            container.appendChild(uploadCard);
        }
        
        console.log('Room templates rendered successfully');
    }


    createRoomCard(room) {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-4 mb-4';

        // Use the room's model_path for loading, fallback to id for default rooms
        const modelPath = room.model_path || `/static/3drooms/${room.name}/${room.id}.gltf`;
        
        colDiv.innerHTML = `
            <div class="card room-template-card" onclick="enterprise3DRooms.load3DTemplate('${room.id}', '${modelPath}')">
                <div class="card-img-container">
                    <img src="${room.thumbnail_path || room.thumbnail}" class="card-img-top" alt="${room.name}" 
                        onerror="this.src='/static/img/placeholder-room.jpg'">
                    ${!room.is_default ? '<span class="badge bg-success position-absolute top-0 end-0 m-2">Custom</span>' : ''}
                </div>
                <div class="card-body text-center">
                    <h6 class="card-title mb-0">${room.name}</h6>
                    ${!room.is_default && this.isEnterpriseAdmin() ? 
                        `<button class="btn btn-sm btn-outline-danger mt-2" onclick="event.stopPropagation(); enterprise3DRooms.deleteRoom('${room.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>` : ''
                    }
                </div>
            </div>
        `;

        return colDiv;
    }


    createUploadCard() {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-4 mb-4';

        colDiv.innerHTML = `
            <div class="card room-template-card upload-card" onclick="enterprise3DRooms.showUploadModal()">
                <div class="card-img-container d-flex align-items-center justify-content-center bg-light">
                    <i class="fas fa-plus fa-3x text-muted"></i>
                </div>
                <div class="card-body text-center">
                    <h6 class="card-title mb-0">Upload New Room</h6>
                    <small class="text-muted">Add custom 3D room</small>
                </div>
            </div>
        `;

        return colDiv;
    }

    load3DTemplate(roomId, modelPath) {
        console.log('Loading 3D template:', roomId, 'with model path:', modelPath);
        
        // Call the original 3D visualizer function
        if (typeof window.load3DTemplate === 'function') {
            // If modelPath is provided, use it; otherwise use roomId for default rooms
            if (modelPath) {
                // For custom rooms, we need to modify the load3DTemplate function to accept model path
                window.load3DTemplate(roomId, modelPath);
            } else {
                window.load3DTemplate(roomId);
            }
        } else if (typeof load3DTemplate === 'function') {
            if (modelPath) {
                load3DTemplate(roomId, modelPath);
            } else {
                load3DTemplate(roomId);
            }
        } else {
            console.error('load3DTemplate function not found');
        }
    }

    isEnterpriseAdmin() {
        // Check if current user is admin of this enterprise
        const userRole = document.body.getAttribute('data-user-role');
        const userEnterprise = document.body.getAttribute('data-user-enterprise');
        
        console.log('Checking admin status:', { userRole, userEnterprise, currentEnterprise: this.currentEnterprise });
        
        return (userRole === 'enterprise_admin' || userRole === 'superadmin') && 
               (userEnterprise === this.currentEnterprise || userRole === 'superadmin');
    }

    showUploadModal() {
        // Create and show upload modal
        const modal = document.getElementById('upload3DRoomModal');
        if (modal) {
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
        } else {
            this.createUploadModal();
        }
    }

    createUploadModal() {
        const modalHTML = `
            <div class="modal fade" id="upload3DRoomModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Upload 3D Room</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="upload3DRoomForm" enctype="multipart/form-data">
                                <div class="mb-3">
                                    <label for="roomName" class="form-label">Room Name</label>
                                    <input type="text" class="form-control" id="roomName" name="name" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="roomThumbnail" class="form-label">Thumbnail Image</label>
                                    <input type="file" class="form-control" id="roomThumbnail" name="thumbnail" accept="image/*" required>
                                    <small class="form-text text-muted">Upload a preview image for the room</small>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="room3DModel" class="form-label">3D Model File</label>
                                    <input type="file" class="form-control" id="room3DModel" name="model" accept=".gltf,.glb" required>
                                    <small class="form-text text-muted">Supported formats: .gltf, .glb</small>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="roomDescription" class="form-label">Description (Optional)</label>
                                    <textarea class="form-control" id="roomDescription" name="description" rows="3"></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="enterprise3DRooms.uploadRoom()">
                                <i class="fas fa-upload"></i> Upload Room
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('upload3DRoomModal'));
        modal.show();
    }

    async uploadRoom() {
        const form = document.getElementById('upload3DRoomForm');
        const formData = new FormData(form);
        
        // Add enterprise info
        formData.append('enterprise', this.currentEnterprise);

        try {
            const response = await fetch('/api/enterprise/3d-rooms/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Room uploaded successfully:', result);
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('upload3DRoomModal'));
                modal.hide();
                
                // Reload rooms
                await this.loadAvailableRooms();
                
                // Show success message
                this.showMessage('3D Room uploaded successfully!', 'success');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Error uploading room:', error);
            this.showMessage('Error uploading room: ' + error.message, 'error');
        }
    }

    async deleteRoom(roomId) {
        if (!confirm('Are you sure you want to delete this 3D room?')) {
            return;
        }

        try {
            const response = await fetch(`/api/enterprise/3d-rooms/${roomId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadAvailableRooms();
                this.showMessage('3D Room deleted successfully!', 'success');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Delete failed');
            }
        } catch (error) {
            console.error('Error deleting room:', error);
            this.showMessage('Error deleting room: ' + error.message, 'error');
        }
    }

    showMessage(message, type) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'error' ? 'danger' : 'success'} position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close float-end" onclick="this.parentElement.remove()"></button>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    setupEventListeners() {
        // Listen for tab changes to reload rooms
        const threeDTab = document.getElementById('threed-visualizer-tab');
        if (threeDTab) {
            threeDTab.addEventListener('shown.bs.tab', () => {
                console.log('3D tab shown');
                if (this.currentEnterprise && !this.isInitialized) {
                    console.log('Loading enterprise rooms on tab show');
                    this.loadAvailableRooms();
                }
            });
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Enterprise3DRooms');
    window.enterprise3DRooms = new Enterprise3DRooms();
});

// Make it globally available
window.Enterprise3DRooms = Enterprise3DRooms;
