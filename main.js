// --- 3D Birthday Cake Interactive Page ---
// Uses: three.js, anime.js, canvas-confetti (all via CDN)

// === 1. DOM Setup ===
const hintText = document.getElementById('hint-text');
const celebrationText = document.getElementById('celebration-text');

// Create and insert the canvas for three.js
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setClearColor(0x000000, 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.id = 'three-canvas';
document.body.appendChild(renderer.domElement);

// === 2. Scene, Camera, Controls ===
const scene = new THREE.Scene();
let bgColor = { color: '#000' };


// Camera
const cameraDistance = 7;
const cameraY = 5;
const lookAtY = 1.2;
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, cameraY, cameraDistance);
camera.lookAt(0, lookAtY, 0);

// Responsive resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


// === 3. Cake Geometry (grouped for rotation) ===
const cakeGroup = new THREE.Group();
scene.add(cakeGroup);

// Bottom tier
const bottomGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.7, 64);
const bottomMat = new THREE.MeshPhongMaterial({ color: 0xfff5d7, shininess: 40 });
const bottomTier = new THREE.Mesh(bottomGeo, bottomMat);
bottomTier.position.y = 0.35;
cakeGroup.add(bottomTier);

// Top tier
const topGeo = new THREE.CylinderGeometry(1, 1.1, 0.5, 64);
const topMat = new THREE.MeshPhongMaterial({ color: 0xffcad4, shininess: 60 });
const topTier = new THREE.Mesh(topGeo, topMat);
topTier.position.y = 0.85;
cakeGroup.add(topTier);

// === 4. Candles on Heart Curve ===
const candleCount = 18;
const heartRadius = 0.9;
const heartPoints = [];
for (let i = 0; i < candleCount; i++) {
  const t = (i / candleCount) * 2 * Math.PI;
  // Heart parametric curve (x, z)
  const x = heartRadius * 16 * Math.pow(Math.sin(t), 3) / 16;
  const z = -heartRadius * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
  heartPoints.push({ x, z });
}

const candleMeshes = [];
const flameMeshes = [];
const flameLights = [];
const flameStates = Array(candleCount).fill(true);

for (let i = 0; i < candleCount; i++) {
  // Candle body
  const candleGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.32, 16);
  const candleMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 80 });
  const candle = new THREE.Mesh(candleGeo, candleMat);
  candle.position.set(heartPoints[i].x, 1.13, heartPoints[i].z);
  cakeGroup.add(candle);
  candleMeshes.push(candle);

  // Flame (cone) - larger for easier touch
  const flameGeo = new THREE.ConeGeometry(0.07, 0.21, 16); // was 0.045, 0.13
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(heartPoints[i].x, 1.39, heartPoints[i].z); // raise slightly for new size
  cakeGroup.add(flame);
  flameMeshes.push(flame);

  // Flame light
  const light = new THREE.PointLight(0xffa040, 0.5, 1.2, 2);
  light.position.set(heartPoints[i].x, 1.33, heartPoints[i].z);
  cakeGroup.add(light);
  flameLights.push(light);
}

// === 5. Overhead Celebration Light (initially off) ===
const overheadLight = new THREE.PointLight(0xffe6b0, 0, 30, 2);
overheadLight.position.set(0, 6, 3);
scene.add(overheadLight);

// === 5b. Hemisphere Light for natural ambient ===
const hemiLight = new THREE.HemisphereLight(0xfffbe6, 0xcad4ff, 0);
hemiLight.position.set(0, 6, 6);
scene.add(hemiLight);

// === 6. Ambient Light (soft fill) ===
const ambient = new THREE.AmbientLight(0xffffff, 0.18);
scene.add(ambient);

// === 7. Cake Plate ===
const plateGeo = new THREE.CylinderGeometry(1.8, 1.9, 0.08, 64);
const plateMat = new THREE.MeshPhongMaterial({
  color: 0xdeb887, // burlywood
  shininess: 18,
  specular: 0x8b5c2a // a brownish highlight
});
const plate = new THREE.Mesh(plateGeo, plateMat);
plate.position.y = 0.01;
cakeGroup.add(plate);


// === 8. Raycaster for Flame Interaction ===
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function getIntersects(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  let x, y;
  if (event.touches) {
    x = event.touches[0].clientX;
    y = event.touches[0].clientY;
  } else {
    x = event.clientX;
    y = event.clientY;
  }
  mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  return raycaster.intersectObjects(flameMeshes.filter((_, i) => flameStates[i]));
}

