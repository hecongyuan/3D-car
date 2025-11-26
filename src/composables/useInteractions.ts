import { CanvasTexture, EdgesGeometry, LineBasicMaterial, LineSegments, Object3D, Raycaster, Sprite, SpriteMaterial, Vector2, Vector3 } from 'three'
import { ref, shallowRef, onBeforeUnmount, watch } from 'vue'
import type { ThreeEditorType } from 'three-editor-cores'

export function useInteractions(
    containerRef: any,
    editor: () => ThreeEditorType | null,
    carModel: any,
    doorObjects: Object3D[],
    doorState: Map<Object3D, { open: boolean; target: number }>
) {
    const raycaster = new Raycaster()
    const mouse = new Vector2()
    let currentCamera: any = null

    // State
    const htmlLabelVisible = ref(false)
    const htmlLabelText = ref('')
    const htmlLabelPosition = ref({ x: 0, y: 0 })
    const currentSelectedPart = shallowRef<Object3D | null>(null)

    const highlightEdges: LineSegments[] = []
    const doorHintSprites: Sprite[] = []
    const doorFromHint = new Map<Sprite, Object3D>()
    let infoLabel: Sprite | null = null

    let clickHandler: ((e: MouseEvent) => void) | null = null
    let hoverHandler: ((e: MouseEvent) => void) | null = null

    // Throttling for hover
    let lastHoverTime = 0
    const HOVER_THROTTLE_MS = 50

    const createInfoLabel = (objName: string, objType: string, isDoor: boolean, isOpen: boolean, position: Vector3) => {
        if (infoLabel) {
            editor()?.scene?.remove(infoLabel)
            infoLabel.material.map?.dispose()
            infoLabel.material.dispose()
        }

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = 400
        canvas.height = isDoor ? 200 : 160

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        gradient.addColorStop(0, '#1e293b')
        gradient.addColorStop(1, '#0f172a')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.lineWidth = 2
        ctx.strokeRect(0, 0, canvas.width, canvas.height)

        ctx.fillStyle = '#f1f5f9'
        ctx.font = 'bold 24px Arial'
        ctx.fillText('节点信息', 20, 40)

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.beginPath()
        ctx.moveTo(20, 55)
        ctx.lineTo(canvas.width - 20, 55)
        ctx.stroke()

        let y = 90
        const lineHeight = 40

        ctx.font = '16px Arial'
        ctx.fillStyle = '#94a3b8'
        ctx.fillText('名称:', 20, y)
        ctx.fillStyle = '#f1f5f9'
        ctx.font = 'bold 18px Monaco'
        ctx.fillText(objName || '(未命名)', 120, y)

        y += lineHeight
        ctx.font = '16px Arial'
        ctx.fillStyle = '#94a3b8'
        ctx.fillText('类型:', 20, y)
        ctx.fillStyle = '#f1f5f9'
        ctx.font = 'bold 18px Monaco'
        ctx.fillText(objType, 120, y)

        if (isDoor) {
            y += lineHeight
            ctx.font = '16px Arial'
            ctx.fillStyle = '#94a3b8'
            ctx.fillText('状态:', 20, y)
            ctx.fillStyle = isOpen ? '#34d399' : '#f87171'
            ctx.font = 'bold 18px Arial'
            ctx.fillText(isOpen ? '已打开' : '已关闭', 120, y)
        }

        const texture = new CanvasTexture(canvas)
        texture.needsUpdate = true
        const material = new SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false
        })
        infoLabel = new Sprite(material)

        const labelPos = position.clone()
        labelPos.y += 2.5
        labelPos.x += 1.5
        infoLabel.position.copy(labelPos)

        const aspect = canvas.width / canvas.height
        infoLabel.scale.set(2.0 * aspect, 2.0, 1)
        infoLabel.renderOrder = 1000

        editor()?.scene?.add(infoLabel)
    }

    const createDoorHint = (door: Object3D) => {
        const size = 128
        const c = document.createElement('canvas')
        c.width = c.height = size
        const ctx = c.getContext('2d')!
        ctx.clearRect(0, 0, size, size)

        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2)
        ctx.closePath()
        const grd = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.46)
        grd.addColorStop(0, '#34d399')
        grd.addColorStop(1, '#059669')
        ctx.fillStyle = grd
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        const w = size * 0.36, h = size * 0.48
        ctx.fillRect(size / 2 - w / 2, size / 2 - h / 2, w, h)

        ctx.lineWidth = 6
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.strokeRect(size / 2 - w / 2, size / 2 - h / 2, w, h)

        ctx.fillStyle = '#0f172a'
        ctx.beginPath()
        ctx.arc(size / 2 + w * 0.22, size / 2, size * 0.02, 0, Math.PI * 2)
        ctx.fill()

        const tex = new CanvasTexture(c)
        tex.needsUpdate = true
        const mat = new SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true, opacity: 1, toneMapped: false })
        const spr = new Sprite(mat)
        spr.scale.set(2.0, 2.0, 2.0)
        spr.renderOrder = 2000
        spr.frustumCulled = false
        doorHintSprites.push(spr)
        doorFromHint.set(spr, door)
        editor()!.scene!.add(spr)
    }

    const initInteractions = () => {
        if (!containerRef.value) return

        // Watch for model load to create hints
        watch(() => carModel.value, (newModel) => {
            if (newModel) {
                doorObjects.forEach(createDoorHint)
            }
        })

        clickHandler = (e: MouseEvent) => {
            if (!carModel.value) return

            const ed = editor()
            const camera = currentCamera || (ed as any)?.camera
            if (!camera) return

            const rect = containerRef.value!.getBoundingClientRect()
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)

            raycaster.setFromCamera(mouse, camera)
            const intersects = raycaster.intersectObjects([carModel.value], true)

            if (intersects.length > 0 && intersects[0]) {
                const hitObj = intersects[0].object

                if (hitObj instanceof Sprite) {
                    const door = doorFromHint.get(hitObj)
                    if (door) {
                        toggleDoor(door)
                    }
                    return
                }

                let doorHit: Object3D | null = null
                let p: Object3D | null = hitObj
                while (p && !doorHit) {
                    if (doorObjects.includes(p)) doorHit = p
                    p = p.parent
                }

                if (doorHit) {
                    toggleDoor(doorHit)
                    return
                }

                if (!(hitObj as any).isMesh) return

                // Handle part selection
                handlePartSelection(hitObj, camera)
            }
        }

        hoverHandler = (e: MouseEvent) => {
            const now = performance.now()
            if (now - lastHoverTime < HOVER_THROTTLE_MS) return
            lastHoverTime = now

            const container = containerRef.value!
            const rect = container.getBoundingClientRect()
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

            const camera = currentCamera || (editor() as any)?.camera
            if (!camera) return

            raycaster.setFromCamera(mouse, camera)

            // Optimize: only check relevant objects if possible, or check main model
            const intersects = carModel.value
                ? raycaster.intersectObjects([carModel.value], true)
                : []

            container.style.cursor = intersects.length > 0 ? 'pointer' : 'default'
        }

        containerRef.value.addEventListener('click', clickHandler)
        containerRef.value.addEventListener('mousemove', hoverHandler)
    }

    const toggleDoor = (door: Object3D) => {
        const st = doorState.get(door)
        if (st) {
            const worldPos = new Vector3()
            door.getWorldPosition(worldPos)
            const carWorld = new Vector3()
            carModel.value.getWorldPosition(carWorld)
            const isRight = worldPos.x > carWorld.x
            const swing = Math.PI / 3
            st.open = !st.open
            st.target = st.open ? (isRight ? -swing : swing) : 0

            const pos = new Vector3()
            door.getWorldPosition(pos)
            createInfoLabel(door.name, door.type, true, st.open, pos)
        }
    }

    const handlePartSelection = (hitObj: Object3D, camera: any) => {
        const mesh = hitObj as any
        htmlLabelText.value = mesh.name || '未命名部件'
        htmlLabelVisible.value = true
        currentSelectedPart.value = mesh

        const pos = new Vector3()
        mesh.getWorldPosition(pos)

        if (!currentCamera) currentCamera = camera

        updateHtmlLabelPosition(camera)
        createInfoLabel(mesh.name, mesh.type, false, false, pos)

        // Highlight
        while (highlightEdges.length > 0) {
            const edge = highlightEdges.pop()
            if (edge) {
                editor()?.scene?.remove(edge)
                edge.geometry.dispose()
                    ; (edge.material as any)?.dispose()
            }
        }

        const edges = new EdgesGeometry(mesh.geometry, 30)
        const lineMat = new LineBasicMaterial({
            color: 0xffff00,
            linewidth: 2,
            transparent: false,
            depthTest: true
        })
        const line = new LineSegments(edges, lineMat)
        line.position.copy(hitObj.position)
        line.rotation.copy(hitObj.rotation)
        line.scale.copy(hitObj.scale)
        line.matrix.copy(hitObj.matrix)
        line.matrixWorld.copy(hitObj.matrixWorld)

        if (hitObj.parent) {
            hitObj.parent.add(line)
        } else {
            editor()?.scene?.add(line)
        }
        highlightEdges.push(line)
    }

    const updateHtmlLabelPosition = (camera: any) => {
        if (htmlLabelVisible.value && currentSelectedPart.value && containerRef.value) {
            const pos3D = new Vector3()
            currentSelectedPart.value.getWorldPosition(pos3D)
            pos3D.y += 1.5

            const rect = containerRef.value.getBoundingClientRect()
            const screenPos = pos3D.clone().project(camera)

            htmlLabelPosition.value = {
                x: (screenPos.x * 0.5 + 0.5) * rect.width,
                y: (-(screenPos.y * 0.5) + 0.5) * rect.height
            }
        }
    }

    const setCurrentCamera = (camera: any) => {
        currentCamera = camera
    }

    onBeforeUnmount(() => {
        if (containerRef.value) {
            if (clickHandler) containerRef.value.removeEventListener('click', clickHandler)
            if (hoverHandler) containerRef.value.removeEventListener('mousemove', hoverHandler)
        }

        if (infoLabel && editor()?.scene) {
            editor()!.scene!.remove(infoLabel)
            infoLabel.material.map?.dispose()
            infoLabel.material.dispose()
        }
    })

    return {
        initInteractions,
        htmlLabelVisible,
        htmlLabelText,
        htmlLabelPosition,
        currentSelectedPart,
        doorHintSprites,
        doorFromHint,
        infoLabel,
        setCurrentCamera,
        updateHtmlLabelPosition
    }
}
