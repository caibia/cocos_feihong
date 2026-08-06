/**
*Author  : XW
*Desc    : 截取当前屏幕画面并写入 UI 背景纹理
*/

import { Camera, Director, ImageAsset, Node, RenderTexture, SpriteFrame, Texture2D, Vec2, director, find, isValid } from "cc";
import { GLoader } from "../../fairyGUI/GLoader";
import { GRoot } from "../../fairyGUI/GRoot";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import MaterialMgr, { MATERIAL_TYPE } from "./MaterialMgr";

type ScreenShotSize = {
    /** 截图宽度 */
    width: number,
    /** 截图高度 */
    height: number,
}

/** 截屏管理器 */
export class ScreenShotMgr {

    /** 截图纹理缩放比例 */
    private static readonly SCREEN_SHOT_SCALE: number = 0.5;

    /** 截屏专用摄像机 */
    private _camera: Camera;
    /** 截屏专用画布 */
    private _canvas: Node;

    private static _inst: ScreenShotMgr;
    public static get inst(): ScreenShotMgr {
        if (!ScreenShotMgr._inst) {
            ScreenShotMgr._inst = new ScreenShotMgr;
        }
        return ScreenShotMgr._inst;
    }

    constructor() {
        this._canvas = find("CaptureCanvas");
        const cameraNode = find("CaptureCanvas/CaptureCamera");
        if (!this._canvas || !cameraNode) {
            XDEBUGLOG.error("截屏节点不存在", "CaptureCanvas/CaptureCamera");
            return;
        }
        this._camera = cameraNode.getComponent(Camera);
        if (!this._camera) {
            XDEBUGLOG.error("截屏摄像机组件不存在", "CaptureCanvas/CaptureCamera");
        }
    }

    /**
     * 截图
     * @param loader 要显示的loader
     * @param shader shader类型
     * @param isRt 翻转
     */
    public async takeScreenShot(loader: GLoader, shader: MATERIAL_TYPE = MATERIAL_TYPE.BLUR, isRt: boolean = true): Promise<SpriteFrame | null> {
        if (this.isLoaderInvalid(loader)) {
            return null;
        }
        if (!this._camera) {
            XDEBUGLOG.error("截屏摄像机未初始化");
            return null;
        }
        const screenSize = this.getScreenSize();
        if (screenSize.width <= 0 || screenSize.height <= 0) {
            XDEBUGLOG.error("截屏尺寸不合法", screenSize.width, screenSize.height);
            return null;
        }
        const renderTexture = new RenderTexture();
        renderTexture.reset({ width: screenSize.width, height: screenSize.height, });
        try {
            this._camera.targetTexture = renderTexture;
            await new Promise<void>((resolve) => { director.once(Director.EVENT_AFTER_DRAW, resolve); });
            if (this.isLoaderInvalid(loader)) {
                return null;
            }
            const buffer = renderTexture.readPixels(0, 0, screenSize.width, screenSize.height);
            if (!buffer) {
                XDEBUGLOG.error("截屏像素读取失败");
                return null;
            }
            void isRt;
            const image = new ImageAsset({
                _data: buffer,
                _compressed: false,
                width: screenSize.width,
                height: screenSize.height,
                format: Texture2D.PixelFormat.RGBA8888,
            });
            const texture = new Texture2D();
            texture.image = image;
            const spriteFrame = new SpriteFrame();
            spriteFrame.texture = texture;
            spriteFrame.flipUVY = false;
            if (this.isLoaderInvalid(loader)) {
                this.releaseScreenShot(spriteFrame);
                return null;
            }
            loader.texture = spriteFrame;
            if (shader === MATERIAL_TYPE.BLUR) {
                MaterialMgr.inst.setToMaterial(loader._content, shader, { "blurThreshold": 0.65 });
            } else {
                MaterialMgr.inst.setToMaterial(loader._content, shader);
            }
            return spriteFrame;
        } finally {
            this._camera.targetTexture = null;
            renderTexture.destroy();
        }
    }

    /** 获取截图尺寸 */
    private getScreenSize(): ScreenShotSize {
        return {
            width: Math.max(1, Math.round(GRoot.inst.width * ScreenShotMgr.SCREEN_SHOT_SCALE)),
            height: Math.max(1, Math.round(GRoot.inst.height * ScreenShotMgr.SCREEN_SHOT_SCALE)),
        };
    }

    /**
     * 判断 Loader 是否不可写入
     * @param loader 目标 Loader
     */
    private isLoaderInvalid(loader: GLoader): boolean {
        return !loader || loader.isDisposed || !loader.node || !isValid(loader.node);
    }

    /**
     * 释放截图纹理
     * @param spriteFrame 截图纹理帧
     */
    public releaseScreenShot(spriteFrame: SpriteFrame): void {
        if (!spriteFrame) {
            return;
        }
        if (spriteFrame.texture) {
            spriteFrame.texture.destroy();
        }
        spriteFrame.destroy();
    }
}
