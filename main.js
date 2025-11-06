// =======================
// Constants
// =======================
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const GRAVITY = 2;
const JUMP_POWER = 23;
const GROUND_LEVEL = 750;
const DASH_KEYS = ["a", "d"];
const PLAYER_SCALE = 100;

const IMAGE_SOURCES = [
  "assets/player/movement/Hen0.svg",
  "assets/player/movement/Hen1.svg",
  "assets/player/movement/Hen2.svg",
  "assets/player/movement/Hen3.svg",
  "assets/player/movement/Hen4.svg",
  "assets/player/Henb0.svg",
  "assets/player/Henb1.svg"
];

// =======================
// Game State
// =======================
let xs = 4; // Horizontal speed
let ys = 0; // Vertical speed
let tick = 0;
let keys = {};
let isGrounded = true;
let cameraOffsetX = 0;
let cameraOffsetY = 0;
let gameOver = false;
let score = 0;
let highscore = 0;
let speedPhase = 1;

// Dash State
let dashActive = false;
let dashTimeLeft = 0;
let dashDuration = 0;
let dashDirection = 0; // 0 = left, 1 = right

// Environment
let cloudLog = [];
let obstacles = [];

// Player Animation
let playerSkin = 0;

// Assets
const images = [];

// =======================
// Utility Functions
// =======================
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// =======================
// Input Handling
// =======================
document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (keys["r"] && gameOver) resetGame();
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// =======================
// Load Assets
// =======================
function loadImages(sources, callback) {
  let loadedCount = 0;
  sources.forEach((src, index) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      images[index] = img;
      loadedCount++;
      if (loadedCount === sources.length) callback();
    };
  });
}

// =======================
// Player Logic
// =======================
function handleInput() {
  if (gameOver) return;
  if (keys["w"] && isGrounded) ys = JUMP_POWER;
}

function updatePlayerPosition() {
  if (gameOver) return;

  ys -= GRAVITY;
  cameraOffsetY -= ys;

  isGrounded = cameraOffsetY >= 0;
  if (isGrounded) {
    cameraOffsetY = 0;
    ys = 0;
  }

  cameraOffsetX += xs;
}

function updatePlayerAnimation() {
  if (gameOver) return;

  if (!isGrounded) {
    playerSkin = 4; // jumping
  } else if (Math.abs(xs) > 0.2) {
    playerSkin = Math.floor(tick / 2) % 4; // running animation
  } else {
    playerSkin = 5; // idle
  }
}

// =======================
// Dash Logic
// =======================
function startDash() {
  dashActive = true;
  dashDuration = getRandomInt(60 / speedPhase, 150 / speedPhase);
  dashDirection = getRandomInt(0, 1);
  dashTimeLeft = dashDuration;
}

function updateDash() {
  if (gameOver) return;

  if (!dashActive) {
    // Random dash trigger
    if (getRandomInt(1, 100 / (speedPhase / 2)) === 1) startDash();
    return;
  }

  dashTimeLeft--;
  let dashSpeed = isGrounded ? -100 : -200;

  if (keys[DASH_KEYS[dashDirection]] || dashTimeLeft <= 0) {
    xs = dashSpeed + 2 * Math.abs(dashSpeed) * dashDirection;
    dashActive = false;
    dashTimeLeft = 0;
  }
}

// =======================
// Speed Phase Logic
// =======================
function updateSpeedPhase() {
  if (tick >= 4000) {
    xs = 16;
    speedPhase = 5;
  } else if (tick >= 2000) {
    xs = 14;
    speedPhase = 4;
  } else if (tick >= 1000) {
    xs = 12;
    speedPhase = 3;
  } else if (tick >= 500) {
    xs = 10;
    speedPhase = 2;
  } else {
    xs = 8;
    speedPhase = 1;
  }
}

// =======================
// Environment Logic
// =======================
function generateObstacles() {
  if (gameOver) return;
  const x = xs < -2 ? -199 : 1700;
  if (getRandomInt(1, 100 / speedPhase) !== 1) return;
  if (obstacles.length >= 5 * speedPhase) return;

  const width = getRandomInt(30, 60);
  const height = getRandomInt(40, 80);
  const y = GROUND_LEVEL - height;

  const last = obstacles[obstacles.length - 1];
  if (last && Math.abs(x - (last[0] + last[2])) < 200 / speedPhase + 60) return;

  obstacles.push([x, y, width, height]);
}

