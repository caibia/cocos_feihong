/**
*Author  : XW
*Desc    : 窗口扩展基类，封装窗口背景、打开关闭动画与通用生命周期逻辑
*/

import { Color } from "cc";
import { GGraph } from "../../fairyGUI/GGraph";
import { GRoot } from "../../fairyGUI/GRoot";
import XComponent, { UIADAPT_TYPE } from "./XComponent";

/** 界面打开特效 */
export const enum OPEN_ANIMSTYLE {
    /** 默认 */
    NONE = 0,
    /** 透明过渡 */
    ALPHA = 1,
    /** 弹出过渡 */
    POPUP = 2,
    /** X 轴缩放过渡 */
    SCALE_X = 3,
    /** Y 轴缩放过渡 */
    SCALE_Y = 4,
    /** 黑幕过渡 */
    BLACK = 5,
}

const BLACK_SHOW_DURATION = 0.7;
const BLACK_HIDE_DURATION = 0.7;
const BLACK_COLOR = new Color(0, 0, 0, 0);

/**
 * 弹窗基类。
 * 所有弹窗/窗口都应该继承这个类
 * 
 * 有两种可选的适配方式
 * 1.自动设置到居中的位置  （默认采用这种方式）（此时不需要在fgui中修改适配）
 * 2.设置XWindow.FguiAlwaysFullScreen=true，然后在fgui中设置适配方式
 * 
 */
export default class XWindow extends XComponent {

    /** 窗口打开动画样式 */
    public openAniStyle: OPEN_ANIMSTYLE = OPEN_ANIMSTYLE.NONE;
    /** 窗口关闭动画样式 */
    public closeAniStyle: OPEN_ANIMSTYLE = OPEN_ANIMSTYLE.NONE;
    /** 窗口黑幕层 */
    private transitionBlackBg: GGraph;

    /** 初始化窗口扩展对象 */
    constructor() {
        super();
    }

    /** 窗口创建时的初始化逻辑 */
    public onCreate(): void {
        super.onCreate();
        this.isWindow = true;
    }

    /**
     * 显示半透明背景 并且 允许点击空白地方关闭界面
     * @param isTouchClose 点击空白处时是否关闭界面。
     * @param alpha 透明度
     */
    public showBack(isTouchClose: boolean = true, alpha?: number): void {
        this.block(alpha);
        if (isTouchClose) {
            this.setBlockCallback(() => { this.onTapBGClose(); });
        }
    }

    /** 当点击了窗口的黑背景 */
    protected onTapBGClose(): void {
        this.destroyWithAni();
    }

    /** 窗口打开动画 */
    public async onShowAni(): Promise<void> {
        switch (this.openAniStyle) {
            case OPEN_ANIMSTYLE.ALPHA:
                await this.alphaShow();
                break;
            case OPEN_ANIMSTYLE.POPUP:
                await this.popupShow();
                break;
            case OPEN_ANIMSTYLE.SCALE_X:
                await this.scalexShow();
                break;
            case OPEN_ANIMSTYLE.SCALE_Y:
                await this.scaleyShow();
                break;
            case OPEN_ANIMSTYLE.BLACK:
                await this.blackShow();
                break;
        }
    }

    /** 窗口关闭动画 */
    public async onHideAni(): Promise<void> {
        switch (this.closeAniStyle) {
            case OPEN_ANIMSTYLE.ALPHA:
                await this.alphaHide();
                break;
            case OPEN_ANIMSTYLE.POPUP:
                await this.popupHide();
                break;
            case OPEN_ANIMSTYLE.SCALE_X:
                await this.scalexHide();
                break;
            case OPEN_ANIMSTYLE.SCALE_Y:
                await this.scaleyHide();
                break;
            case OPEN_ANIMSTYLE.BLACK:
                await this.blackHide();
                break;
        }
    }

    /** 打开透明过度 */
    private async alphaShow(): Promise<void> {
        return new Promise<void>(resolve => {
            this.alpha = 0.1;
            this.tweenUnit.getTween(this).to(0.2, { alpha: 1 }).call(resolve).start();
        });
    }
    /** 关闭透明过渡动画 */
    private async alphaHide(): Promise<void> {
        return new Promise<void>(resolve => {
            this.alpha = 1;
            this.tweenUnit.getTween(this).to(0.2, { alpha: 0 }).call(resolve).start();
        });
    }

    /** 打开透明过度 */
    private async popupShow(): Promise<void> {
        return new Promise<void>(resolve => {
            let pivotX = this.view.pivotX;
            let pivotY = this.view.pivotY;
            this.view.setPivot(0.5, 0.5);
            this.view.scaleX = this.view.scaleY = 0.0;
            this.tweenUnit.getTween(this.view)
                .to(0.15, { scaleX: 1.1, scaleY: 1.1 })
                .to(0.1, { scaleX: 1.0, scaleY: 1.0 })
                .call(() => { this.view.setPivot(pivotX, pivotY); })
                .call(resolve).start();
        });
    }
    /** 关闭弹出过渡动画 */
    private async popupHide(): Promise<void> {
        return new Promise<void>(resolve => {
            let pivotX = this.view.pivotX;
            let pivotY = this.view.pivotY;
            this.view.setPivot(0.5, 0.5);
            this.view.scaleX = this.view.scaleY = 1.0;
            this.tweenUnit.getTween(this.view)
                .to(0.1, { scaleX: 1.1, scaleY: 1.1 })
                .to(0.15, { scaleX: 0.0, scaleY: 0.0 })
                .call(() => { this.view.setPivot(pivotX, pivotY); })
                .call(resolve).start();
        });
    }

