/**
*Author  : XW
*Desc    : 事件单元，负责节点事件与全局事件的注册、移除、暂停和释放
*/

import { Component, Node, game } from "cc";
import { GObject } from "../../fairyGUI/GObject";
import EventMgr from "../manager/EventMgr";
import { FEvent } from "../../fairyGUI/event/Event";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import { Controller } from "../../fairyGUI/Controller";
import { GList } from "../../fairyGUI/GList";
import TimerMgr, { ITimer } from "../manager/TimerMgr";
import { XResConst } from "../define/XResConst";
import { EVENTNAME } from "../../app/define/EventDefine";

/** 点击事件最小间隔 */
const CLICK_EVENT_INTERVAL_MS = 300;

type Dispatcher = Node | GObject | Component | Controller;
type EventCallback = (...any: any[]) => void | Function;
type Listener = { dispatcher: any, event: string, callback: EventCallback, targetObj: any, sourceCallback?: EventCallback, sourceTargetObj?: any };
type GlobalListener = { callback: IEvent.CallBack<any>, target?: any };

export default class EventUnit {
	/**事件警告阈值 */
	private _warnThreshold = 80;
	/** 当前单元注册的本地事件监听列表 */
	private _allListener: Listener[];
	/** 当前单元注册的全局事件映射表 */
	private _globalEventMap: Partial<Record<IEvent.Name, GlobalListener[]>>;
	/**长按事件数据 [uuid] = timer*/
	private _longTouchTimer: { [uuid: string]: ITimer };
	/**双击事件数据 */
	private _doubleClickTimerDict: { [key: string]: { time: number, index: number } };
	public isPause: boolean = false;

	/** 初始化事件单元 */
	constructor() {
		this._allListener = [];
		this._globalEventMap = {};
		this._longTouchTimer = {};
	}

	/**
	 * 监听点击事件并播放通用点击音效
	 * @param dispatcher 监听目标
	 * @param callback 回调
	 * @param targetObj 回调对象
	 */
	public addClickEvent(dispatcher: GObject, callback: EventCallback, targetObj: any): void {
		this._addEvent(dispatcher, FEvent.CLICK, callback, targetObj, true);
	}

	/**
	 * 监听事件
	 * @param dispatcher 监听目标
	 * @param event 事件
	 * @param callback 回调
	 * @param targetObj 回调对象
	 */
	public addEventListner(dispatcher: GObject, event: any, callback: (...any: any[]) => any | Function, targetObj: any) {
		this._addEvent(dispatcher, event, callback, targetObj);
	}

	/**
	 * 监听双击事件
	 * @param btn 监听目标
	 * @param callback 回调
	 * @param thisObj 回调对象
	 */
	public addDoubleClickEvent(dispatcher: GObject, callback: Function, thisObj: any) {
		this._doubleClickTimerDict ||= {};
		this._addEvent(dispatcher, FEvent.CLICK, () => {
			if (!dispatcher.node) return;
			let uuid = dispatcher.node.uuid;
			let curTime = game.totalTime;
			let last = this._doubleClickTimerDict[uuid] = this._doubleClickTimerDict[uuid] || { time: 0, index: 0 };
			last.index++;
			if (last.index < 2) {
				last.time = curTime;
			} else {
				let diff = curTime - last.time;
				if (diff < 1000) {
					last.index = 0;
					callback.call(thisObj);
				} else {
					last.index = 1;
					last.time = curTime;
				}
			}
		}, this);
	}

	/**
	 * 监听列表点击某某项的事件
	 * @param list 列表
	 * @param callback 回调
	 * @param thisObj 回调对象
	 */
	public addClickListItemEvent(list: GList, callback: (item: any, ev: FEvent) => void, thisObj: any) {
		this._addEvent(list, FEvent.CLICK_ITEM, callback, thisObj);
	}

	/** 监听控制器改变事件 */
	public addCtrlChangeEvent(ctrl: Controller, callback: (...any: any[]) => void | Function, thisObj: any) {
		if (ctrl instanceof Controller) {
			if (this.isRepeat(ctrl, FEvent.STATUS_CHANGED, callback, thisObj)) {
				XDEBUGLOG.warn("重复监听事件", FEvent.STATUS_CHANGED);
				return;
			}
			ctrl.on(FEvent.STATUS_CHANGED, callback, thisObj);
			let listener: Listener = { dispatcher: ctrl, event: FEvent.STATUS_CHANGED, callback: callback, targetObj: thisObj };
			this.pushListener(listener);
		}
	}

