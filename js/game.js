// Inquiry Institute Canvas Mapper
// Phaser.js application with tiled system for mapping

// Tile types for Inquiry Institute canvas
const TILE_TYPES = {
    EMPTY: { id: 0, name: 'Empty', color: 0xf5f5f5, border: 0xcccccc },
    QUESTION: { id: 1, name: 'Question', color: 0x667eea, border: 0x5568d3 },
    INVESTIGATION: { id: 2, name: 'Investigation', color: 0x48bb78, border: 0x38a169 },
    EVIDENCE: { id: 3, name: 'Evidence', color: 0xed8936, border: 0xdd6b20 },
    CLAIM: { id: 4, name: 'Claim', color: 0xf56565, border: 0xe53e3e },
    REASONING: { id: 5, name: 'Reasoning', color: 0x9f7aea, border: 0x805ad5 },
    REFLECTION: { id: 6, name: 'Reflection', color: 0x4299e1, border: 0x3182ce },
    CONNECTION: { id: 7, name: 'Connection', color: 0x38b2ac, border: 0x2c7a7b }
};

class TileMap {
    constructor(width, height, tileSize = 64) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.tiles = [];
        this.selectedTileType = TILE_TYPES.QUESTION;
        
        // Initialize empty tile map
        for (let y = 0; y < height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                this.tiles[y][x] = TILE_TYPES.EMPTY.id;
            }
        }
    }

    getTileAt(tileX, tileY) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return TILE_TYPES.EMPTY.id;
        }
        return this.tiles[tileY][tileX];
    }

    setTileAt(tileX, tileY, tileType) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return false;
        }
        this.tiles[tileY][tileX] = tileType;
        return true;
    }

    worldToTile(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        return { x: tileX, y: tileY };
    }

    tileToWorld(tileX, tileY) {
        return {
            x: tileX * this.tileSize + this.tileSize / 2,
            y: tileY * this.tileSize + this.tileSize / 2
        };
    }

    clear() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.tiles[y][x] = TILE_TYPES.EMPTY.id;
            }
        }
    }

    exportState() {
        return {
            width: this.width,
            height: this.height,
            tileSize: this.tileSize,
            tiles: this.tiles.map(row => [...row])
        };
    }

    importState(state) {
        this.width = state.width || this.width;
        this.height = state.height || this.height;
        this.tileSize = state.tileSize || this.tileSize;
        
        // Resize if needed
        if (state.tiles) {
            this.tiles = state.tiles.map(row => [...row]);
        }
    }
}

