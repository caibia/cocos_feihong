/**
*Author  : XW
*Desc    :
*/

import XDEBUGLOG from "../debug/XDEBUGLOG";
import { EventDataMap } from "../../app/define/EventDefine";

export type EventName = keyof EventDataMap;
type EventData<T extends EventName> = EventDataMap[T];
export type EventCallBack<T extends EventName = EventName> = (eventName: T, data: EventData<T>) => void;
type AnyEventCallBack = EventCallBack<EventName>;

export default class EventMgr {

    private static _inst: EventMgr;
    private _eventMap: Map<EventName, { callback: AnyEventCallBack, target?: Object }[]>;

    public static get inst(): EventMgr {
        if (!this._inst) {
            this._inst = new EventMgr();
            this._inst.init();
        }
        return this._inst;
    }

    public init() {
        this._eventMap = new Map<EventName, { callback: AnyEventCallBack, target?: Object }[]>();
    }

    public addEventListener<T extends EventName>(eventName: T, callback: EventCallBack<T>, target?: Object): void {
        if (!this._eventMap.has(eventName)) {
            this._eventMap.set(eventName, []);
        }
        const eventQueue = this._eventMap.get(eventName);
        if (!eventQueue) return;
        eventQueue.push({ target: target, callback: callback as AnyEventCallBack });
    }

    public removeListener<T extends EventName>(eventName: T, callback?: EventCallBack<T>, target?: Object): void {
        if (!this._eventMap.has(eventName))
            return;
        if (callback && target) {
            const eventQueue = this._eventMap.get(eventName);
            if (!eventQueue) return;
            for (let i = 0; i < eventQueue.length; i++) {
                const obj = eventQueue[i];
                if (obj.callback == (callback as AnyEventCallBack) && obj.target == target) {
                    eventQueue.splice(i, 1);
                    break;
                }
            }
            if (eventQueue.length <= 0) {
                this._eventMap.delete(eventName);
            }
        } else {
            this._eventMap.delete(eventName);
        }
    }

    public dispatchEvent<T extends EventName>(
        eventName: T,
        ...data: EventData<T> extends undefined ? [] | [undefined] : [EventData<T>]
    ): void {
        if (!this._eventMap.has(eventName))
            return;
        const eventQueue = this._eventMap.get(eventName);
        if (!eventQueue) return;
        for (let i = 0; i < eventQueue.length; i++) {
            const obj = eventQueue[i];
            (obj.callback as EventCallBack<T>).call(obj.target, eventName, data[0] as EventData<T>);
        }
    }

    public dump() {
        XDEBUGLOG.event(this._eventMap);
    }

    public clear() {
        this._eventMap = new Map<EventName, { callback: AnyEventCallBack, target?: Object }[]>();
    }
}

window["EventMgr"] = EventMgr;
