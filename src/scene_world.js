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
    
    // Create NPC sprite (simple colored circle)
    this.load.image("npc", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
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

    // Create layers
    const ground = map.createLayer("Ground", tileset, 0, 0);
    const walls = map.createLayer("Walls", tileset, 0, 0);

    if (!ground) {
      console.warn("Ground layer not found. Make sure you have a layer named 'Ground' in Tiled.");
    } else {
      console.log("Ground layer created");
      ground.setVisible(true);
      ground.setDepth(0);
      // Make sure it's visible
      this.cameras.main.setBackgroundColor(0xf5f5f5);
    }

    if (!walls) {
      console.warn("Walls layer not found. Make sure you have a layer named 'Walls' in Tiled.");
    } else {
      console.log("Walls layer created");
      // Set collision for wall tiles
      // In our map data: 0 = empty, 1 = ground, 2 = walls
      // Phaser uses the tile GID (Global ID) from the map
      // Since firstgid=1, tile 2 in map = GID 2, which is tile index 1 in tileset
      // But for collision, we use the GID directly
      try {
        // Set collision for tile GID 2 (walls in our map)
        walls.setCollisionBetween(2, 2);
        console.log("Collision set for GID 2 (walls)");
      } catch (e) {
        console.warn("setCollisionBetween failed, trying exclusion:", e);
        // Fallback: Exclude empty (0) and ground (1)
        try {
          walls.setCollisionByExclusion([-1, 0, 1]);
          console.log("Collision set using exclusion");
        } catch (e2) {
          console.error("Collision setup failed:", e2);
        }
      }
      walls.setVisible(true);
      walls.setDepth(1);
    }

    // Create player avatar
    const startX = map.widthInPixels / 2 || 480;
    const startY = map.heightInPixels / 2 || 270;
    
    console.log("Creating player at:", startX, startY);
    console.log("Map dimensions:", map.widthInPixels, "x", map.heightInPixels);
    console.log("Game dimensions:", this.cameras.main.width, "x", this.cameras.main.height);
    
    this.player = this.physics.add.sprite(startX, startY, "player");
    this.player.setDisplaySize(24, 24);
    this.player.setTint(0x667eea); // Purple color for visibility
    this.player.setVisible(true);
    this.player.body.setSize(24, 24);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    
    console.log("Player created:", this.player.x, this.player.y, "visible:", this.player.visible);

    // Set world bounds first
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    
    // Camera follows player smoothly
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.setBackgroundColor(0xf5f5f5);
    
    console.log("Camera set up, following player");

    // Collide player with walls
    if (walls) {
      this.physics.add.collider(this.player, walls);
    }

    // Load and spawn NPCs
    this.npcs = this.physics.add.staticGroup();
    this.loadNPCs(map);

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
    
    // Prevent context menu on right click
    this.input.mouse.disableContextMenu();

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

  loadNPCs(map) {
    const npcLayer = map.getObjectLayer("NPCs");
    
    if (!npcLayer || !npcLayer.objects) {
      console.warn("NPCs layer not found. Add an object layer named 'NPCs' in Tiled.");
      return;
    }

    npcLayer.objects.forEach(obj => {
      // Create NPC sprite
      const npc = this.npcs.create(obj.x, obj.y, "npc");
      npc.setDisplaySize(20, 20);
      npc.setTint(0x48bb78); // Green color for NPCs
      npc.setOrigin(0.5, 1.0);

      // Extract properties from Tiled object
      const getProperty = (name, defaultValue = null) => {
        const prop = obj.properties?.find(p => p.name === name);
        return prop ? prop.value : defaultValue;
      };

      // Store faculty data on the NPC
      npc.faculty = {
        id: getProperty("personaId", obj.name),
        name: getProperty("displayName", obj.name),
        greeting: getProperty("greeting", "Hello."),
        type: getProperty("type", "faculty")
      };

      // Add name label above NPC
      const nameLabel = this.add.text(obj.x, obj.y - 15, npc.faculty.name, {
        fontSize: "12px",
        fill: "#ffffff",
        fontFamily: "Arial",
        backgroundColor: "#000000",
        padding: { x: 4, y: 2 }
      });
      nameLabel.setOrigin(0.5);
      nameLabel.setScrollFactor(1);
    });
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

    // Movement
    const speed = 110;
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

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