function generateClouds() {
  if (gameOver) return;
  const x = xs < -2 ? -199 : 1700;
  if (getRandomInt(1, 100 / speedPhase) !== 1) return;

  const last = cloudLog[cloudLog.length - 1];
  if (last && Math.abs(x - last[3]) < 200) return;

  const radius = getRandomInt(30, 60);
  cloudLog.push([radius, getRandomInt(4, 7), getRandomInt(radius / 4, radius / -4), x, getRandomInt(50, 300)]);
}

function updateEnvironment() {
  cloudLog = cloudLog.filter(c => c[3] > -200 && c[3] < 1701);
  obstacles = obstacles.filter(o => o[0] > -100 && o[0] < 1701);

  for (let c of cloudLog) c[3] -= xs - 3;
  for (let o of obstacles) o[0] -= xs;

  // Collision detection
  const hitboxShrink = 20;
  const playerBox = {
    x: 600 + hitboxShrink,
    y: GROUND_LEVEL - 100 + hitboxShrink,
    w: 100 - hitboxShrink * 2,
    h: 100 - hitboxShrink * 2
  };

  for (let [ox, oy, ow, oh] of obstacles) {
    const obsY = oy - cameraOffsetY;
    if (
      playerBox.x < ox + ow &&
      playerBox.x + playerBox.w > ox &&
      playerBox.y < obsY + oh &&
      playerBox.y + playerBox.h > obsY
    ) triggerGameOver();
  }
}

// =======================
// Drawing Functions
// =======================
function drawPlayer() {
  ctx.drawImage(images[playerSkin], 600, GROUND_LEVEL - 100, PLAYER_SCALE, PLAYER_SCALE);
}

function drawFloor() {
  ctx.fillStyle = "green";
  ctx.fillRect(0, GROUND_LEVEL - cameraOffsetY, canvas.width, 50);
}

function drawObstacles() {
  ctx.fillStyle = "red";
  for (let [x, y, w, h] of obstacles) ctx.fillRect(x, y - cameraOffsetY, w, h);
}

function drawClouds() {
  ctx.fillStyle = "white";
  for (let [radius, volume, r, x, y] of cloudLog) {
    for (let i = 0; i < volume; i++) {
      ctx.beginPath();
      ctx.arc(x+(radius/2)*i,r*(i^2/1+i^2)+y - cameraOffsetY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawDashBar() {
  if (!dashActive) return;
  const barWidth = 400, barHeight = 30;
  const x = (canvas.width - barWidth) / 2, y = 50, radius = 10;
  const filledWidth = Math.floor((dashTimeLeft / dashDuration) * barWidth);

  ctx.fillStyle = "darkred";
  roundRect(ctx, x, y, barWidth, barHeight, radius);
  ctx.fill();

  ctx.fillStyle = "red";
  roundRect(ctx, x, y, filledWidth, barHeight, radius);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.font = "24px 'Comic Neue', cursive";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(dashDirection === 0 ? "Dash Time! <- Left" : "Dash Time! -> Right", canvas.width / 2, y - 5);
}

function drawHUD() {
  if (gameOver) return;
  ctx.fillStyle = "black";
  ctx.font = "28px 'Comic Neue', cursive";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("Score: " + tick, canvas.width - 20, 20);
  ctx.fillText("Phase: " + speedPhase, canvas.width - 20, 50);
}

function drawGameOverScreen() {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "64px 'Comic Neue', cursive";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);

  ctx.font = "28px 'Comic Neue', cursive";
  ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 30);
  ctx.fillText("Highscore: " + highscore, canvas.width / 2, canvas.height / 2 + 60);
  ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 90);
}

// =======================
// Game Logic
// =======================
function triggerGameOver() {
  gameOver = true;
  xs = 0; ys = 0;
  score = tick;
  if (score > highscore) highscore = score;
}

function resetGame() {
  gameOver = false;
  xs = 0;
  ys = 0;
  cameraOffsetX = 0; 
  cameraOffsetY = 0;
  obstacles = [];
  cloudLog = [];
  tick = 0;
  isGrounded = true;
  score = 0;
}

// =======================
// Main Game Loop
// =======================
async function callFrame(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  tick++;
  if (!gameOver) {
  updateSpeedPhase();
  handleInput();
  updateDash();
  updatePlayerPosition();
  updateEnvironment();
  generateObstacles();
  generateClouds();
  updatePlayerAnimation();

  // Drawing
  drawClouds();
  drawFloor();
  drawPlayer();
  drawObstacles();
  drawHUD();
  drawDashBar();
  }
  if (gameOver) drawGameOverScreen();
  await callFrame(50);
  gameLoop();
}

loadImages(IMAGE_SOURCES, () => gameLoop());
