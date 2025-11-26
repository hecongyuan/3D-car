import { MathUtils, Object3D, Vector3 } from 'three'
import { ref, onBeforeUnmount } from 'vue'
import type { ThreeEditorType } from 'three-editor-cores'

export function useAnimations(
    editor: () => ThreeEditorType | null,
    carRotationContainer: any,
    wheelMeshes: any[],
    explodableParts: any[],
    originalPositions: Map<Object3D, Vector3>,
    targetPositions: Map<Object3D, Vector3>,
    explodeAnimationProgress: Map<Object3D, number>,
    doorObjects: Object3D[],
    doorState: Map<Object3D, { open: boolean; target: number }>,
    doorHintSprites: any[],
    doorFromHint: Map<any, Object3D>,
    infoLabel: any,
    updateHtmlLabelPosition: (camera: any) => void,
    setCurrentCamera: (camera: any) => void
) {
    const isAutoRotating = ref(false)
    const isWheelRotating = ref(false)
    // const isExploded = ref(false) // Synced with useCarModel state via argument if needed, or passed in

    let animationFrameId: number | null = null

    const startAnimationLoop = (isExplodedRef: any) => {
        const updater = new Object3D()
        updater.onBeforeRender = (_renderer, _scene, camera) => {
            setCurrentCamera(camera)

            // Door animation
            for (const obj of doorObjects) {
                const st = doorState.get(obj)
                if (!st) continue
                const next = MathUtils.damp(obj.rotation.y, st.target, 0.15, 1 / 60)
                obj.rotation.y = next
            }

            // Info label facing camera
            if (infoLabel && camera) {
                const camPos = (camera as any).position as Vector3
                infoLabel.lookAt(camPos)
            }

            // Door hints
            const t = performance.now() * 0.001
            for (const spr of doorHintSprites) {
                const door = doorFromHint.get(spr)
                if (!door) continue
                const wp = new Vector3(); door.getWorldPosition(wp)
                const camPos = (camera as any).position as Vector3
                const camDir = new Vector3().subVectors(camPos, wp).normalize()
                const forward = camDir.multiplyScalar(3.0)
                const pos = wp.clone().add(forward)
                pos.y += 2.0
                spr.position.copy(pos)
                    ; (spr as any).lookAt?.(camPos)

                const dist = camPos.distanceTo(pos)
                const base = Math.max(1.6, Math.min(4.5, dist * 0.18))
                const s = base + Math.sin(t * 2.0) * 0.12
                spr.scale.set(s, s, s)
            }
        }
        editor()?.scene?.add(updater)

        const animate = () => {
            // Auto rotate
            if (isAutoRotating.value && carRotationContainer.value) {
                carRotationContainer.value.rotation.y += 0.005
            }

            // Explode animation
            const targetProgress = isExplodedRef.value ? 1 : 0
            for (const part of explodableParts) {
                const currentProgress = explodeAnimationProgress.get(part) || 0
                const original = originalPositions.get(part)
                const target = targetPositions.get(part)

                if (!original || !target) continue

                const newProgress = MathUtils.damp(currentProgress, targetProgress, 0.25, 1 / 60)
                explodeAnimationProgress.set(part, newProgress)
                part.position.lerpVectors(original, target, newProgress)
            }

            // Wheel rotation
            if (isWheelRotating.value) {
                wheelMeshes.forEach(wheel => {
                    const wheelName = wheel.name || ''
                    if (wheelName.includes('polySurface478') || wheelName.includes('polySurface479') || wheelName.includes('polySurface486')) {
                        return
                    }

                    const worldPos = new Vector3()
                    wheel.getWorldPosition(worldPos)

                    if (Math.abs(worldPos.x) > Math.abs(worldPos.z)) {
                        wheel.rotation.z += 0.05
                    } else {
                        wheel.rotation.x += 0.05
                    }
                })
            }

            // Update HTML label
            const camera = (editor() as any)?.camera
            if (camera) {
                updateHtmlLabelPosition(camera)
            }

            animationFrameId = requestAnimationFrame(animate)
        }

        animate()
    }

    const setCameraView = (view: any) => {
        const ed = editor()
        if (!ed) return

        const camera = (ed as any)?.camera
        if (!camera) return

        const startPos = camera.position.clone()
        const endPos = new Vector3(view.position.x, view.position.y, view.position.z)
        const targetPos = new Vector3(view.target.x, view.target.y, view.target.z)

        let progress = 0
        const duration = 1000
        const startTime = performance.now()

        const animateView = () => {
            const now = performance.now()
            progress = Math.min((now - startTime) / duration, 1)

            const eased = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2

            camera.position.lerpVectors(startPos, endPos, eased)

            const controls = (ed as any)?.controls
            if (controls) {
                controls.target?.copy(targetPos)
                controls.update?.()
            }

            if (progress < 1) {
                requestAnimationFrame(animateView)
            }
        }

        animateView()
    }

    onBeforeUnmount(() => {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId)
            animationFrameId = null
        }
    })

    return {
        isAutoRotating,
        isWheelRotating,
        startAnimationLoop,
        setCameraView
    }
}
