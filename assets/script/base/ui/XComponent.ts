/**
*Author  : XW
*Desc    : 界面扩展基类，整合 UI 适配、资源依赖、运行单元与生命周期封装
*/

import { AlignType, LoaderFillType, VertAlignType } from "../../fairyGUI/FieldTypes";
import { GComponent } from "../../fairyGUI/GComponent";
import { GLoader } from "../../fairyGUI/GLoader";
import XConst from "../define/XConst";
import ResMgr from "../manager/ResMgr";
import { SpineUnit } from "../unit/SpineUnit";
import TweenUnit from "../unit/TweenUnit";
import ExtendColor from "../extend/ExtendColor";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import UIMgr from "../manager/UIMgr";
import { GRoot } from "../../fairyGUI/GRoot";
import ObserveUnit from "../unit/ObserveUnit";
import { XResourcesUrl } from "../define/XResourcesUrl";
import { ExtendScreenShot } from "../extend/ExtendScreenShot";
import MaterialMgr from "../manager/MaterialMgr";
import GestureUnit from "../unit/GestureUnit";
import TimerUnit from "../unit/TimerUnit";
import RedPointUnit from "../unit/RedPointUnit";
import { DragonBonesUnit } from "../unit/DragonBonesUnit";
import UIDefine, { UINameType } from "../../app/define/UIDefine";

/** UI 的适配模式 */
export const enum UIADAPT_TYPE {
	/** 不做任何适配 */
	None = "None",
	/** 自动控制居中 */
	SetToCenter = "SetToCenter",
	/** this.size始终设置为全屏，需要在fgui中额外设置ui适配方式 */
	FguiAlwaysFullScreen = "FguiAlwaysFullScreen",
}

/**
 * 界面的继承基类。
 */
export default class XComponent extends GComponent {
	/** 适配类型 */
	public uiAdaptType: UIADAPT_TYPE;
	/** UI 名字 */
	public UINAME: UINameType;

	/** Spine 骨骼单元 */
	private _spineUnit: SpineUnit;
	/** DragonBones 骨骼单元 */
	private _dragonBonesUnit: DragonBonesUnit;
	/** 定时器单元 */
	private _timerUnit: TimerUnit;
	/** Tween 动画单元 */
	private _tweenUnit: TweenUnit;
	/** 观察者单元 */
	private _observeUnit: ObserveUnit;
	/** 手势单元 */
	private _gestureUnit: GestureUnit;
	/** 红点单元 */
	private _redpointUnit: RedPointUnit;

	/** 当前是否作为窗口使用 */
	protected isWindow: boolean;
	/** 是否忽略顶部的刘海(true表示size会覆盖顶部刘海的范围) */
	public ignoreTopLiuhai: boolean = false;
	/** 是否忽略底部的刘海 */
	public ignoreBottomLiuhai: boolean = false;
	/** 当前视图 */
	public view: GComponent;
	/** 背景景深模糊 Loader */
	protected blurLoader: GLoader;
	/** Block 阻挡背景图 */
	protected blockBg: GLoader;
	/** 点击 Block 背景时的回调 */
	private _blockCb: () => void;
	/**表示UiMgr打开的顺序，用于避免异步加载导致界面的上下层级错乱的问题 */
	public showIndex: number;
	/**对应UiMgr的layer的索引 */
	public layerIndex: number;
	/**是否还在加载中 */
	public isLoading: boolean;
	/**是否已调用onCreate */
	public created: boolean;
	/**onRefresh的时间戳 防止刚打开就点击背景关闭 */
	private _refreshTime: number;
	/** 缓存开始时间戳(在关闭界面时更新) */
	public cacheTime: number;
	/** onRefresh 的参数记录 */
	protected _arg: any;

	/** 构建完成后执行初始化 */
	protected onConstruct(): void {
		this.onCreate();
	}

	/** 创建界面时的初始化逻辑 */
	public onCreate(): void {
		if (this.created) return;
		this.uiAdaptType = UIADAPT_TYPE.None;
		this.created = true;
	}

	/**
	 * 刷新界面数据。
	 * @param arg 刷新参数。
	 */
	public onRefresh(arg?: any) {
		this._arg = arg;
		this._refreshTime = Date.now();
	}
	/** Spine 骨骼动画单元 */
	public get spineUnit(): SpineUnit {
		if (!this._spineUnit) {
			this._spineUnit = new SpineUnit();
		}
		return this._spineUnit;
	}
	/** DragonBones 骨骼单元 */
	public get dragonBonesUnit(): DragonBonesUnit {
		if (!this._dragonBonesUnit) {
			this._dragonBonesUnit = new DragonBonesUnit();
		}
		return this._dragonBonesUnit;
	}
	/** Tween 动画单元 */
	public get tweenUnit(): TweenUnit {
		if (!this._tweenUnit) {
			this._tweenUnit = new TweenUnit();
		}
		return this._tweenUnit;
	}
	/** 定时器单元 */
	public get timerUnit(): TimerUnit {
		if (!this._timerUnit) {
			this._timerUnit = new TimerUnit(this);
		}
		return this._timerUnit;
	}
	/** 观察者单元 */
	public get observeUnit(): ObserveUnit {
		if (!this._observeUnit) {
			this._observeUnit = new ObserveUnit(this);
		}
		return this._observeUnit;
	}
	/** 手势单元 */
	public get gestureUnit(): GestureUnit {
		if (!this._gestureUnit) {
			this._gestureUnit = new GestureUnit();
		}
		return this._gestureUnit;
	}
	/** 红点单元 */
	public get redpointUnit(): RedPointUnit {
		if (!this._redpointUnit) {
			this._redpointUnit = new RedPointUnit();
		}
		return this._redpointUnit;
	}

