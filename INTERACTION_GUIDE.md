# Three.js 汽车交互案例指南

本项目展示了一个完整的 3D 汽车展示交互系统，包含多种实用的交互功能。

## 🎯 核心交互功能

### 1. 🎨 车身颜色换装系统
**功能说明：**
- 实时更换汽车车身颜色
- 6种预设颜色：经典红、宝石蓝、珍珠白、午夜黑、银灰、香槟金
- 视觉反馈：选中颜色会显示勾选标记

**实现原理：**
```javascript
// 遍历车身网格，修改材质颜色
carBodyMeshes.forEach(mesh => {
  if (mesh.material.color) {
    mesh.material.color.setStyle(color)
    mesh.material.needsUpdate = true
  }
})
```

**关键技术点：**
- 模型加载时自动识别车身部件（通过节点名称）
- 使用 `Material.color.setStyle()` 实时修改颜色
- 排除玻璃、车灯等不应换色的部件

---

### 2. 📷 智能视角预设
**功能说明：**
- 4种预设视角：前视、侧视、顶视、全景
- 平滑相机过渡动画（1秒缓动）
- 使用 easeInOutCubic 缓动函数，体验流畅

**实现原理：**
```javascript
// 使用 requestAnimationFrame 实现平滑过渡
const animate = () => {
  progress = (now - startTime) / duration
  const eased = easeInOutCubic(progress)
  camera.position.lerpVectors(startPos, endPos, eased)
  
  if (progress < 1) {
    requestAnimationFrame(animate)
  }
}
```

**视角配置示例：**
```javascript
const cameraViews = [
  { name: '前视', position: { x: 0, y: 2, z: 8 }, target: { x: 0, y: 1, z: 0 } },
  { name: '侧视', position: { x: 8, y: 2, z: 0 }, target: { x: 0, y: 1, z: 0 } },
  // ...更多视角
]
```

---

### 3. 🔄 360度自动旋转
**功能说明：**
- 一键启动/暂停汽车旋转
- 恒定速度旋转展示
- 可与手动控制同时使用

**实现原理：**
```javascript
// 在渲染循环中更新旋转
updater.onBeforeRender = () => {
  if (isAutoRotating.value && carModel) {
    carModel.rotation.y += 0.005  // 每帧旋转角度
  }
}
```

---

### 4. 🚗 车轮旋转动画
**功能说明：**
- 模拟汽车行驶时的车轮转动
- 自动识别车轮部件
- 可调节旋转速度

**实现原理：**
```javascript
// 模型加载时识别车轮
model.traverse((obj) => {
  const n = obj.name.toLowerCase()
  if (n.includes('wheel') || n.includes('tire') || n.includes('rim')) {
    wheelMeshes.push(obj)
  }
})

// 渲染循环中旋转
if (isWheelRotating.value) {
  wheelMeshes.forEach(wheel => {
    wheel.rotation.x += 0.05
  })
}
```

---

### 5. 💡 材质切换系统
**功能说明：**
- 金属材质：高反射、低粗糙度
- 哑光材质：低反射、高粗糙度
- 实时切换，无需重新加载

**实现原理：**
```javascript
if (type === 'metallic') {
  material.roughness = 0.3  // 低粗糙度
  material.metalness = 0.9  // 高金属度
} else {
  material.roughness = 0.8  // 高粗糙度
  material.metalness = 0.1  // 低金属度
}
```

---

## 🔧 技术实现细节

### 模型部件识别策略
```javascript
// 使用节点名称关键字识别部件
model.traverse((obj) => {
  const n = obj.name.toLowerCase()
  
  // 识别车门
  if (n.includes('door')) {
    doorObjects.push(obj)
  }
  
  // 识别车轮
  if (n.includes('wheel') || n.includes('tire') || n.includes('rim')) {
    wheelMeshes.push(obj)
  }
  
  // 识别车身（用于换色）
  if (n.includes('body') || n.includes('paint')) {
    carBodyMeshes.push(obj)
  }
})
```

### 渲染循环优化
```javascript
// 统一的帧更新器，避免多个 requestAnimationFrame
const updater = new Object3D()
updater.onBeforeRender = (renderer, scene, camera) => {
  // 1. 车门开合动画
  // 2. 信息标注朝向更新
  // 3. 自动旋转
  // 4. 车轮动画
  // ...所有动画统一管理
}
```

---

## 🎨 UI 设计特点

### 控制面板布局
- **位置**：右上角固定定位
- **样式**：毛玻璃效果 + 半透明背景
- **响应式**：自动滚动条支持
- **分区设计**：功能按类别分组

### 交互反馈
- **颜色按钮**：Hover 放大 + 选中状态高亮
- **视角按钮**：Hover 时背景色变化 + 微移效果
- **操作按钮**：渐变背景 + 阴影提升

---

## 📚 扩展建议

### 可添加的进阶功能

1. **环境切换**
   - 室内展厅场景
   - 户外道路场景
   - HDR 环境贴图

2. **车灯控制**
   - 前大灯开关
   - 尾灯开关
   - 转向灯动画

3. **爆炸视图**
   - 车身部件展开
   - 显示内部结构
   - 动画过渡效果

4. **自定义配置**
   - 轮毂样式切换
   - 内饰颜色切换
   - 天窗开关

5. **AR 模式**
   - WebXR API 集成
   - 现实环境叠加
   - 手势控制

6. **性能优化**
   - LOD（细节层次）
   - 实例化渲染
   - 纹理压缩

---

## 🚀 使用方法

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 📦 依赖项
- **Three.js** (0.152.2) - 3D 渲染引擎
- **Vue 3** - 前端框架
- **three-editor-cores** - Three.js 编辑器核心库

## 💡 最佳实践

1. **模型准备**
   - 使用清晰的节点命名（如 `door_left`, `wheel_front_left`）
   - 合理的几何体分组
   - 优化多边形数量

2. **性能考虑**
   - 避免过度的材质更新
   - 使用 `needsUpdate` 标记
   - 合理使用渲染循环

3. **用户体验**
   - 提供清晰的视觉反馈
   - 平滑的动画过渡
   - 直观的操作提示
