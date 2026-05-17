/**
*Author  : XW
*Desc    : 窗口扩展基类，封装窗口背景、打开关闭动画与通用生命周期逻辑
*/

import XComponent from "./XComponent";

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
}

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

    /** 初始化窗口扩展对象 */
    constructor() {
        super();
    }

    /** 窗口创建时的初始化逻辑 */
    public onCreate() {
        super.onCreate();
        this.isWindow = true;
    }

    /**
     * 显示半透明背景 并且 允许点击空白地方关闭界面
	 * @param isTouchClose 点击空白处时是否关闭界面。
     * @param alpha 透明度
     */
    public showBack(isTouchClose: boolean = true, alpha?: number) {
        this.block(alpha);
        if (isTouchClose) {
            this.setBlockCallback(() => { this.onTapBGClose(); });
        }
    }

    /** 当点击了窗口的黑背景 */
    protected onTapBGClose() {
        this.destroyWithAni();
    }

    /** 窗口打开动画 */
    public async onShowAni() {
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
        }
    }

    /** 窗口关闭动画 */
    public async onHideAni() {
        switch (this.openAniStyle) {
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
        }
    }

    /** 打开透明过度 */
    private async alphaShow() {
        return new Promise((resolve, reject) => {
            this.alpha = 0.1;
            this.tweenUnit.getTween(this).to(0.2, { alpha: 1 }).call(resolve).start();
        });
    }
    /** 关闭透明过渡动画 */
    private async alphaHide() {
        return new Promise((resolve, reject) => {
            this.alpha = 1;
            this.tweenUnit.getTween(this).to(0.2, { alpha: 0 }).call(resolve).start();
        });
    }

    /** 打开透明过度 */
    private async popupShow() {
        return new Promise((resolve, reject) => {
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
    private async popupHide() {
        return new Promise((resolve, reject) => {
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

    private async scalexShow() {
        return new Promise((resolve, reject) => {
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

    private async scalexHide() {
        return new Promise((resolve, reject) => {
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

    private async scaleyShow() {
        return new Promise((resolve, reject) => {
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

    private async scaleyHide() {
        return new Promise((resolve, reject) => {
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

    public dispose() {
        super.dispose();
    }
}
