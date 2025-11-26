declare module 'three-editor-cores' {
  import type { Mesh, Scene, Object3D } from 'three'

  export interface HandlerController {
    setHandlerOption?: (key: string, value: boolean) => void
  }

  export interface LoaderService {
    progress?: (event: ProgressEvent) => void
    complete?: (model: Object3D) => void
  }

  export interface ModelCore {
    insertModel: (options: { type: 'GLTF' | 'GLB' | 'OBJ' | 'FBX', url: string }) => {
      loaderService: LoaderService
      rootInfo?: Object3D
    }
  }

  export interface ThreeEditorOptions {
    fps?: number | null
    pixelRatio?: number
    webglRenderParams?: Record<string, unknown>
    sceneParams?: Record<string, unknown>
  }

  export class ThreeEditor {
    static dracoPath: string
    constructor(container: HTMLElement, options?: ThreeEditorOptions)
    scene?: Scene
    handler?: HandlerController
    modelCore?: ModelCore
    setLight?: (type: string, parameters?: Record<string, unknown>) => void
    renderSceneResize?: () => void
    destroySceneRender?: () => void
  }

  export type ThreeEditorType = ThreeEditor

  export function createMesh(
    geometryOptions?: Record<string, unknown>,
    materialOptions?: Record<string, unknown>,
    textureOptions?: Record<string, unknown>
  ): Mesh
}

