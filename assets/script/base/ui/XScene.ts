
/**
*Author  : XW
*Desc    : 场景扩展基类，整合场景级 UI 生命周期、依赖包与缓存清理逻辑
*/

import { SceneNameType } from "../../app/define/SceneDefine";
import { GComponent } from "../../fairyGUI/GComponent";
import { GRoot } from "../../fairyGUI/GRoot";
import ResMgr from "../manager/ResMgr";
import { DragonBonesUnit } from "../unit/DragonBonesUnit";
import NetworkUnit from "../unit/NetworkUnit";
import ObserveUnit from "../unit/ObserveUnit";
import { SpineUnit } from "../unit/SpineUnit";
import TimerUnit from "../unit/TimerUnit";
import TweenUnit from "../unit/TweenUnit";

export default class XScene extends GComponent {
	/** 当前场景视图 */
	public view: GComponent;

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
	/** 网络单元 */
	private _networkUnit: NetworkUnit;

	/** 场景名称 */
	public SCENENAME: SceneNameType;

	/** 本场景依赖的 FairyGUI 包 */
	public getFairyPackageArr(): string[] {
		return [];
	}

	/** 场景创建时的初始化逻辑 */
	public onCreate() {

	}

	/**
	 * 刷新场景数据。
	 * @param arg 刷新参数。
	 */
	public onRefresh(arg?: any) {

	}

	/**
	 * 所有 UI 显示完成后调用。
	 * @param uiNameArr 已显示的 UI 名称数组。
	 */
	public onUIShow(uiNameArr: string[]) {
		// XDEBUGLOG.scene("XScene onUIShow finish", uiNameArr);
	}

	/** 场景启用时的处理 */
	public onEnable() {
		if (this._observeUnit && this._observeUnit.isPause) {
			this._observeUnit.resume();
		}
		if (this._networkUnit && this._networkUnit.isPause) {
			this._networkUnit.resume();
		}
		if (this._timerUnit && this._timerUnit.isPause) {
			this._timerUnit.resume();
		}
		if (this._spineUnit && this._spineUnit.isPause) {
			this._spineUnit.resume();
		}
		if (this._dragonBonesUnit && this._dragonBonesUnit.isPause) {
			this._dragonBonesUnit.resume();
		}
		if (this._tweenUnit && this._tweenUnit.isPause) {
			this._tweenUnit.resume();
		}
		super.onEnable();
	}

	/** 场景禁用时的处理 */
	public onDisable() {
		//暂停不涉及模块逻辑的组件
		if (this._spineUnit) {
			this._spineUnit.pause();
		}
		if (this._dragonBonesUnit) {
			this._dragonBonesUnit.pause();
		}
	}

	/** 缓存模式时，清理掉一些不能再次使用的资源/对象 */
	public clearByCache() {
		if (this._observeUnit) {
			this._observeUnit.pause();
		}
		if (this._networkUnit) {
			this._networkUnit.pause();
		}
		if (this._timerUnit) {
			this._timerUnit.pause();
		}
		if (this._tweenUnit) {
			this._tweenUnit.pause();
		}
		super.clearByCache();
	}

	/** 场景尺寸变化时的处理 */
	public onStageResize() {
		if (this.view) {
			this.view.setSize(GRoot.inst.width, GRoot.inst.height);
		}
	}

	/** 获取 Tween 动画单元 */
	public get tweenUnit() {
		if (!this._tweenUnit) {
			this._tweenUnit = new TweenUnit();
		}
		return this._tweenUnit;
	}

	/** 获取定时器单元 */
	public get timerUnit() {
		if (!this._timerUnit) {
			this._timerUnit = new TimerUnit(this);
		}
		return this._timerUnit;
	}

	/** 获取网络单元 */
	public get networkUnit() {
		if (!this._networkUnit) {
			this._networkUnit = new NetworkUnit();
			this._networkUnit.onCreate();
		}
		return this._networkUnit;
	}

	/** 获取观察者单元 */
	public get observeUnit() {
		if (!this._observeUnit) {
			this._observeUnit = new ObserveUnit(this);
		}
		return this._observeUnit;
	}

	/** 获取 Spine 骨骼单元 */
	public get spineUnit(): SpineUnit {
		if (!this._spineUnit) {
			this._spineUnit = new SpineUnit();
		}
		return this._spineUnit;
	}

	/** 获取 DragonBones 骨骼单元 */
	public get dragonBonesUnit(): DragonBonesUnit {
		if (!this._dragonBonesUnit) {
			this._dragonBonesUnit = new DragonBonesUnit();
		}
		return this._dragonBonesUnit;
	}

	/** 释放场景资源 */
	public dispose() {
		let uuid: string = this.node.uuid;
		if (this._timerUnit) {
			this._timerUnit.dispose();
			this._timerUnit = null;
		}
		if (this._networkUnit) {
			this._networkUnit.dispose();
			this._networkUnit = null;
		}
		if (this._observeUnit) {
			this._observeUnit.dispose();
			this._observeUnit = null;
		}
		if (this._tweenUnit) {
			this._tweenUnit.dispose();
			this._tweenUnit = null;
		}
		if (this._spineUnit) {
			this._spineUnit.dispose();
			this._spineUnit = null;
		}
		if (this._dragonBonesUnit) {
			this._dragonBonesUnit.dispose();
			this._dragonBonesUnit = null;
		}
		if (this.view) {
			this.view.dispose();
			this.view = null;
		}
		super.dispose();

		let pkgs = this.getFairyPackageArr();
		for (let i = 0; i < pkgs.length; i++) {
			let pkgName = pkgs[i];
			ResMgr.inst.unloadFGUIPakcageRef(pkgName, uuid);
		}
	}
}

window["XScene"] = XScene;
