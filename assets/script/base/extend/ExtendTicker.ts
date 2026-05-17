/**
*Author  : XW
*Desc    : 每帧回调桥接组件，用于把引擎 update 转发给挂载对象
*/

import { Component } from "cc";

/** 每帧 `onTick` 转发组件 */
export default class ExtendTicker extends Component {

	/** 节点加载时的生命周期占位回调 */
	protected onLoad(): void {

	}

	/** 节点启动时的生命周期占位回调 */
	protected start(): void {

	}

	/**
	 * 每帧把时间增量转发给挂载对象的 `onTick`。
	 * @param dt 本帧时间增量。
	 */
	protected update(dt: number) {
		let $gobj = (<any>this.node)["$gobj"];
		if ($gobj) $gobj.onTick(dt);
	}

	// protected lateUpdate(dt: number): void {
	// 	let $gobj = (<any>this.node)["$gobj"];
	// 	if ($gobj) $gobj.lateTick(dt);
	// }
}
