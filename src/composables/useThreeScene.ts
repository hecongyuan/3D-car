import { AmbientLight, CanvasTexture, Mesh, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, SpotLight, SpotLightHelper } from 'three'
import { ThreeEditor, type ThreeEditorType } from 'three-editor-cores'
import { onMounted, onBeforeUnmount } from 'vue'

export function useThreeScene(containerRef: any) {
    let editor: ThreeEditorType | null = null
    const spotLightHelpers: SpotLightHelper[] = []

    // 创建地砖纹理
    const createTileTexture = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')!

        // 地砖底色（浅灰色大理石）
        const gradient = ctx.createLinearGradient(0, 0, 512, 512)
        gradient.addColorStop(0, '#e8e8e8')
        gradient.addColorStop(0.5, '#f5f5f5')
        gradient.addColorStop(1, '#e0e0e0')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 512, 512)

        // 添加细微的大理石纹理
        for (let i = 0; i < 30; i++) {
            ctx.strokeStyle = `rgba(200, 200, 200, ${Math.random() * 0.3})`
            ctx.lineWidth = Math.random() * 2
            ctx.beginPath()
            ctx.moveTo(Math.random() * 512, Math.random() * 512)
            ctx.quadraticCurveTo(
                Math.random() * 512, Math.random() * 512,
                Math.random() * 512, Math.random() * 512
            )
            ctx.stroke()
        }

        // 地砖缝隙
        ctx.strokeStyle = '#c0c0c0'
        ctx.lineWidth = 3

        // 绘制网格缝隙
        const tileSize = 128
        for (let x = tileSize; x < 512; x += tileSize) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, 512)
            ctx.stroke()
        }
        for (let y = tileSize; y < 512; y += tileSize) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(512, y)
            ctx.stroke()
        }

        const texture = new CanvasTexture(canvas)
        texture.wrapS = RepeatWrapping
        texture.wrapT = RepeatWrapping
        texture.repeat.set(8, 8) // 重复8x8次

        return texture
    }

    // 创建地面
    // 创建地面
    const createGround = () => {
        const groundGeometry = new PlaneGeometry(50, 50, 100, 100)
        const groundTexture = createTileTexture()

        const groundMaterial = new MeshStandardMaterial({
            map: groundTexture,
            metalness: 0.9,
            roughness: 0.05,
            envMapIntensity: 1.5,
        })

        const ground = new Mesh(groundGeometry, groundMaterial)
        ground.rotation.x = -Math.PI / 2
        ground.position.y = 0
        ground.receiveShadow = true
        ground.name = 'Ground'

        return ground
    }

    const initScene = () => {
        if (!containerRef.value) return null

        ThreeEditor.dracoPath = '/three-editor/draco/'

        const initParams = {
            pixelRatio: window.devicePixelRatio,
            webglRenderParams: { antialias: true, alpha: true, logarithmicDepthBuffer: true },
            sceneParams: {
                background: { type: 'color', value: '#000000' }, // 纯黑背景，强化聚光灯效果
                camera: {
                    position: { x: 4.44, y: 2.97, z: 2.61 }, // 右前方斜上方视角，距离6.17
                    target: { x: 0.1, y: 0.24, z: -0.83 }
                },
                lights: [
                    // 极低环境光强度，营造聚光灯下的戏剧性效果
                    {
                        type: 'AmbientLight',
                        parameters: { color: '#1a1a2e', intensity: 0.05 }
                    }
                ]
            }
        }

        editor = new ThreeEditor(containerRef.value, initParams)

        if (!editor) {
            console.error('Failed to create editor')
            return null
        }
        console.log('Editor created')

        // 隐藏坐标系和网格线
        if (editor.scene) {
            editor.scene.traverse((obj: any) => {
                if (obj.type === 'AxesHelper' || obj.type === 'GridHelper' || (obj.type && obj.type.includes('Helper'))) {
                    obj.visible = false
                }
            })

            // 提升环境光 - 增加整体亮度
            const ambientLight = new AmbientLight(0xffffff, 0.4) // 提高强度到0.4，使用白光
            editor.scene.add(ambientLight)

            // 创建地面 - 带地砖纹理的镜面地板
            const ground = createGround()
            editor.scene.add(ground)

            // 🎭 舞台聚光灯系统
            // 主聚光灯
            const mainSpotLight = new SpotLight(0xffffff, 150, 50, Math.PI / 3.5, 0.2, 1.0)
            mainSpotLight.position.set(0, 18, 0)
            mainSpotLight.target.position.set(0, 0.5, 0)
            mainSpotLight.castShadow = true
            mainSpotLight.shadow.mapSize.width = 2048
            mainSpotLight.shadow.mapSize.height = 2048
            mainSpotLight.shadow.camera.near = 5
            mainSpotLight.shadow.camera.far = 30
            mainSpotLight.shadow.bias = -0.0001
            editor.scene.add(mainSpotLight)
            editor.scene.add(mainSpotLight.target)

            const mainHelper = new SpotLightHelper(mainSpotLight, 0xffffff)
            mainHelper.visible = false
            editor.scene.add(mainHelper)
            spotLightHelpers.push(mainHelper)

            // 前侧聚光灯
            const frontSpotLight = new SpotLight(0xfff5e6, 70, 35, Math.PI / 4, 0.3, 1.0)
            frontSpotLight.position.set(0, 12, 12)
            frontSpotLight.target.position.set(0, 0.5, 0)
            frontSpotLight.castShadow = true
            frontSpotLight.shadow.mapSize.width = 1024
            frontSpotLight.shadow.mapSize.height = 1024
            editor.scene.add(frontSpotLight)
            editor.scene.add(frontSpotLight.target)

            // 左侧聚光灯
            const leftSpotLight = new SpotLight(0xe6f2ff, 55, 32, Math.PI / 4.5, 0.5, 1.3)
            leftSpotLight.position.set(-8, 9, 3)
            leftSpotLight.target.position.set(0, 0.5, 0)
            leftSpotLight.castShadow = true
            editor.scene.add(leftSpotLight)
            editor.scene.add(leftSpotLight.target)

            // 右侧聚光灯
            const rightSpotLight = new SpotLight(0xfff5e6, 55, 32, Math.PI / 4, 0.3, 1.0)
            rightSpotLight.position.set(8, 11, 3)
            rightSpotLight.target.position.set(0, 0.5, 0)
            rightSpotLight.castShadow = true
            editor.scene.add(rightSpotLight)
            editor.scene.add(rightSpotLight.target)

            // 背光聚光灯
            const backSpotLight = new SpotLight(0xe6e6ff, 50, 30, Math.PI / 4, 0.4, 1.0)
            backSpotLight.position.set(0, 8, -8)
            backSpotLight.target.position.set(0, 1, 0)
            editor.scene.add(backSpotLight)
            editor.scene.add(backSpotLight.target)

            editor.handler?.setHandlerOption?.('grid', true)
            editor.handler?.setHandlerOption?.('axes', true)
        }

        return editor
    }

    const handleResize = () => {
        editor?.renderSceneResize?.()
    }

    onMounted(() => {
        window.addEventListener('resize', handleResize)
    })

    onBeforeUnmount(() => {
        window.removeEventListener('resize', handleResize)
        editor?.destroySceneRender?.()
        editor = null
    })

    return {
        initScene,
        getEditor: () => editor
    }
}