class InquiryCanvasScene extends Phaser.Scene {
    constructor() {
        super({ key: 'InquiryCanvasScene' });
        this.tileMap = new TileMap(100, 100, 64); // 100x100 grid, 64px tiles
        this.tileGraphics = [];
        this.hoverTile = null;
        this.cameraZoom = 1;
        this.isDrawing = false;
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Create tile map graphics
        this.renderTileMap();
        
        // Set up camera controls
        this.setupCameraControls();
        
        // Set up input handlers
        this.setupInputHandlers();
        
        // Set up UI buttons
        this.setupUIButtons();
        
        // Create tile palette
        this.createTilePalette();
        
        // Initial instruction text
        this.add.text(width / 2, 50, 'Inquiry Institute Canvas Mapper', {
            fontSize: '24px',
            fill: '#333',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setScrollFactor(0);
    }

    renderTileMap() {
        // Clear existing graphics
        this.tileGraphics.forEach(g => g.destroy());
        this.tileGraphics = [];

        const { tileSize } = this.tileMap;
        
        // Render all tiles
        for (let y = 0; y < this.tileMap.height; y++) {
            for (let x = 0; x < this.tileMap.width; x++) {
                const tileId = this.tileMap.getTileAt(x, y);
                const tileType = Object.values(TILE_TYPES).find(t => t.id === tileId) || TILE_TYPES.EMPTY;
                const worldPos = this.tileMap.tileToWorld(x, y);
                
                const graphics = this.add.graphics();
                
                // Draw tile
                graphics.fillStyle(tileType.color, 1);
                graphics.fillRect(
                    worldPos.x - tileSize / 2,
                    worldPos.y - tileSize / 2,
                    tileSize,
                    tileSize
                );
                
                // Draw border
                graphics.lineStyle(1, tileType.border, 0.8);
                graphics.strokeRect(
                    worldPos.x - tileSize / 2,
                    worldPos.y - tileSize / 2,
                    tileSize,
                    tileSize
                );
                
                // Draw label for non-empty tiles
                if (tileId !== TILE_TYPES.EMPTY.id) {
                    const label = this.add.text(worldPos.x, worldPos.y, tileType.name.substring(0, 3), {
                        fontSize: '10px',
                        fill: '#ffffff',
                        fontFamily: 'Arial',
                        fontStyle: 'bold'
                    });
                    label.setOrigin(0.5);
                    this.tileGraphics.push(label);
                }
                
                this.tileGraphics.push(graphics);
            }
        }
    }

    createTilePalette() {
        const paletteContainer = document.createElement('div');
        paletteContainer.id = 'tile-palette';
        paletteContainer.style.cssText = `
            position: absolute;
            top: 80px;
            left: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-width: 200px;
        `;
        
        const title = document.createElement('div');
        title.textContent = 'Tile Types';
        title.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #333;';
        paletteContainer.appendChild(title);
        
        Object.values(TILE_TYPES).forEach(tileType => {
            if (tileType.id === TILE_TYPES.EMPTY.id) return; // Skip empty tile
            
            const tileButton = document.createElement('div');
            tileButton.style.cssText = `
                padding: 8px;
                margin: 5px 0;
                border-radius: 6px;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            const colorBox = document.createElement('div');
            colorBox.style.cssText = `
                width: 24px;
                height: 24px;
                border-radius: 4px;
                background: #${tileType.color.toString(16).padStart(6, '0')};
                border: 2px solid #${tileType.border.toString(16).padStart(6, '0')};
            `;
            
            const label = document.createElement('span');
            label.textContent = tileType.name;
            label.style.cssText = 'font-size: 14px; color: #333;';
            
            tileButton.appendChild(colorBox);
            tileButton.appendChild(label);
            
            tileButton.addEventListener('click', () => {
                this.tileMap.selectedTileType = tileType;
                // Update selection visual
                document.querySelectorAll('#tile-palette > div').forEach(btn => {
                    if (btn !== title) {
                        btn.style.border = '2px solid transparent';
                        btn.style.background = 'transparent';
                    }
                });
                tileButton.style.border = '2px solid #667eea';
                tileButton.style.background = '#f0f4ff';
            });
            
            // Set initial selection
            if (tileType.id === TILE_TYPES.QUESTION.id) {
                tileButton.style.border = '2px solid #667eea';
                tileButton.style.background = '#f0f4ff';
            }
            
            paletteContainer.appendChild(tileButton);
        });
        
        document.body.appendChild(paletteContainer);
    }

    setupCameraControls() {
        // Initialize camera controls
        this.tileMap.cameraControls = {
            panning: false,
            panStart: { x: 0, y: 0 }
        };

        // Mouse wheel zoom
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
            this.cameraZoom = Phaser.Math.Clamp(this.cameraZoom * zoomFactor, 0.25, 3);
            this.cameras.main.setZoom(this.cameraZoom);
        });

        // Pan with middle mouse or space + drag
        this.input.on('pointerdown', (pointer) => {
            if (pointer.button === 1 || (this.input.keyboard && this.input.keyboard.addKey('SPACE').isDown)) {
                this.tileMap.cameraControls.panning = true;
                this.tileMap.cameraControls.panStart.x = pointer.x;
                this.tileMap.cameraControls.panStart.y = pointer.y;
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (this.tileMap.cameraControls.panning) {
                const dx = pointer.x - this.tileMap.cameraControls.panStart.x;
                const dy = pointer.y - this.tileMap.cameraControls.panStart.y;
                this.cameras.main.scrollX -= dx / this.cameraZoom;
                this.cameras.main.scrollY -= dy / this.cameraZoom;
                this.tileMap.cameraControls.panStart.x = pointer.x;
                this.tileMap.cameraControls.panStart.y = pointer.y;
            }
        });

        this.input.on('pointerup', () => {
            this.tileMap.cameraControls.panning = false;
        });
    }

    setupInputHandlers() {
        // Left click - place tile
        this.input.on('pointerdown', (pointer) => {
            if (pointer.button === 0 && !this.tileMap.cameraControls?.panning) {
                this.isDrawing = true;
                this.placeTileAtPointer(pointer);
            }
        });

        // Right click - erase tile (set to empty)
        this.input.on('pointerdown', (pointer) => {
            if (pointer.button === 2) {
                const worldX = pointer.worldX;
                const worldY = pointer.worldY;
                const tilePos = this.tileMap.worldToTile(worldX, worldY);
                this.tileMap.setTileAt(tilePos.x, tilePos.y, TILE_TYPES.EMPTY.id);
                this.renderTileMap();
            }
        });

        // Drag to paint tiles
        this.input.on('pointermove', (pointer) => {
            if (this.isDrawing && pointer.isDown) {
                this.placeTileAtPointer(pointer);
            }
            
            // Show hover effect
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            const tilePos = this.tileMap.worldToTile(worldX, worldY);
            
            if (this.hoverTile && (this.hoverTile.x !== tilePos.x || this.hoverTile.y !== tilePos.y)) {
                this.clearHoverEffect();
            }
            
            if (tilePos.x >= 0 && tilePos.x < this.tileMap.width && 
                tilePos.y >= 0 && tilePos.y < this.tileMap.height) {
                this.showHoverEffect(tilePos.x, tilePos.y);
            }
        });

        this.input.on('pointerup', () => {
            this.isDrawing = false;
        });
    }

    placeTileAtPointer(pointer) {
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const tilePos = this.tileMap.worldToTile(worldX, worldY);
        
        if (tilePos.x >= 0 && tilePos.x < this.tileMap.width && 
            tilePos.y >= 0 && tilePos.y < this.tileMap.height) {
            this.tileMap.setTileAt(tilePos.x, tilePos.y, this.tileMap.selectedTileType.id);
            this.renderTileMap();
        }
    }

    showHoverEffect(tileX, tileY) {
        this.hoverTile = { x: tileX, y: tileY };
        const worldPos = this.tileMap.tileToWorld(tileX, tileY);
        const { tileSize } = this.tileMap;
        
        const hoverGraphics = this.add.graphics();
        hoverGraphics.lineStyle(3, 0xffffff, 0.8);
        hoverGraphics.strokeRect(
            worldPos.x - tileSize / 2,
            worldPos.y - tileSize / 2,
            tileSize,
            tileSize
        );
        hoverGraphics.setDepth(1000);
        this.tileGraphics.push(hoverGraphics);
    }

    clearHoverEffect() {
        // Hover effect is cleared when we re-render
        this.hoverTile = null;
    }

    setupUIButtons() {
        document.getElementById('clear-all').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all tiles?')) {
                this.tileMap.clear();
                this.renderTileMap();
            }
        });

        document.getElementById('save-state').addEventListener('click', () => {
            const state = this.tileMap.exportState();
            localStorage.setItem('inquiryCanvasState', JSON.stringify(state));
            alert('Tile map saved to localStorage!');
        });

        document.getElementById('load-state').addEventListener('click', () => {
            const saved = localStorage.getItem('inquiryCanvasState');
            if (saved) {
                try {
                    const state = JSON.parse(saved);
                    this.tileMap.importState(state);
                    this.renderTileMap();
                    alert('Tile map loaded from localStorage!');
                } catch (e) {
                    alert('Error loading state: ' + e.message);
                }
            } else {
                alert('No saved state found!');
            }
        });

        document.getElementById('export-json').addEventListener('click', () => {
            const state = this.tileMap.exportState();
            const json = JSON.stringify(state, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'inquiry-canvas-tiles-' + Date.now() + '.json';
            a.click();
            URL.revokeObjectURL(url);
        });
    }
}

// Phaser game configuration
const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    parent: 'phaser-game',
    backgroundColor: '#f5f5f5',
    scene: InquiryCanvasScene,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

// Initialize game
const game = new Phaser.Game(config);
