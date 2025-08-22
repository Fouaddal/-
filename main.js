import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
camera.position.set(400, 200, 600);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
const loader = new THREE.TextureLoader();

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);
const sunLight = new THREE.PointLight(0xffffff, 350000, 4000);
sunLight.castShadow = true;

// --- Groups ---
const solarSystemGroup = new THREE.Group();
scene.add(solarSystemGroup);
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(50, 64, 64),
  new THREE.MeshBasicMaterial({ map: loader.load('/images/sunmap.jpg') })
);
solarSystemGroup.add(sun);
solarSystemGroup.add(sunLight);

// --- Starfield ---
const starfield = new THREE.Mesh(
  new THREE.SphereGeometry(5000, 64, 64),
  new THREE.MeshBasicMaterial({ map: loader.load('/images/starfield.jpg'), side: THREE.BackSide })
);
scene.add(starfield);

// --- Asteroid + Impact ---
const asteroidGeo = new THREE.IcosahedronGeometry(7, 1);
for (let i = 0; i < asteroidGeo.attributes.position.count; i++) {
  const v = new THREE.Vector3().fromBufferAttribute(asteroidGeo.attributes.position, i);
  v.multiplyScalar(1 + (Math.random() - 0.5) * 0.4);
  asteroidGeo.attributes.position.setXYZ(i, v.x, v.y, v.z);
}
const asteroidMat = new THREE.MeshPhongMaterial({ map: loader.load('/images/asteroid.jpg') });
const asteroid = new THREE.Mesh(asteroidGeo, asteroidMat);
asteroid.castShadow = true;
asteroid.visible = false;
scene.add(asteroid);

const impactSphere = new THREE.Mesh(
  new THREE.SphereGeometry(10, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 })
);
impactSphere.visible = false;
solarSystemGroup.add(impactSphere);

const debrisGroup = new THREE.Group();
scene.add(debrisGroup);

// --- Planet Creation ---
let earthMesh = null;
const planetData = [
    // Adjusted distances for better visual spacing
    { name: 'Mercury', distance: 100, radius: 8, texture: '/images/mercurymap.jpg', speed: 0.04 },
    { name: 'Venus', distance: 160, radius: 18, texture: '/images/venusmap.jpg', speed: 0.015 },
    { name: 'Earth', distance: 240, radius: 20, texture: '/images/earthmap1k.jpg', speed: 0.01, moons: 1 },
    { name: 'Mars', distance: 350, radius: 12, texture: '/images/marsmap1k.jpg', speed: 0.008, moons: 2 },
    { name: 'Jupiter', distance: 600, radius: 60, texture: '/images/jupitermap.jpg', speed: 0.002, moons: 9 },
    // *** CHANGE 1: Added axialTilt property to Saturn's data ***
    { name: 'Saturn', distance: 1000, radius: 50, texture: '/images/saturnmap.jpg', speed: 0.001, moons: 14, axialTilt: 26.7 },
    { name: 'Uranus', distance: 1500, radius: 25, texture: '/images/uranusmap.jpg', speed: 0.0005, moons:3 },
    { name: 'Neptune', distance: 2100, radius: 24, texture: '/images/neptunemap.jpg', speed: 0.0003 , moons:2},
];
const planets = [];

// *** CHANGE 2: Update the loop to accept the new 'axialTilt' property ***
planetData.forEach(({ name, distance, radius, texture, speed, moons, axialTilt }) => {
  const geo = new THREE.SphereGeometry(radius, 64, 64);
  const mat = new THREE.MeshPhongMaterial({ map: loader.load(texture), shininess: 10 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // *** CHANGE 3: Apply the tilt to the planet mesh if it exists ***
  if (axialTilt) {
      mesh.rotation.z = THREE.MathUtils.degToRad(axialTilt);
  }

  // mesh.position.set(distance, 0, 0);
  // OPTIONAL: Real orbital inclinations in degrees
const inclinations = {
  Mercury: 7.0,
  Venus: 3.4,
  Earth: 0.0,
  Mars: 1.9,
  Jupiter: 1.3,
  Saturn: 2.5,
  Uranus: 0.8,
  Neptune: 1.8
};

const inclinationDeg = inclinations[name] || 0;
const inclinationY = Math.tan(THREE.MathUtils.degToRad(inclinationDeg)) * distance;
mesh.position.set(distance, inclinationY, 0);


  const orbitGroup = new THREE.Group();
  orbitGroup.add(mesh);
  solarSystemGroup.add(orbitGroup);

  if (name === 'Earth') {
    earthMesh = mesh;
  }
  
  const planetMoonsData = [];
  if (moons > 0) {
    for (let i = 0; i < moons; i++) {
        const moonRadius = radius * (Math.random() * 0.08 + 0.04);
        const moonDistance = radius + moonRadius + 10 + Math.random() * 15;
        const moonSpeed = (Math.random() + 0.2) * 0.05;

        const moonGeo = new THREE.SphereGeometry(moonRadius, 16, 16);
        const moonMat = new THREE.MeshPhongMaterial({ color: new THREE.Color(0xcccccc).multiplyScalar(0.7 + Math.random() * 0.3) });
        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        moonMesh.position.x = moonDistance;

        const moonOrbitGroup = new THREE.Group();
        moonOrbitGroup.add(moonMesh);
        moonOrbitGroup.rotation.y = Math.random() * Math.PI * 2;
        
        mesh.add(moonOrbitGroup);
        planetMoonsData.push({ group: moonOrbitGroup, speed: moonSpeed });
    }
  }

  if (name === 'Saturn') {
    const ringGeo = new THREE.RingGeometry(radius + 10, radius + 40, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      map: loader.load('/images/saturnringmap.png'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    mesh.add(ring);
  }

  const orbitRing = new THREE.Mesh(
    new THREE.RingGeometry(distance - 0.1, distance + 0.1, 128),
    new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
  );
  orbitRing.rotation.x = Math.PI / 2;
  scene.add(orbitRing);

  planets.push({ name, mesh, orbitGroup, orbitSpeed: speed, moonData: planetMoonsData });
});

// --- State ---
let sceneMode = 'peaceful';
let isAsteroidMoving = false;
let isExploding = false;
let sunY = 0;
let explosionProgress = 0;
const explosionDuration = 120;
const asteroidSpeed = 7;
let cameraShakeFrames = 0;
let flashGlow = null;

// --- Keyboard Movement ---
const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  up: false,
  down: false,
};
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': moveState.forward = true; break;
        case 'KeyS': moveState.backward = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyD': moveState.right = true; break;
        case 'Space': moveState.up = true; break;
        case 'ShiftLeft': moveState.down = true; break;
    }
});
document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': moveState.forward = false; break;
        case 'KeyS': moveState.backward = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyD': moveState.right = false; break;
        case 'Space': moveState.up = false; break;
        case 'ShiftLeft': moveState.down = false; break;
    }
});