	/**
	 * 监听全局派发的事件
	 * @param event 事件名称
	 * @param callback 回调
	 * @param targetObj 回调对象
	 */
	public addGlobalEventListener<T extends IEvent.Name>(event: T, callback: IEvent.CallBack<T>, targetObj: any) {
		if (!this._globalEventMap[event]) {
			this._globalEventMap[event] = [];
		}
		let eventQueue = this._globalEventMap[event];
		eventQueue.push({ target: targetObj, callback: callback });
		EventMgr.inst.addEventListener(event, callback, targetObj);
	}

	/**
	 * 监听长按事件
	 * @param dispatcher 
	 * @param callback 
	 * @param thisObj 
	 * @param time 长按X秒后执行长按回调
	 * @param longMinTime 执行长按的最小间隔时间
	 */
	public addLongTouchEvent(dispatcher: GObject, callback: Function, thisObj: any, time: number = 0.3, longMinTime: number = 38): void {
		let node: Node = dispatcher.node;
		let isTouch: boolean; // 按下标记
		let iTimer: ITimer;
		let endFun = (evt: FEvent) => {
			isTouch = null;
			if (iTimer) {
				TimerMgr.inst.removeTimer(iTimer);
				iTimer = null;
			}
			iTimer = this._longTouchTimer[node.uuid];
			if (iTimer) {
				TimerMgr.inst.removeTimer(iTimer);
				delete this._longTouchTimer[node.uuid];
			}
			this.removeEvent(dispatcher, FEvent.TOUCH_END, endFun, this);
		}
		this._addEvent(dispatcher, FEvent.TOUCH_BEGIN, (evt: FEvent) => {
			let timeSpace: number = 0.208;
			let spaceNum: number = 0;
			iTimer = this._longTouchTimer[node.uuid];
			if (iTimer) {
				TimerMgr.inst.removeTimer(iTimer);
				delete this._longTouchTimer[node.uuid];
			}
			isTouch = true;
			iTimer = TimerMgr.inst.setTimeout(() => {
				if (isTouch) { // 依旧是按下状态 - 执行长按
					let interval = () => {
						let tmpTimer = TimerMgr.inst.setInterval(() => {
							spaceNum++;
							if (spaceNum >= 2) { // 递增倍率可以这里调整 ∈[2, ∞)
								spaceNum = 0;
								timeSpace = Math.max(longMinTime, timeSpace - 0.050); // 速率递增
								TimerMgr.inst.removeTimer(tmpTimer);
								interval();
								return;
							}
							callback.call(thisObj);
						}, timeSpace * 1000, this);
						this._longTouchTimer[node.uuid] = tmpTimer;
					}
					interval();
				}
				this._addEvent(dispatcher, FEvent.TOUCH_END, endFun, this);
			}, time * 1000, this);
		}, this)
	}

	/** 强制停止长按 */
	public clearLongTouch(target: GObject): void {
		let timer: ITimer = this._longTouchTimer[target.node.uuid];
		if (!timer) return;
		TimerMgr.inst.removeTimer(timer);
		delete this._longTouchTimer[target.node.uuid];
	}

	/**
	 * 监听事件
	 * @param dispatcher 监听目标
	 * @param event 事件名称
	 * @param callback 回调
	 * @param thisObj 回调对象
	 * @param shouldPlayClickSound 是否播放通用点击音效
	 */
	private _addEvent(dispatcher: Dispatcher, event: string, callback: EventCallback, thisObj: any, shouldPlayClickSound: boolean = false): void {
		if (!dispatcher) {
			XDEBUGLOG.error("target不能传null空值");
			return;
		}
		let node = (dispatcher instanceof GObject || dispatcher instanceof Component) ? dispatcher.node : dispatcher;
		if (!node) {
			XDEBUGLOG.error("监听事件的dispatcher未定义");
			return;
		}
		if (this.isRepeat(dispatcher, event, callback, thisObj)) {
			XDEBUGLOG.warn("重复监听事件", event);
			return;
		}
		let eventCallback: EventCallback = callback;
		let eventTarget = thisObj;
		if (shouldPlayClickSound) {
			let lastClickTime = -CLICK_EVENT_INTERVAL_MS;
			eventCallback = (...args: any[]) => {
				const now = game.totalTime;
				if (now - lastClickTime < CLICK_EVENT_INTERVAL_MS) {
					return;
				}
				lastClickTime = now;
				EventMgr.inst.dispatchEvent(EVENTNAME.PLAY_SOUND, { url: XResConst.AUDIO_MAP.buttonClick });
				callback.call(thisObj, ...args);
			};
			eventTarget = this;
		}
		node.on(event, eventCallback, eventTarget);
		let listener: Listener = { dispatcher: dispatcher, event: event, callback: eventCallback, targetObj: eventTarget, sourceCallback: callback, sourceTargetObj: thisObj };
		this.pushListener(listener);
	}

