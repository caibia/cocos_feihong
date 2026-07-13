/**
*Author  : XW
*Desc    : 登录占位界面，显示视频背景和代码创建的前景控件
*/

import { Color, HorizontalTextAlignment, VerticalTextAlignment } from "cc";
import XDEBUGLOG from "../../../base/debug/XDEBUGLOG";
import { UIADAPT_TYPE } from "../../../base/ui/XComponent";
import XWindow, { OPEN_ANIMSTYLE } from "../../../base/ui/XWindow";
import VideoUnit from "../../../base/unit/VideoUnit";
import { AutoSizeType } from "../../../fairyGUI/FieldTypes";
import { GButton } from "../../../fairyGUI/GButton";
import { GComponent } from "../../../fairyGUI/GComponent";
import { GGraph } from "../../../fairyGUI/GGraph";
import { GTextField } from "../../../fairyGUI/GTextField";

/** 登录页背景视频地址 */
const BG_VIDEO_URL = "movie/login/login01";
/** 视频显示层级 */
const VIDEO_SORTING_ORDER = 0;
/** 前景界面显示层级 */
const OVERLAY_SORTING_ORDER = 10;
/** 页面水平边距 */
const PAGE_PADDING = 48;
/** 按钮宽度 */
const BUTTON_WIDTH = 220;
/** 按钮高度 */
const BUTTON_HEIGHT = 64;
/** 按钮间距 */
const BUTTON_GAP = 24;
/** 窄屏按钮纵向间距 */
const BUTTON_VERTICAL_GAP = 12;
/** 按钮底部间距 */
const BUTTON_BOTTOM = 72;
/** 占位按钮名称 */
const BUTTON_NAMES = ["开始游戏", "选择服务器", "设置"] as const;

/** 占位按钮名称类型 */
type PlaceholderButtonName = typeof BUTTON_NAMES[number];

export default class LoginView extends XWindow {
    /** 背景视频播放单元 */
    private _bgVideo: VideoUnit | null = null;
    /** 前景界面容器 */
    private _overlay: GComponent | null = null;
    /** 页面标题 */
    private _titleText: GTextField | null = null;
    /** 页面说明文本 */
    private _subtitleText: GTextField | null = null;
    /** 占位按钮列表 */
    private _buttons: GButton[] = [];

    /** 获取本界面依赖的 FairyGUI 包 */
    public getFairyPackageArr(): string[] {
        return [];
    }

    /** 创建登录占位界面 */
    public onCreate(): void {
        super.onCreate();
        this.openAniStyle = OPEN_ANIMSTYLE.NONE;
        this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;

        this.view = new GComponent();
        this.view.name = "loginView";
        this.addChild(this.view);
        this.createOverlay();
        XDEBUGLOG.debug("[LoginView] onCreate");
    }

    /** 刷新界面并启动背景视频 */
    public onRefresh(arg?: IUIArg.ILoginViewArg): void {
        super.onRefresh(arg);
        this.playBackgroundVideo();
        XDEBUGLOG.debug("[LoginView] onRefresh");
    }

    /** 屏幕尺寸变化时刷新视频和前景布局 */
    public onStageResize(): void {
        super.onStageResize();
        this.layoutOverlay();
        if (this._bgVideo) this.playBackgroundVideo();
    }

    /** 创建前景文本和占位按钮 */
    private createOverlay(): void {
        if (!this.view) throw new Error("[LoginView] view 未初始化");

        this._overlay = new GComponent();
        this._overlay.name = "loginOverlay";
        this._overlay.sortingOrder = OVERLAY_SORTING_ORDER;
        this.view.addChild(this._overlay);

        this._titleText = this.createText("飞鸿江湖", 44, true, new Color(255, 255, 255, 255));
        this._subtitleText = this.createText("登录界面占位", 22, false, new Color(210, 224, 230, 255));
        for (const name of BUTTON_NAMES) this._buttons.push(this.createButton(name));
    }

    /**
     * 创建前景文本。
     * @param text 文本内容。
     * @param fontSize 字号。
     * @param isBold 是否加粗。
     * @param color 文本颜色。
     */
    private createText(text: string, fontSize: number, isBold: boolean, color: Color): GTextField {
        if (!this._overlay) throw new Error("[LoginView] overlay 未初始化");

        const textField = new GTextField();
        textField.text = text;
        textField.fontSize = fontSize;
        textField.bold = isBold;
        textField.color = color;
        textField.align = HorizontalTextAlignment.CENTER;
        textField.verticalAlign = VerticalTextAlignment.CENTER;
        textField.autoSize = AutoSizeType.None;
        textField.singleLine = true;
        textField.touchable = false;
        this._overlay.addChild(textField);
        return textField;
    }

    /**
     * 创建可点击的占位按钮。
     * @param name 按钮名称。
     */
    private createButton(name: PlaceholderButtonName): GButton {
        if (!this._overlay) throw new Error("[LoginView] overlay 未初始化");

        const button = new GButton();
        button.name = `placeholderButton_${name}`;
        button.setSize(BUTTON_WIDTH, BUTTON_HEIGHT);
        button.opaque = true;

        const background = new GGraph();
        background.name = "background";
        background.setSize(BUTTON_WIDTH, BUTTON_HEIGHT);
        background.drawRect(2, new Color(255, 255, 255, 150), new Color(16, 24, 28, 205), [8, 8, 8, 8]);
        background.touchable = false;
        button.addChild(background);

        const label = new GTextField();
        label.name = "label";
        label.text = name;
        label.fontSize = 24;
        label.color = new Color(255, 255, 255, 255);
        label.align = HorizontalTextAlignment.CENTER;
        label.verticalAlign = VerticalTextAlignment.CENTER;
        label.autoSize = AutoSizeType.None;
        label.singleLine = true;
        label.touchable = false;
        label.setSize(BUTTON_WIDTH, BUTTON_HEIGHT);
        button.addChild(label);

        this.eventUnit.addClickEvent(button, () => this.onClickPlaceholder(name), this);
        this._overlay.addChild(button);
        return button;
    }

