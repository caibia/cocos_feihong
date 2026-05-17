/**
*Author  : XW
*Desc    : 按钮扩展组件，整合计时器、观察者、网络、动画和骨骼等常用能力
*/

import { GButton } from "../../fairyGUI/GButton";
import { DragonBonesUnit } from "../unit/DragonBonesUnit";
import GestureUnit from "../unit/GestureUnit";
import NetworkUnit from "../unit/NetworkUnit";
import ObserveUnit from "../unit/ObserveUnit";
import { SpineUnit } from "../unit/SpineUnit";
import TimerUnit from "../unit/TimerUnit";
import TweenUnit from "../unit/TweenUnit";

export default class XButton extends GButton {
	public arg: any;
	private _timerUnit: TimerUnit;
	private _networkUnit: NetworkUnit;
	private _observeUnit: ObserveUnit;
	private _tweenUnit: TweenUnit;
	private _spineUnit: SpineUnit;
	private _dragonBonesUnit: DragonBonesUnit;
	private _gestureUnit: GestureUnit;

	protected onConstruct(): void {
		this.onCreate();
	}

	public onCreate(): void {
		this.initComponentByView(this);
		this.initControllerByView(this);
	}

	public onRefresh(arg?: any) {
		this.arg = arg;
	}

	public onEnable(): void {
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
		super.onEnable();

	}

	public onDisable(): void {
		//暂停不涉及模块逻辑的组件
		if (this._spineUnit) {
			this._spineUnit.pause();
		}
		if (this._dragonBonesUnit) {
			this._dragonBonesUnit.pause();
		}
		super.onDisable();
	}

	public get tweenUnit() {
		if (!this._tweenUnit) {
			this._tweenUnit = new TweenUnit();
		}
		return this._tweenUnit;
	}

	public get timerUnit() {
		if (!this._timerUnit) {
			this._timerUnit = new TimerUnit(this);
		}
		return this._timerUnit;
	}

	public get networkUnit() {
		if (!this._networkUnit) {
			this._networkUnit = new NetworkUnit();
		}
		return this._networkUnit;
	}

	public get observeUnit() {
		if (!this._observeUnit) {
			this._observeUnit = new ObserveUnit(this);
		}
		return this._observeUnit;
	}

	public get spineUnit(): SpineUnit {
		if (!this._spineUnit) {
			this._spineUnit = new SpineUnit();
		}
		return this._spineUnit;
	}

	public get dragonBonesUnit(): DragonBonesUnit {
		if (!this._dragonBonesUnit) {
			this._dragonBonesUnit = new DragonBonesUnit();
		}
		return this._dragonBonesUnit;
	}

	public get gestureUnit(): GestureUnit {
		if (!this._gestureUnit) {
			this._gestureUnit = new GestureUnit();
		}
		return this._gestureUnit;
	}

	public dispose() {
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
		if (this._gestureUnit) {
			this._gestureUnit.dispose();
			this._gestureUnit = undefined;
		}
		super.dispose();
	}

}
