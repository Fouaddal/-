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

// 2. Lighting - Positioned at the sun and pointing outward
const sunlight = new THREE.DirectionalLight(0xffffff, 1);
sunlight.castShadow = true;
sunlight.shadow.mapSize.width = 2048;
sunlight.shadow.mapSize.height = 2048;
sunlight.shadow.camera.near = 0.5;
sunlight.shadow.camera.far = 2000;
sunlight.shadow.camera.left = -500;
sunlight.shadow.camera.right = 500;
sunlight.shadow.camera.top = 500;
sunlight.shadow.camera.bottom = -500;
scene.add(sunlight);

// Add ambient light (reduced to emphasize directional lighting)
const ambientLight = new THREE.AmbientLight(0x101010, 0.2);
scene.add(ambientLight);

// 3. Texture loader
const loader = new THREE.TextureLoader();

// 4. Solar System Root
const solarSystemGroup = new THREE.Group();
scene.add(solarSystemGroup);

// 5. Sun
const sunGeometry = new THREE.SphereGeometry(50, 64, 64);
const sunMaterial = new THREE.MeshBasicMaterial({
  map: loader.load('/images/sunmap.jpg'),
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.set(0, 0, 0);
solarSystemGroup.add(sun);

// Position the sunlight at the sun's location
sunlight.position.copy(sun.position);

// 6. Planet data
const planetData = [
  ['Mercury', 80, 8, '/images/mercurymap.jpg', 0.04],
  ['Venus', 120, 18, '/images/venusmap.jpg', 0.015],
  ['Earth', 160, 20, '/images/earthmap1k.jpg', 0.01],
  ['Mars', 200, 12, '/images/marsmap1k.jpg', 0.008],
  ['Jupiter', 280, 60, '/images/jupitermap.jpg', 0.002],
];

// 7. Create planets
const planets = [];

planetData.forEach(([name, dist, radius, texturePath, orbitSpeed]) => {
  const geometry = new THREE.SphereGeometry(radius, 64, 64);
  const material = new THREE.MeshPhongMaterial({
    map: loader.load(texturePath),
    shininess: 30, // Increased shininess for more specular highlight
    specular: new THREE.Color(0x111111),
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(dist, 0, 0);

  const orbitGroup = new THREE.Group();
  orbitGroup.add(mesh);
  solarSystemGroup.add(orbitGroup);

  const ringGeom = new THREE.RingGeometry(dist - 0.1, dist + 0.1, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x555555,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  planets.push({ name, mesh, orbitGroup, orbitSpeed });
});

// 8. Animation
let sunY = 0;

function animate() {
  requestAnimationFrame(animate);

  // Move the whole solar system up
  sunY += 0.1;
  solarSystemGroup.position.y = sunY;

  // Sun rotation
  sun.rotation.y += 0.002;

  // Update sunlight position to always be at the sun
  sunlight.position.copy(sun.position);
  
  // Update each planet's lighting
  planets.forEach((p) => {
    p.mesh.rotation.y += 0.01;
    p.orbitGroup.rotation.y += p.orbitSpeed;
    
    // Get the planet's world position
    const planetWorldPosition = new THREE.Vector3();
    p.mesh.getWorldPosition(planetWorldPosition);
    
    // Update the sunlight target to point from sun to planet
    sunlight.target.position.copy(planetWorldPosition);
  });

  // Ensure the light target's matrix is updated
  sunlight.target.updateMatrixWorld();

  // Update camera movement
  updateCameraMovement();

  // Update controls (for mouse interaction)
  controls.update();

  // Render the scene
  renderer.render(scene, camera);
}
animate();

// 9. Resize support
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});