    /** 根据当前界面尺寸排列前景控件 */
    private layoutOverlay(): void {
        if (!this.view || !this._overlay || !this._titleText || !this._subtitleText) return;
        const width = this.view.width;
        const height = this.view.height;
        if (width <= 0 || height <= 0) throw new Error(`[LoginView] 非法界面尺寸：${width}x${height}`);

        this._overlay.setSize(width, height);
        this._overlay.setPosition(0, 0);

        const horizontalPadding = Math.min(PAGE_PADDING, width * 0.08);
        const verticalPadding = Math.min(PAGE_PADDING, height * 0.08);
        const textWidth = width - horizontalPadding * 2;
        this._titleText.setSize(textWidth, 64);
        this._titleText.setPosition(horizontalPadding, verticalPadding);
        this._subtitleText.setSize(textWidth, 40);
        this._subtitleText.setPosition(horizontalPadding, verticalPadding + 64);

        const totalButtonWidth = this._buttons.length * BUTTON_WIDTH + Math.max(0, this._buttons.length - 1) * BUTTON_GAP;
        const availableWidth = width - horizontalPadding * 2;
        const controlsTop = verticalPadding + 128;
        if (availableWidth >= totalButtonWidth) {
            const startX = (width - totalButtonWidth) * 0.5;
            const buttonY = Math.max(controlsTop, height - BUTTON_BOTTOM - BUTTON_HEIGHT);
            this._buttons.forEach((button, index) => {
                this.resizeButton(button, BUTTON_WIDTH, BUTTON_HEIGHT);
                button.setPosition(startX + index * (BUTTON_WIDTH + BUTTON_GAP), buttonY);
            });
            return;
        }

        const buttonWidth = Math.min(BUTTON_WIDTH, availableWidth);
        const totalVerticalGap = Math.max(0, this._buttons.length - 1) * BUTTON_VERTICAL_GAP;
        const bottomPadding = Math.min(BUTTON_BOTTOM, Math.max(16, height * 0.08));
        const availableButtonHeight = height - controlsTop - bottomPadding - totalVerticalGap;
        const buttonHeight = Math.min(BUTTON_HEIGHT, availableButtonHeight / this._buttons.length);
        if (buttonHeight <= 0) throw new Error(`[LoginView] 界面高度不足以显示占位按钮：${height}`);
        const totalButtonHeight = this._buttons.length * buttonHeight + totalVerticalGap;
        const startX = (width - buttonWidth) * 0.5;
        const startY = height - bottomPadding - totalButtonHeight;
        this._buttons.forEach((button, index) => {
            this.resizeButton(button, buttonWidth, buttonHeight);
            button.setPosition(startX, startY + index * (buttonHeight + BUTTON_VERTICAL_GAP));
        });
    }

    /**
     * 同步按钮及其内部控件尺寸。
     * @param button 目标按钮。
     * @param width 按钮宽度。
     * @param height 按钮高度。
     */
    private resizeButton(button: GButton, width: number, height: number): void {
        const background = button.getChild("background");
        const label = button.getChild("label");
        if (!background || !label) throw new Error(`[LoginView] ${button.name} 结构不完整`);
        button.setSize(width, height);
        background.setSize(width, height);
        label.setSize(width, height);
    }

    /** 播放或刷新全屏背景视频 */
    private playBackgroundVideo(): void {
        if (!this.view) throw new Error("[LoginView] view 未初始化");
        if (this.view.width <= 0 || this.view.height <= 0) {
            throw new Error(`[LoginView] 背景视频尺寸非法：${this.view.width}x${this.view.height}`);
        }
        if (!this._bgVideo) this._bgVideo = new VideoUnit();
        this._bgVideo.playLoop(this.view, {
            url: BG_VIDEO_URL,
            loop: true,
            mute: true,
            width: this.view.width,
            height: this.view.height,
            zOrder: VIDEO_SORTING_ORDER,
        });
    }

    /**
     * 输出占位按钮点击日志。
     * @param name 按钮名称。
     */
    private onClickPlaceholder(name: PlaceholderButtonName): void {
        XDEBUGLOG.debug("[LoginView] 点击占位按钮", name);
    }

    /** 界面进入缓存时停止背景视频 */
    public clearByCache(): void {
        this.stopBackgroundVideo();
        super.clearByCache();
    }

    /** 停止并清空背景视频单元 */
    private stopBackgroundVideo(): void {
        if (!this._bgVideo) return;
        this._bgVideo.stop();
        this._bgVideo = null;
    }

    /** 停止视频并释放界面资源 */
    public dispose(): void {
        if (this.isDisposed) return;
        this.stopBackgroundVideo();
        this._overlay = null;
        this._titleText = null;
        this._subtitleText = null;
        this._buttons = [];
        super.dispose();
    }
}

(window as typeof window & { LoginView?: typeof LoginView }).LoginView = LoginView;