	//是否需要隐藏底层其他界面。 
	public get hideBottom() {
		let uiCfg = UIDefine.ALL_UI[this.UINAME];
		return uiCfg.fullscreen || uiCfg.blur;
	}

	/** 景深背景模糊 */
	public async setDepthOfField() {
		if (!this.blurLoader) {
			this.blurLoader = new GLoader();
			this.blurLoader.name = "blurLoader";
			this.blurLoader.setPivot(0, 0, true);
			this.blurLoader.setPosition(0, 0);
			this.blurLoader.autoSize = true;
			this.blurLoader.align = AlignType.Center;
			this.blurLoader.verticalAlign = VertAlignType.Middle;
			this.addChildAt(this.blurLoader, 0);
		}
		if (this.blurLoader.texture) return;
		let x = -this.x;
		let y = -this.y;
		if (this.uiAdaptType != UIADAPT_TYPE.None) {
			x = x + this.width * this.pivotX;
			y = y + this.height * this.pivotY;
		}
		this.blurLoader.setPosition(x, y);
		MaterialMgr.inst.resetToLastMaterial(this.blurLoader._content);
		await ExtendScreenShot.inst.takeScreenShot(this.blurLoader);
	}

	/**
	 * 半透黑色背景
	 * @param alpha 背景透明度。
	 */
	protected block(alpha: number = 0.7) {
		if (this.view) {
			this.view.opaque = false;  //允许穿透空白区域， 从而能点击到blockBg关闭界面
		}
		if (!this.blockBg) {
			this.blockBg = new GLoader();
			this.blockBg.name = "blockBg";
			this.blockBg.fill = LoaderFillType.ScaleFree;
			this.blockBg.url = XResourcesUrl.ALL_BLACK_IMGURL;
			this.blockBg.touchable = true;
			this.blockBg.width = XConst.REAL_SCREEN_WIDTH * 5;
			this.blockBg.height = XConst.REAL_SCREEN_HEIGHT * 5;
			this.blockBg.x = -this.blockBg.width * 0.5;
			this.blockBg.y = -this.blockBg.height * 0.5;
			this.blockBg.color = ExtendColor.fromHEX("#000000");
			this.addChildAt(this.blockBg, 0)
		}
		this.blockBg.alpha = alpha;
		this.blockBg.onClick(this.onTouchBlock, this)
		// if (this.blockBg) {
		// 	this.blockBg.offClick(this.onTouchBlock, this);
		// 	this.removeChild(this.blockBg);
		// 	this.blockBg = undefined;
		// }
	}

	/**
	 * 设置点击半透背景关闭回调。
	 * @param cb 点击回调。
	 */
	public setBlockCallback(cb: () => void) {
		this._blockCb = cb;
	}
	/** 点击半透背景关闭 */
	private onTouchBlock() {
		if (this._refreshTime && Date.now() - this._refreshTime < 300) {
			// if(CC_DEBUG)XDEBUG.warn("点击block太快");
			return;
		}
		this._blockCb && this._blockCb();
	}

	/**
	 * 声明本界面依赖的 FairyGUI 包。
	 * @returns 依赖包数组。
	 */
	public getFairyPackageArr(): string[] {
		return [];
	}

	/**
	 * 把类的属性和 UI 中的同名控件绑定起来。
	 * @param view 目标视图对象。
	 */
	public initComponentByView(view: GComponent) {
		super.initComponentByView(view);
	}

