<template>
  <div class="three-editor-wrapper">
    <div ref="containerRef" class="three-editor-canvas" />
    
    <OverlayInfo 
      :html-label-visible="htmlLabelVisible"
      :html-label-text="htmlLabelText"
      :html-label-position="htmlLabelPosition"
    />
    
    <ControlPanel 
      :car-colors="carColors"
      :camera-views="cameraViews"
      :current-color="currentColor"
      :is-auto-rotating="isAutoRotating"
      :is-wheel-rotating="isWheelRotating"
      :is-front-lights-on="isFrontLightsOn"
      :is-rear-lights-on="isRearLightsOn"
      :material-type="materialType"
      :is-exploded="isExploded"
      :are-doors-open="areDoorsOpen"
      @change-color="changeCarColor"
      @set-camera-view="setCameraView"
      @toggle-auto-rotate="isAutoRotating = !isAutoRotating"
      @toggle-wheel-rotation="isWheelRotating = !isWheelRotating"
      @toggle-front-lights="toggleFrontLights"
      @toggle-rear-lights="toggleRearLights"
      @set-material-type="setMaterialType"
      @toggle-explode="toggleExplode"
      @toggle-doors="toggleDoors"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ControlPanel from './ControlPanel.vue'
import OverlayInfo from './OverlayInfo.vue'
import { useThreeScene } from '../composables/useThreeScene'
import { useCarModel } from '../composables/useCarModel'
import { useInteractions } from '../composables/useInteractions'
import { useAnimations } from '../composables/useAnimations'

const containerRef = ref<HTMLDivElement | null>(null)

// 1. Scene Setup
const { initScene, getEditor } = useThreeScene(containerRef)

// 2. Car Model Logic
const { 
  carModel, 
  carRotationContainer, 
  doorObjects, 
  wheelMeshes, 
  explodableParts,
  originalPositions, 
  targetPositions, 
  explodeAnimationProgress,
  doorState,
  currentColor, 
  materialType, 
  isFrontLightsOn,
  isRearLightsOn,
  isExploded,
  areDoorsOpen,
  loadModel, 
  changeCarColor, 
  setMaterialType, 
  toggleFrontLights,
  toggleRearLights,
  toggleExplode,
  toggleDoors
} = useCarModel()

// 3. Interactions Logic
const { 
  initInteractions, 
  htmlLabelVisible, 
  htmlLabelText, 
  htmlLabelPosition, 
  doorHintSprites,
  doorFromHint,
  infoLabel,
  setCurrentCamera,
  updateHtmlLabelPosition
} = useInteractions(
  containerRef, 
  getEditor, 
  carModel, 
  doorObjects, 
  doorState
)

// 4. Animations Logic
const { 
  isAutoRotating, 
  isWheelRotating, 
  startAnimationLoop, 
  setCameraView 
} = useAnimations(
  getEditor,
  carRotationContainer,
  wheelMeshes,
  explodableParts,
  originalPositions,
  targetPositions,
  explodeAnimationProgress,
  doorObjects,
  doorState,
  doorHintSprites,
  doorFromHint,
  infoLabel,
  updateHtmlLabelPosition,
  setCurrentCamera
)

// Constants
const carColors = [
  { name: '经典红', value: '#ff0000' },
  { name: '宝石蓝', value: '#0066ff' },
  { name: '珍珠白', value: '#f0f0f0' },
  { name: '午夜黑', value: '#1a1a1a' },
  { name: '银灰', value: '#808080' },
  { name: '香槟金', value: '#d4af37' },
]

const cameraViews = [
  { name: '前视', icon: '👉', position: { x: 0, y: 2, z: 8 }, target: { x: 0, y: 1, z: 0 } },
  { name: '侧视', icon: '👆', position: { x: 8, y: 2, z: 0 }, target: { x: 0, y: 1, z: 0 } },
  { name: '顶视', icon: '⬆️', position: { x: 0, y: 10, z: 0.1 }, target: { x: 0, y: 0, z: 0 } },
  { name: '全景', icon: '🔍', position: { x: 6, y: 4, z: 8 }, target: { x: 0, y: 1, z: 0 } },
]

onMounted(() => {
  const editor = initScene()
  if (editor) {
    loadModel(editor)
    initInteractions()
    startAnimationLoop(isExploded)
  }
})
</script>

<style scoped>
.three-editor-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #0d1117;
  overflow: hidden;
}

.three-editor-canvas {
  width: 100%;
  height: 100%;
}
</style>
