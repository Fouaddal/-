import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 1. Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  5000
);
camera.position.set(400, 200, 600);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;

// Keyboard Movement
const move = { forward: false, backward: false, left: false, right: false };
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW') move.forward = true;
  if (e.code === 'KeyS') move.backward = true;
  if (e.code === 'KeyA') move.left = true;
  if (e.code === 'KeyD') move.right = true;
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') move.forward = false;
  if (e.code === 'KeyS') move.backward = false;
  if (e.code === 'KeyA') move.left = false;
  if (e.code === 'KeyD') move.right = false;
});

function updateCameraMovement() {
  const speed = 5;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const right = new THREE.Vector3();
  right.crossVectors(direction, camera.up).normalize();
  if (move.forward) camera.position.addScaledVector(direction, speed);
  if (move.backward) camera.position.addScaledVector(direction, -speed);
  if (move.left) camera.position.addScaledVector(right, -speed);
  if (move.right) camera.position.addScaledVector(right, speed);
}

// 2. Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);
const sunLight = new THREE.PointLight(0xffffff, 350000, 4000);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 4000;

// 3. Texture loader
const loader = new THREE.TextureLoader();

// --- NEW: Create Starfield Background ---
const starfieldGeometry = new THREE.SphereGeometry(2000, 64, 64);
const starfieldMaterial = new THREE.MeshBasicMaterial({
    map: loader.load('/images/starfield.jpg'),
    side: THREE.BackSide // Render the texture on the inside of the sphere
});
const starfieldMesh = new THREE.Mesh(starfieldGeometry, starfieldMaterial);
scene.add(starfieldMesh);
// --- End of Starfield ---

// 4. Solar System Root
const solarSystemGroup = new THREE.Group();
scene.add(solarSystemGroup);

// 5. Sun
const sunGeometry = new THREE.SphereGeometry(50, 64, 64);
const sunMaterial = new THREE.MeshBasicMaterial({
  map: loader.load('/images/sunmap.jpg'),
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
solarSystemGroup.add(sun);
solarSystemGroup.add(sunLight);

// 6. Planet data
const planetData = [
  ['Mercury', 80, 8, '/images/mercurymap.jpg', 0.04],
  ['Venus', 120, 18, '/images/venusmap.jpg', 0.015],
  ['Earth', 160, 20, '/images/earthmap1k.jpg', 0.01],
  ['Mars', 200, 12, '/images/marsmap1k.jpg', 0.008],
  ['Jupiter', 280, 60, '/images/jupitermap.jpg', 0.002],
  ['Saturn', 400, 50, '/images/saturnmap.jpg', 0.001],
  ['Uranus', 520, 25, '/images/uranusmap.jpg', 0.0005],
  ['Neptune', 640, 24, '/images/neptunemap.jpg', 0.0003],
];

// 7. Create planets and orbits
const planets = [];

planetData.forEach(([name, dist, radius, texturePath, orbitSpeed]) => {
  const geometry = new THREE.SphereGeometry(radius, 64, 64);
  const material = new THREE.MeshPhongMaterial({
    map: loader.load(texturePath),
    shininess: 10,
    specular: new THREE.Color(0x111111),
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(dist, 0, 0);

  const orbitGroup = new THREE.Group();
  orbitGroup.add(mesh);
  solarSystemGroup.add(orbitGroup);

  let moonOrbitGroup;

  // Special case for Earth's Moon
  if (name === 'Earth') {
    const moonRadius = 5;
    const moonDist = 30;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 32, 32);
    const moonMat = new THREE.MeshPhongMaterial({
        map: loader.load('/images/moonmap.jpg'),
        shininess: 5,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.castShadow = true;
    moonMesh.receiveShadow = true;
    moonMesh.position.x = moonDist;
    moonOrbitGroup = new THREE.Group();
    moonOrbitGroup.add(moonMesh);
    mesh.add(moonOrbitGroup);
  }

  // Special case for Saturn's rings
  if (name === 'Saturn') {
    const ringGeo = new THREE.RingGeometry(radius + 10, radius + 40, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      map: loader.load('/images/saturnringmap.png'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI * 0.5;
    mesh.add(ringMesh);
  }

  // Creating the main orbit line
  const ringGeom = new THREE.RingGeometry(dist - 0.1, dist + 0.1, 128);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x555555,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  planets.push({ name, mesh, orbitGroup, orbitSpeed, moonOrbitGroup });
});

// 8. Animation
let sunY = 0;
const moonOrbitSpeed = 0.05;

function animate() {
  requestAnimationFrame(animate);

  sunY += 0.1;
  solarSystemGroup.position.y = sunY;

  sun.rotation.y += 0.002;

  planets.forEach((p) => {
    p.mesh.rotation.y += 0.01;
    p.orbitGroup.rotation.y += p.orbitSpeed;
    if (p.moonOrbitGroup) {
      p.moonOrbitGroup.rotation.y += moonOrbitSpeed;
    }
  });

  updateCameraMovement();
  controls.update();
  renderer.render(scene, camera);
}
animate();

// 9. Resize support
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});