	/** 屏幕大小改变事件处理 */
	public onStageResize() {
		if (this.width == 0 || this.height == 0) {
			if (this.view) {
				this.setSize(this.view.width, this.view.height);
			}
		}

		if (this.uiAdaptType == UIADAPT_TYPE.SetToCenter) {   						/** 自动设置居中 */
			let width = this.width;
			if (width > 0) {
				this.setPivot(0.5, 0.5, true);
				this.x = GRoot.inst.width >> 1;
				this.y = GRoot.inst.height >> 1;
			}
		} else if (this.uiAdaptType == UIADAPT_TYPE.FguiAlwaysFullScreen) {			/** 始终全屏，由FGUI设置适配方式 */
			// this.setPivot(0.5, 0.5, true);
			// this.setSize(GRoot.inst.width, GRoot.inst.height);
			// this.x = GRoot.inst.width >> 1;
			// this.y = GRoot.inst.height >> 1;
			this.setPivot(0.5, 0.5, true);
			let liuhaiTop = this.ignoreTopLiuhai ? 0 : XConst.TOP_LIUHAI_HEIGHT;
			let liuhaiBottom = this.ignoreBottomLiuhai ? 0 : XConst.BOTTOM_LIUHAI_HEIGHT;
			let height = XConst.REAL_SCREEN_HEIGHT - liuhaiTop - liuhaiBottom;
			this.setSize(XConst.REAL_SCREEN_WIDTH, height);
			this.x = XConst.REAL_SCREEN_WIDTH >> 1;
			this.y = (height >> 1) + liuhaiTop;
		}
	}

	public setSize(w: number, h: number, ignorePivot?: boolean) {
		super.setSize(w, h, ignorePivot);
		if (this.view && this.view != this) {
			this.view.setSize(w, h, ignorePivot);
		}
	}

	protected onEnable(): void {
		if (this._timerUnit && this._timerUnit.isPause) {
			this._timerUnit.resume();
		}
		if (this._spineUnit && this._spineUnit.isPause) {
			this._spineUnit.resume();
		}
		if (this._dragonBonesUnit && this._dragonBonesUnit.isPause) {
			this._dragonBonesUnit.resume();
		}
		if (this._observeUnit && this._observeUnit.isPause) {
			this._observeUnit.resume();
		}
		if (this._tweenUnit && this._tweenUnit.isPause) {
			this._tweenUnit.resume();
		}
		super.onEnable();
	}

	protected onDisable(): void {
		//暂停不涉及模块逻辑的组件
		if (this._spineUnit) {
			this._spineUnit.pause();
		}
		if (this._dragonBonesUnit) {
			this._dragonBonesUnit.pause();
		}
		if (this._tweenUnit) {
			this._tweenUnit.pause();
		}
		super.onDisable();
	}

	public onClickClose(): void {
		this.destroyWithAni();
	}

	/** 窗口打开动画， 有自己特殊的打开动画需求的请重写这个函数*/
	public async onShowAni() { }

	/** 窗口关闭动画 */
	public async onHideAni() { }

	public async destroyWithAni() {
		if (!this.UINAME) {
			XDEBUGLOG.error("UiMgr打开的界面才有必要调用destroyWithAni");
			return;
		}
		if (this.isWindow) {
			await this.onHideAni();
		}
		UIMgr.inst.destroy(this.UINAME);
	}

	public clearByCache() {
		if (this.blurLoader && this.blurLoader.texture) {
			this.blurLoader.texture.texture.destroy();
			this.blurLoader.texture = undefined;
		}
		if (this._observeUnit) {
			this._observeUnit.pause();
		}
		if (this._timerUnit) {
			this._timerUnit.pause();
		}
		if (this._tweenUnit) {
			this._tweenUnit.pause();
		}
		if (this._spineUnit) {
			this._spineUnit.clearByCache();
		}
		if (this._dragonBonesUnit) {
			this._dragonBonesUnit.clearByCache();
		}
		super.clearByCache();
	}

	public dispose() {
		let uuid: string = this.node.uuid;
		if (this.blurLoader) {
			if (this.blurLoader.texture) {
				this.blurLoader.texture.texture.destroy();
				this.blurLoader.texture = undefined;
			}
			this.blurLoader.dispose();
			this.blurLoader = undefined;
		}
		if (this._spineUnit) {
			this._spineUnit.dispose();
			this._spineUnit = undefined;
		}
		if (this._dragonBonesUnit) {
			this._dragonBonesUnit.dispose();
			this._dragonBonesUnit = undefined;
		}
		if (this._timerUnit) {
			this._timerUnit.dispose();
			this._timerUnit = undefined;
		}
		if (this._tweenUnit) {
			this._tweenUnit.dispose();
			this._tweenUnit = undefined;
		}
		if (this._observeUnit) {
			this._observeUnit.dispose();
			this._observeUnit = undefined;
		}
		if (this._gestureUnit) {
			this._gestureUnit.dispose();
			this._gestureUnit = undefined;
		}
		if (this.blockBg) {
			this.blockBg.offClick(this.onTouchBlock, this);
			this.blockBg.dispose();
			this.blockBg = undefined;
		}
		if (this.view) {
			if (this.view != this) {
				this.view.dispose();
			}
			this.view = undefined;
		}
		this._arg = undefined;
		super.dispose();

		let pkgs = this.getFairyPackageArr();
		for (let i = 0; i < pkgs.length; i++) {
			let pkgName = pkgs[i];
			ResMgr.inst.unloadFGUIPakcageRef(pkgName, uuid);
		}
	}
}
