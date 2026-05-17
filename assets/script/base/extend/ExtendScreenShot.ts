/**
*Author  : XW
*Desc    : 
*/

import { Camera, Director, ImageAsset, Node, RenderTexture, SpriteFrame, Texture2D, UITransform, director, find, gfx, instantiate, math, size, view } from "cc";
import { GLoader } from "../../fairyGUI/GLoader";
import MaterialMgr, { MATERIAL_TYPE } from "../manager/MaterialMgr";

export class ExtendScreenShot {

    //ScreenShotCamera截屏专用摄像机
    private _camera: Camera;
    //ScreenShotCavans截屏专用画布
    private _canvas: Node;

    private static _inst: ExtendScreenShot;
    public static get inst() {
        if (!ExtendScreenShot._inst) {
            ExtendScreenShot._inst = new ExtendScreenShot;
        }
        return ExtendScreenShot._inst;
    }

    constructor() {
        this._canvas = find("CaptureCanvas");
        this._camera = find("CaptureCanvas/CaptureCamera").getComponent(Camera);
    }

    /**
     * 截图
     * @param loader 要显示的loader
     * @param shader shader类型
     * @param isRt 翻转
     */
    public async takeScreenShot(loader: GLoader, shader: MATERIAL_TYPE = MATERIAL_TYPE.BLUR, isRt: boolean = true) {
        return new Promise<SpriteFrame>(async (resolvesf) => {
            const viewSzie = view.getVisibleSize();
            const tw = Math.round(viewSzie.width);
            const th = Math.round(viewSzie.height);
            const renderTexture = new RenderTexture();
            renderTexture.reset({ width: tw, height: th, });

            this._camera.targetTexture = renderTexture;

            await new Promise(function (resolve) { director.once(Director.EVENT_AFTER_DRAW, resolve); });

            let buffer = renderTexture.readPixels(0, 0, tw, th);
            var rtBuffer = buffer;
            if (isRt) {
                rtBuffer = new Uint8Array(tw * th * 4);
                for (var i = th - 1; i >= 0; i--) {
                    for (var j = 0; j < tw; j++) {
                        rtBuffer[((th - 1 - i) * (tw) + j) * 4 + 0] = buffer[(i * tw + j) * 4 + 0];
                        rtBuffer[((th - 1 - i) * (tw) + j) * 4 + 1] = buffer[(i * tw + j) * 4 + 1];
                        rtBuffer[((th - 1 - i) * (tw) + j) * 4 + 2] = buffer[(i * tw + j) * 4 + 2];
                        rtBuffer[((th - 1 - i) * (tw) + j) * 4 + 3] = buffer[(i * tw + j) * 4 + 3];
                    }
                }
            }
            const image = new ImageAsset({
                _data: buffer,
                _compressed: false,
                width: tw,
                height: th,
                format: Texture2D.PixelFormat.RGBA8888,//  gfx.Format.RGBA8,
            });
            const texture = new Texture2D();
            texture.image = image;

            const spriteFrame = new SpriteFrame();
            spriteFrame.texture = texture;
            spriteFrame.flipUVY = false; //ANDROID ? false : true;

            this._camera.targetTexture = null;
            renderTexture.destroy();

            loader.texture = spriteFrame;

            MaterialMgr.inst.setToMaterial(loader._content, MATERIAL_TYPE.BLUR, { "blurThreshold": 0.65 });
            resolvesf(spriteFrame);
        });
    }
}

window["ExtendScreenShot"] = ExtendScreenShot;