// Phaser is loaded via CDN in index.html
import WorldScene from "./scene_world.js";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 540,
  backgroundColor: "#111",
  physics: {
    default: "arcade",
    arcade: { 
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: [WorldScene],
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
});
