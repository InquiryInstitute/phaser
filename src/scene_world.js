// Phaser is loaded via CDN in index.html
import { config } from "./config.js";

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super("world");
    this.nearNPC = null;
    this.chatOpen = false;
  }

  preload() {
    // Load tileset image explicitly
    // Try multiple path formats for compatibility
    const basePath = window.location.pathname.replace(/\/$/, '') || '.';
    this.load.image("tiles", `${basePath}/maps/tiles.png`);
    
    // Load Tiled JSON map
    this.load.tilemapTiledJSON("campus", `${basePath}/maps/campus.tmj`);
    
    // Add loading progress
    this.load.on('progress', (value) => {
      console.log('Loading progress:', Math.round(value * 100) + '%');
    });
    
    this.load.on('complete', () => {
      console.log('All assets loaded!');
    });
    
    this.load.on('filecomplete', (key, type, data) => {
      console.log('File loaded:', key, type);
    });
    
    // Create a simple colored rectangle for the player avatar
    // You can replace this with a sprite later
    this.load.image("player", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    
    // Create default NPC sprite (simple colored circle)
    this.load.image("npc", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    
    // Preload faculty avatars from Supabase
    this.preloadFacultyAvatars();
  }
  
  async preloadFacultyAvatars() {
    try {
      const { config } = await import("./config.js");
      // Fetch all faculty and filter client-side (Supabase filter syntax is complex)
      const response = await fetch(
        `${config.supabaseUrl}/rest/v1/faculty?select=id,slug,avatar_url&limit=50`,
        {
          headers: {
            'apikey': config.supabaseAnonKey,
            'Authorization': `Bearer ${config.supabaseAnonKey}`
          }
        }
      );
      
      if (response.ok) {
        const faculty = await response.json();
        const withAvatars = faculty.filter(f => f.avatar_url);
        withAvatars.forEach(f => {
          if (f.avatar_url && f.avatar_url.startsWith('data:')) {
            const key = `avatar_${f.slug || f.id}`;
            this.load.image(key, f.avatar_url);
          }
        });
        console.log(`Preloading ${withAvatars.length} faculty avatars`);
      } else {
        console.warn("Could not fetch faculty for avatar preload:", response.status);
      }
    } catch (error) {
      console.warn("Could not preload faculty avatars:", error);
    }
  }

  create() {
    console.log("Creating world scene...");
    const map = this.make.tilemap({ key: "campus" });
    
    if (!map) {
      console.error("Map 'campus' not loaded!");
      // Create a simple fallback map
      this.createFallbackMap();
      return;
    }
    
    console.log("Map loaded:", map.width, "x", map.height, "tiles");
    console.log("Map pixels:", map.widthInPixels, "x", map.heightInPixels);

    // Match the tileset name in Tiled exactly
    const tileset = map.addTilesetImage("tiles", "tiles");
    
    if (!tileset) {
      console.error("Tileset not found! Make sure the tileset name in Tiled matches 'tiles'");
      this.createFallbackMap();
      return;
    }
    
    console.log("Tileset loaded:", tileset.name);
    console.log("Tileset firstGID:", tileset.firstgid);
    console.log("Tileset tileWidth:", tileset.tileWidth, "tileHeight:", tileset.tileHeight);
    console.log("Tileset total tiles:", tileset.total);
    
    // Verify tileset image is loaded
    if (this.textures.exists("tiles")) {
      const texture = this.textures.get("tiles");
      console.log("Tileset texture size:", texture.width, "x", texture.height);
    } else {
      console.error("Tileset texture 'tiles' not found!");
    }

    // Create layers - ensure they render correctly
    const ground = map.createLayer("Ground", tileset, 0, 0);
    const walls = map.createLayer("Walls", tileset, 0, 0);
    
    // Ensure layers are properly configured for rendering
    if (ground) {
      ground.setCullPadding(2, 2);
      // Force tiles to render
      ground.setAlpha(1);
      ground.setVisible(true);
      ground.setDepth(0);
      // Refresh the layer
      ground.render();
      console.log("Ground layer tiles:", ground.layer.data.length);
      console.log("Ground layer first tile:", ground.layer.data[0]?.index);
    }
    if (walls) {
      walls.setCullPadding(2, 2);
      walls.setAlpha(1);
      walls.setVisible(true);
      walls.setDepth(1);
      walls.render();
      console.log("Walls layer tiles:", walls.layer.data.length);
      console.log("Walls layer first tile:", walls.layer.data[0]?.index);
    }

    if (!ground) {
      console.warn("Ground layer not found. Make sure you have a layer named 'Ground' in Tiled.");
      // Create a fallback background
      this.add.rectangle(480, 270, 960, 540, 0xf5f5f5);
    } else {
      console.log("Ground layer created");
      ground.setVisible(true);
      ground.setDepth(0);
      ground.setAlpha(1);
      ground.setScrollFactor(1, 1);
      // Make sure it's visible
      this.cameras.main.setBackgroundColor(0x2a2a2a); // Darker background to see tiles
      console.log("Ground layer width/height:", ground.width, ground.height);
      console.log("Ground layer tile count:", ground.width * ground.height);
      console.log("Ground layer tileWidth/tileHeight:", ground.tilemap.tileWidth, ground.tilemap.tileHeight);
      
      // Check if tileset is valid
      console.log("Tileset tileWidth/tileHeight:", tileset.tileWidth, tileset.tileHeight);
      
      // Force a render update
      ground.setCullPadding(2, 2);
      
      // Debug: Check first few tiles
      if (ground.layer && ground.layer.data) {
        const sampleTiles = ground.layer.data.slice(0, 10);
        console.log("Sample ground tiles:", sampleTiles.map(t => t ? t.index : 'empty'));
      }
    }

    if (!walls) {
      console.warn("Walls layer not found. Make sure you have a layer named 'Walls' in Tiled.");
    } else {
      console.log("Walls layer created");
      walls.setVisible(true);
      walls.setDepth(1);
      walls.setAlpha(1);
      walls.setScrollFactor(1, 1);
      console.log("Walls layer width/height:", walls.width, walls.height);
      console.log("Walls layer tile count:", walls.width * walls.height);
      
      // Force a render update
      walls.setCullPadding(2, 2);
      
      // Set collision for wall tiles (GID 2)
      // Try multiple methods to ensure collision works
      let collisionSet = false;
      
      // Method 1: Set collision for specific tile GID
      try {
        walls.setCollisionBetween(2, 2);
        collisionSet = true;
        console.log("✓ Collision set using setCollisionBetween(2, 2)");
      } catch (e) {
        console.warn("setCollisionBetween failed:", e);
      }
      
      // Method 2: If that didn't work, try exclusion
      if (!collisionSet) {
        try {
          walls.setCollisionByExclusion([-1, 0, 1]);
          collisionSet = true;
          console.log("✓ Collision set using exclusion");
        } catch (e) {
          console.warn("setCollisionByExclusion failed:", e);
        }
      }
      
      if (!collisionSet) {
        console.warn("⚠ Could not set collisions - walls will not block player");
      }
    }

    // Create player avatar - start in center of map
    // Make sure we have valid coordinates
    const startX = Math.max(64, Math.min(map.widthInPixels - 64, map.widthInPixels / 2));
    const startY = Math.max(64, Math.min(map.heightInPixels - 64, map.heightInPixels / 2));
    
    console.log("Creating player at:", startX, startY);
    console.log("Map dimensions:", map.widthInPixels, "x", map.heightInPixels);
    console.log("Game dimensions:", this.cameras.main.width, "x", this.cameras.main.height);
    
    this.player = this.physics.add.sprite(startX, startY, "player");
    this.player.setDisplaySize(24, 24);
    this.player.setTint(0x667eea); // Purple color for visibility
    this.player.setVisible(true);
    this.player.setAlpha(1);
    
    // Set physics body
    if (this.player.body) {
      this.player.body.setSize(24, 24);
      this.player.body.setCollideWorldBounds(true);
      this.player.body.setImmovable(false);
    }
    
    this.player.setDepth(100); // High depth to be on top
    
    // Add a visible circle behind player for debugging
    const playerBg = this.add.circle(startX, startY, 14, 0xffffff, 0.5);
    playerBg.setDepth(99);
    playerBg.setScrollFactor(1, 1);
    
    console.log("Player created:", this.player.x, this.player.y, "visible:", this.player.visible);
    console.log("Player body:", this.player.body ? "exists" : "missing");
    console.log("Ground layer visible:", ground ? ground.visible : "N/A");
    console.log("Walls layer visible:", walls ? walls.visible : "N/A");

    // Set world bounds first
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    
    // Set camera background to dark gray so we can see tiles
    this.cameras.main.setBackgroundColor(0x2a2a2a);
    
    // Set camera zoom first
    this.cameras.main.setZoom(1.5);
    
    // Center camera on player initially (before following)
    this.cameras.main.centerOn(startX, startY);
    
    // Camera follows player smoothly (after centering)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    
    // Force camera to update immediately
    this.cameras.main.update();
    
    console.log("Camera set up, following player");
    console.log("Camera position:", this.cameras.main.scrollX, this.cameras.main.scrollY);
    console.log("Camera zoom:", this.cameras.main.zoom);
    console.log("Player position:", this.player.x, this.player.y);

    // Collide player with walls
    if (walls) {
      this.physics.add.collider(this.player, walls);
    }

    // Load and spawn NPCs
    this.npcs = this.physics.add.staticGroup();
    // Load NPCs asynchronously
    this.loadNPCs(map).then(() => {
      console.log("NPCs loaded");
    }).catch(err => {
      console.error("Error loading NPCs:", err);
    });

    // Proximity detection for NPCs
    this.physics.add.overlap(this.player, this.npcs, (player, npc) => {
      this.nearNPC = npc;
      this.showInteractionPrompt(npc);
    }, null, this);

    // Check when player leaves NPC range
    this.physics.world.on('worldbounds', () => {
      if (this.nearNPC) {
        const distance = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          this.nearNPC.x, this.nearNPC.y
        );
        if (distance > 50) {
          this.nearNPC = null;
          this.hideInteractionPrompt();
        }
      }
    });

    // Input controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D");
    this.keyE = this.input.keyboard.addKey("E");
    
    // Test input
    this.input.keyboard.on('keydown', (event) => {
      console.log('Key pressed:', event.key);
    });
    
    // Prevent context menu on right click
    this.input.mouse.disableContextMenu();
    
    // Add a test rectangle to verify rendering works
    const testRect = this.add.rectangle(startX, startY - 50, 100, 20, 0xff0000, 0.5);
    testRect.setScrollFactor(1, 1);
    testRect.setDepth(200);
    console.log("Test rectangle added at:", startX, startY - 50);

    // Interaction prompt text (hidden initially)
    this.interactionPrompt = this.add.text(0, 0, "Press E to talk", {
      fontSize: "16px",
      fill: "#ffffff",
      fontFamily: "Arial",
      backgroundColor: "#000000",
      padding: { x: 8, y: 4 }
    });
    this.interactionPrompt.setOrigin(0.5);
    this.interactionPrompt.setScrollFactor(0);
    this.interactionPrompt.setVisible(false);
    this.interactionPrompt.setDepth(1000);
  }

  async loadNPCs(map) {
    const npcLayer = map.getObjectLayer("NPCs");
    
    if (!npcLayer || !npcLayer.objects) {
      console.warn("NPCs layer not found. Add an object layer named 'NPCs' in Tiled.");
      return;
    }

    // Load faculty data from Supabase
    const { config } = await import("./config.js");
    let facultyData = {};
    
    try {
      const response = await fetch(
        `${config.supabaseUrl}/rest/v1/faculty?select=id,name,surname,slug,avatar_url,portrait_url&limit=100`,
        {
          headers: {
            'apikey': config.supabaseAnonKey,
            'Authorization': `Bearer ${config.supabaseAnonKey}`
          }
        }
      );
      
      if (response.ok) {
        const faculty = await response.json();
        faculty.forEach(f => {
          const slug = f.slug || f.id;
          facultyData[slug] = f;
          // Also index by personaId format
          facultyData[`faculty.${slug}`] = f;
        });
        console.log(`Loaded ${faculty.length} faculty members from database`);
      }
    } catch (error) {
      console.warn("Could not load faculty data:", error);
    }

    // Process NPCs synchronously to avoid race conditions
    for (const obj of npcLayer.objects) {
      // Extract properties from Tiled object
      const getProperty = (name, defaultValue = null) => {
        const prop = obj.properties?.find(p => p.name === name);
        return prop ? prop.value : defaultValue;
      };

      const personaId = getProperty("personaId", obj.name);
      const displayName = getProperty("displayName", obj.name);
      
      // Look up faculty data
      const faculty = facultyData[personaId] || facultyData[personaId?.replace('faculty.', '')];
      
      // Determine avatar to use
      let avatarKey = "npc"; // Default sprite
      
      if (faculty && (faculty.avatar_url || faculty.portrait_url)) {
        const avatarUrl = faculty.avatar_url || faculty.portrait_url;
        avatarKey = `avatar_${faculty.slug || faculty.id}`;
        
        // Check if already loaded, if not load it
        if (!this.textures.exists(avatarKey)) {
          if (avatarUrl.startsWith('data:')) {
            // Data URL - load directly
            this.load.image(avatarKey, avatarUrl);
          } else {
            // External URL
            this.load.image(avatarKey, avatarUrl);
          }
          // Wait for load to complete
          await new Promise((resolve) => {
            this.load.once(`filecomplete-image-${avatarKey}`, resolve);
            this.load.start();
          });
        }
      }
      
      // Create NPC sprite
      const npc = this.npcs.create(obj.x, obj.y, avatarKey);
      if (!npc) {
        console.warn(`Failed to create NPC at ${obj.x}, ${obj.y}`);
        continue;
      }
      
      npc.setDisplaySize(32, 32);
      
      // If no avatar, use colored circle based on name
      if (avatarKey === "npc") {
        const color = this.generateColorFromName(displayName || "NPC");
        npc.setTint(color);
      }
      
      npc.setOrigin(0.5, 1.0);
      npc.setDepth(50);

      // Store faculty data on the NPC
      npc.faculty = {
        id: personaId || obj.name,
        name: displayName || obj.name || "Unknown",
        greeting: getProperty("greeting", "Hello."),
        type: getProperty("type", "faculty"),
        facultyData: faculty || null
      };

      // Add name label above NPC
      const nameText = displayName || obj.name || "NPC";
      const nameLabel = this.add.text(obj.x, obj.y - 20, nameText, {
        fontSize: "12px",
        fill: "#ffffff",
        fontFamily: "Arial",
        backgroundColor: "#000000",
        padding: { x: 4, y: 2 }
      });
      nameLabel.setOrigin(0.5);
      nameLabel.setScrollFactor(1);
      nameLabel.setDepth(100);
    }
    
    console.log(`Created ${npcLayer.objects.length} NPCs`);
  }
  
  generateColorFromName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Generate a nice color using HSL
    const hue = Math.abs(hash % 360);
    const saturation = 70;
    const lightness = 50;
    
    // Convert HSL to RGB manually
    const h = hue / 360;
    const s = saturation / 100;
    const l = lightness / 100;
    
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    // Convert to Phaser color integer
    const colorInt = Phaser.Display.Color.GetColor(
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255)
    );
    return colorInt;
  }

  showInteractionPrompt(npc) {
    if (!this.chatOpen) {
      this.interactionPrompt.setText(`Press E to talk to ${npc.faculty.name}`);
      this.interactionPrompt.setVisible(true);
    }
  }

  hideInteractionPrompt() {
    this.interactionPrompt.setVisible(false);
  }

  update() {
    // Check distance to NPCs (fallback if overlap doesn't work perfectly)
    if (this.npcs && this.npcs.children && this.npcs.children.entries && this.npcs.children.entries.length > 0) {
      let closestNPC = null;
      let closestDistance = Infinity;

      this.npcs.children.entries.forEach(npc => {
        const distance = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          npc.x, npc.y
        );
        if (distance < 50 && distance < closestDistance) {
          closestDistance = distance;
          closestNPC = npc;
        }
      });

      if (closestNPC && closestNPC !== this.nearNPC) {
        this.nearNPC = closestNPC;
        this.showInteractionPrompt(closestNPC);
      } else if (!closestNPC && this.nearNPC) {
        this.nearNPC = null;
        this.hideInteractionPrompt();
      }
    }

    // Handle E key press to open chat
    if (this.keyE && Phaser.Input.Keyboard.JustDown(this.keyE) && this.nearNPC && !this.chatOpen) {
      this.openFacultyChat(this.nearNPC.faculty);
    }

    // Movement - only if player exists and physics is enabled
    if (!this.player || !this.player.body) {
      return;
    }
    
    const speed = 110;
    const left = this.cursors.left.isDown || (this.keys && this.keys.A && this.keys.A.isDown);
    const right = this.cursors.right.isDown || (this.keys && this.keys.D && this.keys.D.isDown);
    const up = this.cursors.up.isDown || (this.keys && this.keys.W && this.keys.W.isDown);
    const down = this.cursors.down.isDown || (this.keys && this.keys.S && this.keys.S.isDown);

    let vx = 0, vy = 0;
    if (left) vx -= speed;
    if (right) vx += speed;
    if (up) vy -= speed;
    if (down) vy += speed;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const inv = 1 / Math.sqrt(2);
      vx *= inv; 
      vy *= inv;
    }

    this.player.setVelocity(vx, vy);
    
    // Debug: log movement occasionally
    if (vx !== 0 || vy !== 0) {
      if (Math.random() < 0.01) { // Log 1% of the time
        console.log("Player moving:", vx, vy, "at", this.player.x, this.player.y);
      }
    }
  }

  createFallbackMap() {
    // Create a simple colored background if map fails to load
    this.add.rectangle(480, 270, 960, 540, 0xf5f5f5);
    this.add.text(480, 270, "Map loading failed.\nCheck console for errors.", {
      fontSize: "24px",
      fill: "#333",
      align: "center"
    }).setOrigin(0.5);
  }

  openFacultyChat(faculty) {
    this.chatOpen = true;
    this.hideInteractionPrompt();
    
    // Pause game input
    this.scene.pause();
    
    // Show chat panel
    showChatPanel({
      title: faculty.name,
      initial: faculty.greeting,
      onSend: async (text) => {
        try {
          // Use Supabase Edge Function endpoint
          const endpoint = config.apiEndpoint || 
            `${config.supabaseUrl}/functions/v1/faculty-chat`;
          
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${config.supabaseAnonKey}`,
              "apikey": config.supabaseAnonKey
            },
            body: JSON.stringify({
              personaId: faculty.id,
              message: text,
              location: "Inquiry Grounds",
              map: "campus",
            })
          });
          
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          
          const data = await res.json();
          return data.reply || data.message || "I'm sorry, I didn't understand that.";
        } catch (error) {
          console.error("Chat error:", error);
          return "I'm having trouble connecting right now. Please try again later.";
        }
      },
      onClose: () => {
        this.chatOpen = false;
        this.scene.resume();
      }
    });
  }
}

// Chat Panel UI Component
function showChatPanel({ title, initial, onSend, onClose }) {
  // Remove existing chat panel if present
  const existing = document.getElementById("chat-panel");
  if (existing) {
    existing.remove();
  }

  const panel = document.createElement("div");
  panel.id = "chat-panel";
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  header.innerHTML = `
    <h2 style="margin: 0; color: #333; font-size: 24px;">${title}</h2>
    <button id="chat-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
  `;

  const messages = document.createElement("div");
  messages.id = "chat-messages";
  messages.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 400px;
  `;

  const inputContainer = document.createElement("div");
  inputContainer.style.cssText = `
    padding: 20px;
    border-top: 1px solid #e0e0e0;
    display: flex;
    gap: 10px;
  `;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type your message...";
  input.style.cssText = `
    flex: 1;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
  `;
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  const sendButton = document.createElement("button");
  sendButton.textContent = "Send";
  sendButton.style.cssText = `
    padding: 12px 24px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  `;
  sendButton.addEventListener("click", sendMessage);

  let isLoading = false;

  function addMessage(text, isUser = false) {
    const message = document.createElement("div");
    message.style.cssText = `
      padding: 12px 16px;
      border-radius: 8px;
      max-width: 80%;
      word-wrap: break-word;
      ${isUser 
        ? "background: #667eea; color: white; align-self: flex-end;"
        : "background: #f5f5f5; color: #333; align-self: flex-start;"
      }
    `;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isLoading) return;

    addMessage(text, true);
    input.value = "";
    isLoading = true;
    sendButton.disabled = true;
    sendButton.textContent = "Sending...";

    try {
      const reply = await onSend(text);
      addMessage(reply, false);
    } catch (error) {
      addMessage("Sorry, there was an error. Please try again.", false);
      console.error("Chat error:", error);
    } finally {
      isLoading = false;
      sendButton.disabled = false;
      sendButton.textContent = "Send";
      input.focus();
    }
  }

  // Add initial greeting
  if (initial) {
    addMessage(initial, false);
  }

  // Close button
  document.getElementById("chat-close").addEventListener("click", () => {
    panel.remove();
    if (onClose) onClose();
  });

  // Assemble panel
  inputContainer.appendChild(input);
  inputContainer.appendChild(sendButton);
  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(inputContainer);
  document.body.appendChild(panel);

  // Focus input
  input.focus();
}