	/**
	 * 事件是否重复监听了
	 * @param dispatcher 监听目标
	 * @param event 事件名称
	 * @param callback 回调
	 * @param thisObj 回调对象
	 * @returns boolean
	 */
	private isRepeat(dispatcher: Dispatcher, event: string, callback: EventCallback, thisObj: any): boolean {
		let l: Listener;
		for (let i = 0; i < this._allListener.length; i++) {
			l = this._allListener[i];
			if (l.dispatcher === dispatcher && l.event === event && (l.sourceCallback || l.callback) === callback && (l.sourceTargetObj || l.targetObj) === thisObj)
				return true;
		}
		return false;
	}

	/**
	 * 插入事件
	 * @param listener 事件对象
	 */
	private pushListener(listener: Listener) {
		this._allListener.push(listener);
		let size = this._allListener.length;
		if (size > this._warnThreshold) {
			XDEBUGLOG.warn(`EventUnit监听事件太多：${size},超过${this._warnThreshold}`);
			this._warnThreshold *= 2;
		}
	}

	public pause() {
		if (this.isPause) return;
		this.isPause = true;
		for (let i = 0; i < this._allListener.length; i++) {
			let listener: Listener = this._allListener[i];
			let node = (listener.dispatcher instanceof GObject || listener.dispatcher instanceof Component) ? listener.dispatcher.node : listener.dispatcher;
			if (listener.event != FEvent.CLICK) {
				node && node.off(listener.event, listener.callback, listener.targetObj);
			}
		}
		for (let eventName in this._globalEventMap) {
			const typedEventName = eventName as IEvent.Name;
			let eventQueue: GlobalListener[] = this._globalEventMap[typedEventName];
			if (!eventQueue) continue;
			for (let i = 0; i < eventQueue.length; i++) {
				EventMgr.inst.removeListener(typedEventName, eventQueue[i].callback as IEvent.CallBack<any>, eventQueue[i].target);
			}
		}
	}

	public resume() {
		if (!this.isPause) return;
		this.isPause = false;
		for (let i = 0; i < this._allListener.length; i++) {
			let listener: Listener = this._allListener[i];
			let node = (listener.dispatcher instanceof GObject || listener.dispatcher instanceof Component) ? listener.dispatcher.node : listener.dispatcher;
			if (listener.event != FEvent.CLICK) {
				node && node.on(listener.event, listener.callback, listener.targetObj);
			}
		}
		for (let eventName in this._globalEventMap) {
			const typedEventName = eventName as IEvent.Name;
			let eventQueue: GlobalListener[] = this._globalEventMap[typedEventName];
			if (!eventQueue) continue;
			for (let i = 0; i < eventQueue.length; i++) {
				EventMgr.inst.addEventListener(typedEventName, eventQueue[i].callback as IEvent.CallBack<any>, eventQueue[i].target);
			}
		}
	}

	/**
	 * 移除事件
	 * @param dispatcher 监听目标
	 * @param event 事件名称
	 * @param callback 回调
	 * @param thisObj 回调对象
	 */
	public removeEvent(dispatcher: Dispatcher, event: string, callback: EventCallback, thisObj: any): void {
		if (!this._allListener) return;
		let l: Listener;
		for (let i = 0; i < this._allListener.length; i++) {
			l = this._allListener[i];
			if (l.dispatcher === dispatcher && l.event === event && (l.sourceCallback || l.callback) === callback && (l.sourceTargetObj || l.targetObj) === thisObj) {
				let node = (dispatcher instanceof GObject || dispatcher instanceof Component) ? dispatcher.node : dispatcher;
				node && node.off(event, l.callback, l.targetObj);
				this._allListener.splice(i, 1);
				return;
			}
		}
	}


	/** 释放全部本地与全局事件监听 */
	public dispose() {
        for (let i = 0; i < this._allListener.length; i++) {
			let l: Listener = this._allListener[i];
			let node = (l.dispatcher instanceof GObject || l.dispatcher instanceof Component) ? l.dispatcher.node : l.dispatcher;
			node && node.off(l.event, l.callback, l.targetObj);
		}
		this._allListener = [];

		for (let eventName in this._globalEventMap) {
			const typedEventName = eventName as IEvent.Name;
			let eventQueue: GlobalListener[] = this._globalEventMap[typedEventName];
			if (!eventQueue) continue;
			for (let i = 0; i < eventQueue.length; i++) {
				EventMgr.inst.removeListener(typedEventName, eventQueue[i].callback as IEvent.CallBack<any>, eventQueue[i].target);
			}
		}
		this._globalEventMap = {};

		for (let uuid in this._longTouchTimer) {
			let timer: ITimer = this._longTouchTimer[uuid];
			TimerMgr.inst.removeTimer(timer);
		}
		this._longTouchTimer = {};

		this._doubleClickTimerDict = null;
	}
}
