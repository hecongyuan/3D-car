<template>
  <div>
    <!-- HTML 3D标签覆盖层 -->
    <div 
      v-if="htmlLabelVisible" 
      class="html-3d-label"
      :style="{
        left: htmlLabelPosition.x + 'px',
        top: htmlLabelPosition.y + 'px'
      }"
    >
      <div class="label-content">
        {{ htmlLabelText }}
      </div>
    </div>

    <div class="overlay">
      <h1>🚗 3D 汽车交互展示</h1>
      <p>使用右侧控制面板体验各种交互功能</p>
      <p>作者：何聪元</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  htmlLabelVisible: boolean;
  htmlLabelText: string;
  htmlLabelPosition: { x: number; y: number };
}>();
</script>

<style scoped>
/* HTML 3D标签 */
.html-3d-label {
  position: absolute;
  pointer-events: none;
  transform: translate(-50%, -100%);
  z-index: 1000;
  animation: fadeIn 0.3s ease-in;
}

.label-content {
  padding: 16px 32px;
  background: linear-gradient(135deg, rgba(20, 20, 50, 0.95), rgba(10, 10, 30, 0.95));
  border: 3px solid #00d4ff;
  border-radius: 16px;
  color: #ffffff;
  font-size: 20px;
  font-weight: bold;
  text-shadow: 
    0 0 10px rgba(0, 255, 255, 0.8),
    0 0 20px rgba(0, 255, 255, 0.5),
    0 0 30px rgba(0, 255, 255, 0.3);
  box-shadow: 
    0 0 20px rgba(0, 212, 255, 0.6),
    0 0 40px rgba(0, 212, 255, 0.3),
    inset 0 0 20px rgba(0, 212, 255, 0.2);
  white-space: nowrap;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -100%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%) scale(1);
  }
}

.overlay {
  position: absolute;
  left: 24px;
  bottom: 24px;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(13, 17, 23, 0.75);
  color: #e6edf3;
  backdrop-filter: blur(6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.overlay h1 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
}

.overlay p {
  margin: 0;
  font-size: 14px;
  opacity: 0.85;
}
</style>