let hintTimeout, hintShown = false, firstFlameClicked = false, celebrationStarted = false;

function showHint() {
  if (!hintShown && !firstFlameClicked) {
    hintText.style.opacity = 1;
    hintShown = true;
  }
}
function hideHint() {
  if (hintShown) {
    anime({ targets: hintText, opacity: 0, duration: 500, easing: 'easeInOutQuad' });
    hintShown = false;
  }
}

function showCelebrationText() {
  celebrationText.style.opacity = 1;
}

function hideCelebrationText() {
  celebrationText.style.opacity = 0;
}

// === 9. Flame Click Handler ===
function onPointerDown(event) {
  if (celebrationStarted) return;
  const intersects = getIntersects(event);
  if (intersects.length > 0) {
    const idx = flameMeshes.indexOf(intersects[0].object);
    if (flameStates[idx]) {
      // Extinguish this flame
      flameStates[idx] = false;
      anime({
        targets: flameMeshes[idx].material,
        opacity: 0,
        duration: 350,
        easing: 'easeInOutQuad',
        update: () => { flameMeshes[idx].visible = flameMeshes[idx].material.opacity > 0.05; },
        complete: () => { flameMeshes[idx].visible = false; }
      });
      anime({
        targets: flameLights[idx],
        intensity: 0,
        duration: 350,
        easing: 'easeInOutQuad'
      });
      if (!firstFlameClicked) {
        firstFlameClicked = true;
        hideHint();
      }
      // Check if all flames are out
      if (flameStates.every(f => !f)) {
        triggerCelebration();
      }
    }
  }
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('touchstart', onPointerDown);

// === 10. Celebration Sequence ===
function triggerCelebration() {
  celebrationStarted = true;
  // 1. Background fade to pale pink
  anime({
    targets: bgColor,
    color: '#ffe6ef',
    duration: 1800,
    easing: 'easeInOutQuad',
    update: () => {
      renderer.setClearColor(bgColor.color);
    }
  });
  // 2. Overhead light fade in
  anime({
    targets: overheadLight,
    intensity: 70,
    duration: 1400,
    easing: 'easeInOutQuad'
  });
  anime({
    targets: hemiLight,
    intensity: 2.2,
    duration: 1400,
    easing: 'easeInOutQuad'
  });

  // 3. Cake rotation starts
  cakeRotation = true;
  // 4. Confetti bursts
  confettiBurst();
  setTimeout(confettiBurst, 400);
  // 5. Celebration text fade in
  anime({
    targets: celebrationText,
    opacity: 1,
    duration: 1200,
    easing: 'easeInOutQuad'
  });
}

// setTimeout(triggerCelebration, 1000); // test trigger

function confettiBurst() {
  confetti({
    particleCount: 80,
    spread: 100,
    angle: 65,
    origin: { x: 0.2, y: 0.4 },
    colors: ['#ffcad4', '#fff5d7', '#ffe6ef', '#ff5e7e', '#fff']
  });
  confetti({
    particleCount: 60,
    spread: 100,
    angle: 130,
    origin: { x: 0.9, y: 0.3 },
    colors: ['#ffcad4', '#fff5d7', '#ffe6ef', '#ff5e7e', '#fff']
  });
}

// === 11. Animation Loop ===
let cakeRotation = false;
function animate() {
  requestAnimationFrame(animate);
  if (cakeRotation) {
    cakeGroup.rotation.y += 0.005;
  }
  // Flicker flames
  for (let i = 0; i < candleCount; i++) {
    if (flameStates[i]) {
      flameMeshes[i].scale.y = 1 + 0.18 * Math.sin(Date.now() * 0.008 + i * 0.7);
      flameMeshes[i].scale.x = 1 + 0.08 * Math.cos(Date.now() * 0.012 + i * 1.1);
      flameLights[i].intensity = 0.4 + 0.25 * Math.abs(Math.sin(Date.now() * 0.01 + i));
    }
  }
  renderer.render(scene, camera);
}
animate();

// === 12. Hint Text Timer ===
hideCelebrationText();
hintText.style.opacity = 0;
clearTimeout(hintTimeout);
hintTimeout = setTimeout(showHint, 3000);