function updateCameraMovement() {
    const speed = 10;
    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();

    camera.getWorldDirection(direction);
    right.crossVectors(camera.up, direction).normalize();

    if (moveState.forward) camera.position.addScaledVector(direction, speed);
    if (moveState.backward) camera.position.addScaledVector(direction, -speed);
    if (moveState.left) camera.position.addScaledVector(right, speed);
    if (moveState.right) camera.position.addScaledVector(right, -speed);
    if (moveState.up) camera.position.y += speed;
    if (moveState.down) camera.position.y -= speed;
}

// --- Impact Button Logic ---
const button = document.getElementById('impactButton');
button.addEventListener('click', () => {
  if (sceneMode === 'peaceful') startImpactSequence();
  else resetScene();
});

function startImpactSequence() {
  if (!earthMesh || isAsteroidMoving || isExploding) return;
  const earthPos = earthMesh.getWorldPosition(new THREE.Vector3());
  const start = earthPos.clone().add(new THREE.Vector3(300, 300, -300));
  asteroid.position.copy(start);
  asteroid.visible = true;
  isAsteroidMoving = true;
  sceneMode = 'impact';
  button.innerText = 'Reset Scene';
  button.style.backgroundColor = '#4cae4c';
}

function resetScene() {
  isAsteroidMoving = false;
  isExploding = false;
  asteroid.visible = false;
  impactSphere.visible = false;
  debrisGroup.clear();

  if (flashGlow) {
    scene.remove(flashGlow);
    flashGlow = null;
  }

  sunY = 0;
  solarSystemGroup.position.y = 0;
  sceneMode = 'peaceful';
  if (earthMesh) {
    earthMesh.material.color.set(0xffffff);
  }
  impactSphere.scale.set(1, 1, 1);
  button.innerText = 'Trigger Asteroid Impact';
  button.style.backgroundColor = '#c9302c';
}

// --- Animate Loop ---
function animate() {
  requestAnimationFrame(animate);

  updateCameraMovement(); // ✅ Process keyboard input each frame

  // controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()));

  sunY += 0.1;
  solarSystemGroup.position.y = sunY;
  sun.rotation.y += 0.002;
  
  planets.forEach(p => {
    p.mesh.rotation.y += 0.01;
    p.orbitGroup.rotation.y += p.orbitSpeed;
    p.moonData.forEach(moon => {
        moon.group.rotation.y += moon.speed;
    });
  });

  if (isAsteroidMoving && earthMesh) {
    const earthPos = earthMesh.getWorldPosition(new THREE.Vector3());
    const dir = new THREE.Vector3().subVectors(earthPos, asteroid.position).normalize();
    asteroid.position.addScaledVector(dir, asteroidSpeed);
    asteroid.lookAt(earthPos);

    if (asteroid.position.distanceTo(earthPos) < 20) {
      isAsteroidMoving = false;
      asteroid.visible = false;
      isExploding = true;
      explosionProgress = 0;

      const localExplosionPos = solarSystemGroup.worldToLocal(earthPos.clone());
      impactSphere.position.copy(localExplosionPos);
      impactSphere.visible = true;
      earthMesh.material.color.set(0xff3300);

      cameraShakeFrames = 100;

      flashGlow = new THREE.Mesh(
        new THREE.SphereGeometry(20, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
      );
      const worldExplosionPos = earthMesh.getWorldPosition(new THREE.Vector3());
      flashGlow.position.copy(worldExplosionPos);
      scene.add(flashGlow);

      for (let i = 0; i < 30; i++) {
        const debris = new THREE.Mesh(
          new THREE.SphereGeometry(1 + Math.random() * 1.5, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff6600 })
        );
        debris.position.copy(asteroid.position);
        debris.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 30
        );
        debrisGroup.add(debris);
      }
    }
  }

  if (isExploding) {
    explosionProgress++;
    const scale = 1.0 - explosionProgress / explosionDuration;
    impactSphere.scale.set(scale, scale, scale);
    impactSphere.material.opacity = 0.8 * scale;

    if (flashGlow) {
      flashGlow.scale.multiplyScalar(1.13);
      flashGlow.material.opacity -= 0.03;
      if (flashGlow.material.opacity <= 0) {
        scene.remove(flashGlow);
        flashGlow = null;
      }
    }

    debrisGroup.children.forEach(d => {
      d.position.add(d.velocity.clone().multiplyScalar(0.5));
    });

    if (explosionProgress >= explosionDuration) {
      isExploding = false;
      impactSphere.visible = false;
    }
  }

  if (cameraShakeFrames > 0) {
    const shake = 2;
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    cameraShakeFrames--;
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});