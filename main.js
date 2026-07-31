import * as THREE from 'three';
import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let camera, scene, renderer, effect;
let mooseModel;
let clock = new THREE.Clock();

// Track resolution to avoid unnecessary DOM recreation on every pixel scrolled
let currentResolution = 0.2; 
const BASE_RESOLUTION = 0.20; 

// Ultra-low floor (renders massive macro characters across the screen at maximum scroll)
const MIN_RESOLUTION = 0.02; 

init();

function init() {
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 500);

  camera.fov = 30; 
  camera.updateProjectionMatrix(); 

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Hemisphere Lighting setup
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 1.5);
  hemisphereLight.position.set(0, 500, 0);
  scene.add(hemisphereLight);

  // Load the GLB Moose Model
  const loader = new GLTFLoader();
  loader.load(
    'assets/moose.glb',
    (gltf) => {
      mooseModel = gltf.scene;

      mooseModel.traverse((child) => {
        if (child.isMesh) {
          child.material.roughness = 1;
          child.material.metalness = 0.1;
        }
      });

      const box = new THREE.Box3().setFromObject(mooseModel);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      // Center geometry precisely on its own origin
      mooseModel.position.x = -center.x;
      mooseModel.position.y = -center.y;
      mooseModel.position.z = -center.z;

      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 300; 
      const scale = targetSize / maxDim;
      mooseModel.scale.multiplyScalar(scale);

      scene.add(mooseModel);
    },
    undefined,
    (error) => {
      console.error('An error happened loading the moose model:', error);
    }
  );

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);

  // Create initial ASCII Effect
  createAsciiEffect(BASE_RESOLUTION);

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('scroll', onScroll);
}

// Helper to construct / swap the AsciiEffect
function createAsciiEffect(resolution) {
  const customCharSet = ' øØ'; 
  const oldDom = effect ? effect.domElement : null;

  effect = new AsciiEffect(renderer, customCharSet, { 
    invert: true, 
    resolution: resolution, 
    scale: 0.835
  });
  
  effect.setSize(window.innerWidth, window.innerHeight);
  effect.domElement.style.backgroundColor = '#0f0f12';
  effect.domElement.id = 'ascii-container';

  if (oldDom && oldDom.parentNode) {
    oldDom.parentNode.replaceChild(effect.domElement, oldDom);
  } else {
    document.body.appendChild(effect.domElement);
  }

  currentResolution = resolution;
}

// Single, clean onScroll handler
function onScroll() {
  const scrollY = window.scrollY;
  const maxScroll = 2000; // Distance over which pixelation occurs
  
  // 1. DYNAMIC RESOLUTION SCALING (0px to 2000px)
  const progress = Math.min(scrollY / maxScroll, 1);

  const logBase = Math.log(BASE_RESOLUTION);
  const logMin = Math.log(MIN_RESOLUTION);
  
  let newResolution = Math.exp(logBase + progress * (logMin - logBase));

  if (newResolution > 0.05) {
    newResolution = Math.round(newResolution * 100) / 100;
  } else if (newResolution > 0.015) {
    newResolution = Math.round(newResolution * 200) / 200;
  } else {
    newResolution = Math.round(newResolution * 500) / 500;
  }

  newResolution = Math.max(newResolution, MIN_RESOLUTION);

  if (newResolution !== currentResolution) {
    createAsciiEffect(newResolution);
  }

  // 2. SCROLL OFF-SCREEN TRANSLATION (Past 2000px)
  const container = effect ? effect.domElement : null;
  if (container) {
    if (scrollY > maxScroll) {
      // Calculate how far past maxScroll the user has scrolled
      const overflowScroll = scrollY - maxScroll;
      container.style.transform = `translateY(-${overflowScroll}px)`;
    } else {
      // Keep fixed in viewport during the pixelation sequence
      container.style.transform = 'translateY(0px)';
    }
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  effect.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  const elapsedTime = clock.getElapsedTime();

  if (mooseModel) {
    mooseModel.rotation.y = elapsedTime * 0.4;
  }

  effect.render(scene, camera);
}