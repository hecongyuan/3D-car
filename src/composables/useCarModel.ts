import { AdditiveBlending, Box3, CylinderGeometry, DoubleSide, Mesh, MeshBasicMaterial, Object3D, SpotLight, Vector3 } from 'three'
import type { ThreeEditorType } from 'three-editor-cores'
import { ref, shallowRef } from 'vue'

export function useCarModel() {
    const carModel = shallowRef<Object3D | null>(null)
    const carRotationContainer = shallowRef<Object3D | null>(null)

    // Parts collections
    const carBodyMeshes: Mesh[] = []
    const wheelMeshes: Mesh[] = []
    const frontLightMeshes: Mesh[] = []
    const rearLightMeshes: Mesh[] = []
    const doorObjects: Object3D[] = []
    const lightObjects: Object3D[] = [] // Store created lights and beams

    // Explode animation state
    const explodableParts: Object3D[] = []
    const originalPositions = new Map<Object3D, Vector3>()
    const targetPositions = new Map<Object3D, Vector3>()
    const explodeAnimationProgress = new Map<Object3D, number>()

    // State
    const currentColor = ref('#ff0000')
    const materialType = ref<'metallic' | 'matte'>('metallic')
    const isFrontLightsOn = ref(false)
    const isRearLightsOn = ref(false)
    const isExploded = ref(false)
    const areDoorsOpen = ref(false)
    const doorState = new Map<Object3D, { open: boolean; target: number }>()

    const loadModel = (editor: ThreeEditorType) => {
        if (!editor.modelCore) return

        const { loaderService } = editor.modelCore.insertModel({
            type: 'GLB',
            url: '/models/car.glb'
        })

        loaderService.progress = (e) => {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100
                console.log(`Loading: ${percent.toFixed(2)}%`)
            }
        }

        loaderService.complete = (model) => {
            console.log('Model loaded:', model)
            setupModel(model, editor)
            // Update ref last so watchers see fully initialized state
            carModel.value = model
        }
    }

    const setupModel = (model: Object3D, editor: ThreeEditorType) => {
        console.log('Setting up model...')
        // Center and scale model
        const box = new Box3().setFromObject(model)
        const size = new Vector3()
        const center = new Vector3()
        box.getSize(size)
        box.getCenter(center)

        const maxDim = Math.max(size.x, size.y, size.z)
        if (maxDim > 10) {
            const scale = 5 / maxDim
            model.scale.set(scale, scale, scale)
            box.setFromObject(model)
            box.getSize(size)
            box.getCenter(center)
        } else if (maxDim < 1) {
            const scale = 2 / maxDim
            model.scale.set(scale, scale, scale)
            box.setFromObject(model)
            box.getSize(size)
            box.getCenter(center)
        }

        model.position.x = -center.x
        model.position.z = -center.z
        model.position.y = -box.min.y

        // Create rotation container
        carRotationContainer.value = new Object3D()
        carRotationContainer.value.position.set(0, 0, 0)

        if (model.parent) {
            model.parent.remove(model)
        }
        carRotationContainer.value.add(model)
        editor.scene?.add(carRotationContainer.value)
        console.log('Model added to scene')

        // Enable shadows
        model.traverse((obj: any) => {
            if (obj.isMesh) {
                obj.castShadow = true
                obj.receiveShadow = true
            }
        })

        // Force camera position
        const camera = (editor as any)?.camera
        const controls = (editor as any)?.controls
        if (camera && controls) {
            camera.position.set(4.44, 2.97, 2.61)
            controls.target.set(0.1, 0.24, -0.83)
            controls.update()
        }

        // Hide helpers
        if (editor.scene) {
            editor.scene.traverse((obj: any) => {
                if (obj.type && obj.type.includes('Helper')) {
                    obj.visible = false
                }
            })
        }

        // Ensure world matrices are up to date for spatial calculations
        model.updateMatrixWorld(true)
        categorizeParts(model, size)
        prepareExplosion(model)
    }


    const categorizeParts = (model: Object3D, carSize: Vector3) => {
        doorObjects.length = 0
        carBodyMeshes.length = 0
        wheelMeshes.length = 0
        frontLightMeshes.length = 0
        rearLightMeshes.length = 0

        // Helper to check if object is already classified
        const isClassified = (obj: Object3D) => {
            return doorObjects.includes(obj) ||
                wheelMeshes.includes(obj as Mesh) ||
                frontLightMeshes.includes(obj as Mesh) ||
                rearLightMeshes.includes(obj as Mesh)
        }

        model.traverse((obj: any) => {
            const n = (obj.name || '').toLowerCase()
            const matName = (obj.material && obj.material.name) ? obj.material.name.toLowerCase() : ''

            const isNamedDoor = n.includes('door') || n.includes('车门') || n.includes('520') || n.includes('polysurface535')
            const isWheel = n.includes('wheel') || n.includes('tire') || n.includes('rim') || n.includes('轮胎') || n.includes('车轮')
            const isBody = n.includes('body') || n.includes('paint') || n.includes('chassis') || n.includes('车身')

            // 增强的车灯检测逻辑
            const lightKeywords = ['light', 'lamp', 'lantern', 'led', 'emit', 'bulb', '灯', 'head', 'tail', 'brake', 'fog', 'signal', 'blinn12']
            // 排除关键词：刹车盘、卡钳、Logo等非灯光部件
            const excludedKeywords = ['disc', 'caliper', 'rotor', 'hub', 'logo', 'badge', 'emblem', 'text', 'plate']
            const isExcluded = excludedKeywords.some(k => n.includes(k))

            const isLight = !isExcluded && lightKeywords.some(k => n.includes(k) || matName.includes(k))

            if (isNamedDoor) {
                doorObjects.push(obj)
                doorState.set(obj, { open: false, target: 0 })
            }

            if (isWheel && (obj as any).isMesh) {
                wheelMeshes.push(obj as Mesh)
            }

            if (isLight && (obj as any).isMesh) {
                const mesh = obj as Mesh
                const fullName = n + ' ' + matName

                // 区分前后车灯
                const isRear = fullName.includes('tail') || fullName.includes('brake') || fullName.includes('rear') || fullName.includes('back') || fullName.includes('stop') || fullName.includes('尾') || fullName.includes('后')
                // 前车灯关键词，包括 LED
                const isFront = fullName.includes('head') || fullName.includes('front') || fullName.includes('led') || fullName.includes('daytime') || fullName.includes('running') || fullName.includes('前') || fullName.includes('大灯') || fullName.includes('blinn12')

                if (isRear) {
                    rearLightMeshes.push(mesh)
                } else if (isFront) {
                    frontLightMeshes.push(mesh)
                } else {
                    // 默认归为前灯，或者根据位置判断（如果z坐标大于0通常是前灯，取决于模型坐标系）
                    // 这里暂时默认归为前灯
                    frontLightMeshes.push(mesh)
                }

                // 确保有 emissive 属性
                if (mesh.material) {
                    const mat = mesh.material as any
                    if (!mat.emissive) {
                        // 尝试处理
                    }
                }
            }

            if (isBody && (obj as any).isMesh) {
                carBodyMeshes.push(obj as Mesh)
            }
        })

        // Spatial detection for doors (Fallback for irregular naming)
        model.traverse((obj: any) => {
            if (obj.isMesh && !isClassified(obj)) {
                if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox()
                const center = new Vector3()
                obj.geometry.boundingBox.getCenter(center)
                obj.localToWorld(center) // Convert to world space

                const size = new Vector3()
                obj.geometry.boundingBox.getSize(size)
                // Scale size to world? Assuming uniform scale 1 or handled by localToWorld for position.
                // But usually we can just check relative dimensions.

                // Relaxed Spatial Criteria:
                // 1. On the side (X > 25% of width) - Relaxed from 32%
                // 2. In the middle (Z within 45% of length) - Relaxed from 35%
                // 3. Reasonable height (Y > 10% of height) - Relaxed from 15%
                // 4. Not too small (Volume check)

                const isSide = Math.abs(center.x) > carSize.x * 0.25
                const isMiddle = Math.abs(center.z) < carSize.z * 0.45
                const isBodyHeight = center.y > carSize.y * 0.1 && center.y < carSize.y * 0.9
                const isBigEnough = size.x > 0.1 || size.z > 0.3

                if (isSide && isMiddle && isBodyHeight && isBigEnough) {
                    // Double check it's not a seat (Seats are usually inside)
                    // If X > 0.32 * Width, it's likely outside the cabin area or the door itself.

                    doorObjects.push(obj)
                    doorState.set(obj, { open: false, target: 0 })
                    // Remove from body meshes if it was added there by fallback
                    const bodyIdx = carBodyMeshes.indexOf(obj)
                    if (bodyIdx > -1) carBodyMeshes.splice(bodyIdx, 1)
                }
            }
        })

        // Fallback for body meshes
        if (carBodyMeshes.length === 0) {
            model.traverse((obj: any) => {
                if ((obj as any).isMesh && !wheelMeshes.includes(obj as Mesh)) {
                    const n = (obj.name || '').toLowerCase()
                    const shouldExclude = n.includes('window') || n.includes('glass') || n.includes('light') || n.includes('chrome') || n.includes('tire')
                    if (!shouldExclude) {
                        carBodyMeshes.push(obj as Mesh)
                    }
                }
            })
        }
    }

    const prepareExplosion = (model: Object3D) => {
        explodableParts.length = 0
        originalPositions.clear()
        targetPositions.clear()
        explodeAnimationProgress.clear()

        model.updateMatrixWorld(true)

        const modelCenter = new Vector3()
        const box = new Box3().setFromObject(model)
        box.getCenter(modelCenter)

        const meshesToExplode: Mesh[] = []
        model.traverse((obj: any) => {
            if (obj.isMesh && obj !== model) {
                meshesToExplode.push(obj as Mesh)
            }
        })

        // 计算所有部件到中心的最大距离，用于归一化
        let maxDistance = 0
        const meshDistances = new Map<Mesh, number>()

        meshesToExplode.forEach((mesh) => {
            mesh.geometry.computeBoundingBox()
            const geometryCenter = new Vector3()
            if (mesh.geometry.boundingBox) {
                mesh.geometry.boundingBox.getCenter(geometryCenter)
            }

            const meshGeometryWorldPos = geometryCenter.clone()
            mesh.localToWorld(meshGeometryWorldPos)

            const distanceFromCenter = meshGeometryWorldPos.distanceTo(modelCenter)
            meshDistances.set(mesh, distanceFromCenter)
            maxDistance = Math.max(maxDistance, distanceFromCenter)
        })

        // 设置拆解参数
        const baseExplosionScale = 305.0 // 基础拆解比例 - 增加以提高可见度
        const minExplosionDistance = 53.0 // 最小拆解距离，确保中心部件也能移动

        meshesToExplode.forEach((mesh, index) => {
            explodableParts.push(mesh)
            originalPositions.set(mesh, mesh.position.clone())

            mesh.geometry.computeBoundingBox()
            const geometryCenter = new Vector3()
            if (mesh.geometry.boundingBox) {
                mesh.geometry.boundingBox.getCenter(geometryCenter)
            }

            const meshGeometryWorldPos = geometryCenter.clone()
            mesh.localToWorld(meshGeometryWorldPos)

            let direction = new Vector3().subVectors(meshGeometryWorldPos, modelCenter)
            const distanceFromCenter = meshDistances.get(mesh) || 0

            // 如果部件几乎在中心，使用球面分布
            if (distanceFromCenter < 0.1) {
                const phi = Math.acos(1 - 2 * (index + 0.5) / meshesToExplode.length)
                const theta = Math.PI * (1 + Math.sqrt(5)) * index
                direction.set(
                    Math.sin(phi) * Math.cos(theta),
                    Math.sin(phi) * Math.sin(theta),
                    Math.cos(phi)
                )
            }

            direction.normalize()

            // 关键改进：使用距离比例而非固定距离
            // 距离越远的部件，移动距离越大，保持相对位置关系
            const normalizedDistance = maxDistance > 0 ? distanceFromCenter / maxDistance : 0
            const explosionDistance = minExplosionDistance + normalizedDistance * baseExplosionScale

            const localOffset = direction.multiplyScalar(explosionDistance)
            const targetLocalPos = mesh.position.clone().add(localOffset)
            targetPositions.set(mesh, targetLocalPos)
            explodeAnimationProgress.set(mesh, 0)
        })
    }

    const changeCarColor = (color: string) => {
        currentColor.value = color
        carBodyMeshes.forEach(mesh => {
            if (mesh.material) {
                const mat = mesh.material as any
                if (mat.color) {
                    mat.color.setStyle(color)
                    mat.needsUpdate = true
                }
            }
        })
    }

    const setMaterialType = (type: 'metallic' | 'matte') => {
        materialType.value = type
        carBodyMeshes.forEach(mesh => {
            if (mesh.material) {
                const mat = mesh.material as any
                if (type === 'metallic') {
                    mat.roughness = 0.3
                    mat.metalness = 0.9
                } else {
                    mat.roughness = 0.8
                    mat.metalness = 0.1
                }
                mat.needsUpdate = true
            }
        })
    }

    const toggleFrontLights = () => {
        isFrontLightsOn.value = !isFrontLightsOn.value

        // 1. 切换自发光 (Emissive) - 性能消耗低，保留
        frontLightMeshes.forEach(mesh => {
            if (mesh.material) {
                const mat = mesh.material as any
                if (!mat.emissive || !mat.emissive.setHex) return

                if (isFrontLightsOn.value) {
                    mat.emissive.setHex(0xffffff)
                    mat.emissiveIntensity = 5.0
                } else {
                    mat.emissive.setHex(0x000000)
                    mat.emissiveIntensity = 0
                }
                mat.needsUpdate = true
            }
        })

        // 2. 处理光束和光源 (Beams & SpotLights)
        // 先清理旧对象，释放内存
        lightObjects.forEach(obj => {
            if (obj.parent) {
                obj.parent.remove(obj)
            }
            if ((obj as any).geometry) (obj as any).geometry.dispose()
            if ((obj as any).material) (obj as any).material.dispose()
        })
        lightObjects.length = 0

        if (isFrontLightsOn.value && carModel.value) {
            // 性能优化：聚类算法
            // 不为每个 Mesh 创建光源，而是计算左/右灯组的中心点，只创建 2 个光源
            const leftPositions: Vector3[] = []
            const rightPositions: Vector3[] = []

            // 获取车身局部坐标系下的位置
            const carInverseMatrix = carModel.value.matrixWorld.clone().invert()

            frontLightMeshes.forEach(mesh => {
                if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
                if (mesh.geometry.boundingBox) {
                    const center = new Vector3()
                    mesh.geometry.boundingBox.getCenter(center)
                    mesh.localToWorld(center) // 转为世界坐标
                    center.applyMatrix4(carInverseMatrix) // 转回车身局部坐标

                    // 根据 X 坐标区分左右 (假设 X 轴是左右方向)
                    if (center.x > 0) leftPositions.push(center)
                    else rightPositions.push(center)
                }
            })

            const createLightAt = (positions: Vector3[]) => {
                if (positions.length === 0) return

                // 计算平均中心点
                const avgPos = new Vector3()
                positions.forEach(p => avgPos.add(p))
                avgPos.divideScalar(positions.length)

                // 创建光束 Mesh (Visual Beam)
                // 减少分段数以优化性能
                const geometry = new CylinderGeometry(0.1, 2.0, 10, 16, 1, true)
                geometry.rotateX(-Math.PI / 2) // 旋转使其沿 Z 轴
                geometry.translate(0, 0, 5) // 调整原点，使其从灯头射出

                const material = new MeshBasicMaterial({
                    color: 0xccffff,
                    transparent: true,
                    opacity: 0.15,
                    side: DoubleSide,
                    blending: AdditiveBlending,
                    depthWrite: false,
                })

                const beam = new Mesh(geometry, material)
                beam.position.copy(avgPos)

                // 创建聚光灯 (Actual Light)
                // 限制光源参数以保证性能
                const spotLight = new SpotLight(0xffffff, 100, 50, 0.6, 0.5, 1)
                spotLight.position.copy(avgPos)
                spotLight.castShadow = false // 关闭阴影以提升性能，如果需要阴影可开启但会卡顿

                const target = new Object3D()
                target.position.copy(avgPos).add(new Vector3(0, 0, 10)) // 指向前方 (+Z)
                spotLight.target = target

                // 添加到车身模型中，随车运动
                carModel.value!.add(beam)
                carModel.value!.add(spotLight)
                carModel.value!.add(target)

                lightObjects.push(beam, spotLight, target)
            }

            // 分别在左右中心创建灯光
            createLightAt(leftPositions)
            createLightAt(rightPositions)
        }
    }

    const toggleRearLights = () => {
        isRearLightsOn.value = !isRearLightsOn.value
        rearLightMeshes.forEach(mesh => {
            if (mesh.material) {
                const mat = mesh.material as any
                if (!mat.emissive || !mat.emissive.setHex) return

                if (isRearLightsOn.value) {
                    // 尾灯 - 红色
                    mat.emissive.setHex(0xff0000)
                    mat.emissiveIntensity = 3.0
                } else {
                    mat.emissive.setHex(0x000000)
                    mat.emissiveIntensity = 0
                }
                mat.needsUpdate = true
            }
        })
    }

    const toggleExplode = () => {
        isExploded.value = !isExploded.value
    }

    const toggleDoors = () => {
        areDoorsOpen.value = !areDoorsOpen.value
        doorObjects.forEach(door => {
            const st = doorState.get(door)
            if (st) {
                const worldPos = new Vector3()
                door.getWorldPosition(worldPos)
                const carWorld = new Vector3()
                carModel.value!.getWorldPosition(carWorld)
                const isRight = worldPos.x > carWorld.x
                const swing = Math.PI / 3

                st.open = areDoorsOpen.value
                st.target = st.open ? (isRight ? -swing : swing) : 0
            }
        })
    }

    return {
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
    }
}
