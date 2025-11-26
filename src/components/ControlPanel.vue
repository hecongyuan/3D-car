<template>
  <div class="control-panel">
    <div class="panel-section">
      <h3>🎨 车身颜色</h3>
      <div class="color-buttons">
        <button 
          v-for="color in carColors" 
          :key="color.name"
          :class="['color-btn', { active: currentColor === color.value }]"
          :style="{ backgroundColor: color.value }"
          :title="color.name"
          @click="$emit('changeColor', color.value)"
        >
          <span v-if="currentColor === color.value">✓</span>
        </button>
      </div>
    </div>

    <div class="panel-section">
      <h3>📷 视角预设</h3>
      <div class="view-buttons">
        <button 
          v-for="view in cameraViews" 
          :key="view.name"
          @click="$emit('setCameraView', view)"
          class="view-btn"
        >
          {{ view.icon }} {{ view.name }}
        </button>
      </div>
    </div>

    <div class="panel-section">
      <h3>🔄 旋转控制</h3>
      <button @click="$emit('toggleAutoRotate')" class="action-btn">
        {{ isAutoRotating ? '⏸ 暂停旋转' : '▶️ 自动旋转' }}
      </button>
    </div>

    <div class="panel-section">
      <h3>🚗 车轮动画</h3>
      <button @click="$emit('toggleWheelRotation')" class="action-btn">
        {{ isWheelRotating ? '⏹ 停止' : '▶️ 启动' }}
      </button>
    </div>

    <div class="panel-section">
      <h3>💡 车灯控制</h3>
      <div class="light-buttons">
        <button @click="$emit('toggleFrontLights')" class="action-btn headlight-btn">
          {{ isFrontLightsOn ? '🔦 关闭前灯' : '💡 打开前灯' }}
        </button>
        <button @click="$emit('toggleRearLights')" class="action-btn taillight-btn">
          {{ isRearLightsOn ? '🔦 关闭尾灯' : '🚨 打开尾灯' }}
        </button>
      </div>
    </div>

    <div class="panel-section">
      <h3>💡 材质</h3>
      <div class="material-buttons">
        <button @click="$emit('setMaterialType', 'metallic')" :class="['material-btn', { active: materialType === 'metallic' }]">
          ✨ 金属
        </button>
        <button @click="$emit('setMaterialType', 'matte')" :class="['material-btn', { active: materialType === 'matte' }]">
          🎨 哑光
        </button>
      </div>
    </div>

    <div class="panel-section">
      <h3>🔧 模型拆解</h3>
      <div class="action-buttons">
        <button @click="$emit('toggleDoors')" class="action-btn">
          {{ areDoorsOpen ? '🚪 关闭车门' : '🚪 打开车门' }}
        </button>
        <button @click="$emit('toggleExplode')" class="action-btn explode-btn">
          {{ isExploded ? '🔄 还原模型' : '💥 拆解模型' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  carColors: Array<{ name: string; value: string }>;
  cameraViews: Array<{ name: string; icon: string; position: any; target: any }>;
  currentColor: string;
  isAutoRotating: boolean;
  isWheelRotating: boolean;
  isFrontLightsOn: boolean;
  isRearLightsOn: boolean;
  materialType: 'metallic' | 'matte';
  isExploded: boolean;
  areDoorsOpen: boolean;
}>();

defineEmits<{
  (e: 'changeColor', color: string): void;
  (e: 'setCameraView', view: any): void;
  (e: 'toggleAutoRotate'): void;
  (e: 'toggleWheelRotation'): void;
  (e: 'toggleFrontLights'): void;
  (e: 'toggleRearLights'): void;
  (e: 'setMaterialType', type: 'metallic' | 'matte'): void;
  (e: 'toggleExplode'): void;
  (e: 'toggleDoors'): void;
}>();
</script>

<style scoped>
.control-panel {
  position: absolute;
  right: 24px;
  top: 24px;
  width: 280px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: rgba(13, 17, 23, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  color: #e6edf3;
}

.panel-section {
  margin-bottom: 24px;
}

.panel-section:last-child {
  margin-bottom: 0;
}

.panel-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 颜色按钮 */
.color-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.color-btn {
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

.color-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
}

.color-btn.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

/* 视角按钮 */
.view-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.view-btn {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e6edf3;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  font-weight: 500;
}

.view-btn:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  transform: translateY(-1px);
}

/* 操作按钮 */
.action-btn {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #e6edf3;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.action-btn:active {
  transform: translateY(0);
}

.headlight-btn:hover {
  background: rgba(234, 179, 8, 0.15);
  border-color: rgba(234, 179, 8, 0.5);
  color: #facc15;
}

.taillight-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.5);
  color: #f87171;
}

.light-buttons, .action-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.explode-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.5);
  color: #f87171;
}

/* 材质按钮 */
.material-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.material-btn {
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #e6edf3;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.material-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.material-btn.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #60a5fa;
}
</style>