    private async scalexShow(): Promise<void> {
        return new Promise<void>(resolve => {
            let pivotX = this.view.pivotX;
            let pivotY = this.view.pivotY;
            this.view.setPivot(0.5, 0.5);
            this.view.scaleX = 0.0;
            this.tweenUnit.getTween(this.view)
                .to(0.15, { scaleX: 1.0 })
                .call(() => { this.view.setPivot(pivotX, pivotY); })
                .call(resolve).start();
        });
    }

    private async scalexHide(): Promise<void> {
        return new Promise<void>(resolve => {
            let pivotX = this.view.pivotX;
            let pivotY = this.view.pivotY;
            this.view.setPivot(0.5, 0.5);
            this.view.scaleX = 1.0;
            this.tweenUnit.getTween(this.view)
                .to(0.15, { scaleX: 0.0 })
                .call(() => { this.view.setPivot(pivotX, pivotY); })
                .call(resolve).start();
        });
    }

    private async scaleyShow(): Promise<void> {
        return new Promise<void>(resolve => {
            let pivotX = this.view.pivotX;
            let pivotY = this.view.pivotY;
            this.view.setPivot(0.5, 0.5);
            this.view.scaleY = 0.0;
            this.tweenUnit.getTween(this.view)
                .to(0.15, { scaleY: 1.0 })
                .call(() => { this.view.setPivot(pivotX, pivotY); })
                .call(resolve).start();
        });
    }

    private async scaleyHide(): Promise<void> {
        return new Promise<void>(resolve => {
            let pivotX = this.view.pivotX;
            let pivotY = this.view.pivotY;
            this.view.setPivot(0.5, 0.5);
            this.view.scaleY = 1.0;
            this.tweenUnit.getTween(this.view)
                .to(0.15, { scaleY: 0.0 })
                .call(() => { this.view.setPivot(pivotX, pivotY); })
                .call(resolve).start();
        });
    }

    /** 打开黑幕退场动画 */
    private blackShow(): Promise<void> {
        return this.playBlackAlpha(1, 0, BLACK_SHOW_DURATION);
    }

    /** 关闭黑幕进场动画 */
    private blackHide(): Promise<void> {
        return this.playBlackAlpha(0, 1, BLACK_HIDE_DURATION);
    }

    /** 创建本窗口黑幕层 */
    private ensureTransitionBlackBg(): GGraph {
        if (!this.transitionBlackBg) {
            this.transitionBlackBg = new GGraph();
            this.transitionBlackBg.name = "transitionBlackBg";
            this.transitionBlackBg.drawRect(0, Color.TRANSPARENT, BLACK_COLOR);
            this.transitionBlackBg.touchable = false;
        }
        if (!this.transitionBlackBg.parent) {
            this.addChild(this.transitionBlackBg);
        } else {
            this.setChildIndex(this.transitionBlackBg, this.numChildren - 1);
        }
        this.refreshTransitionBlackBg();
        return this.transitionBlackBg;
    }

    /** 刷新本窗口黑幕尺寸 */
    private refreshTransitionBlackBg(): void {
        if (!this.transitionBlackBg) {
            return;
        }
        let x = -this.x;
        let y = -this.y;
        if (this.uiAdaptType !== UIADAPT_TYPE.None) {
            x = x + this.width * this.pivotX;
            y = y + this.height * this.pivotY;
        }
        this.transitionBlackBg.setPosition(x, y);
        this.transitionBlackBg.setSize(GRoot.inst.width, GRoot.inst.height);
    }

    /**
     * 播放本窗口黑幕透明过渡。
     * @param startAlpha 起始透明度
     * @param endAlpha 结束透明度
     * @param duration 持续时间
     */
    private playBlackAlpha(startAlpha: number, endAlpha: number, duration: number): Promise<void> {
        const blackBg = this.ensureTransitionBlackBg();
        const alphaState = { alpha: Math.round(startAlpha * 255) };
        const blackColor = new Color(0, 0, 0, alphaState.alpha);
        blackBg.color = blackColor;
        blackBg.touchable = true;
        return new Promise<void>(resolve => {
            this.tweenUnit.getTween(alphaState).to(duration, { alpha: Math.round(endAlpha * 255) }, {
                onUpdate: () => {
                    blackColor.a = Math.round(alphaState.alpha);
                    blackBg.color = blackColor;
                },
            }).call(() => {
                blackColor.a = Math.round(endAlpha * 255);
                blackBg.color = blackColor;
                blackBg.touchable = endAlpha > 0;
                resolve();
            }).start();
        });
    }

    public setSize(w: number, h: number, ignorePivot?: boolean): void {
        super.setSize(w, h, ignorePivot);
        this.refreshTransitionBlackBg();
    }

    public dispose(): void {
        if (this.transitionBlackBg) {
            this.transitionBlackBg.dispose();
            this.transitionBlackBg = undefined;
        }
        super.dispose();
    }
}
