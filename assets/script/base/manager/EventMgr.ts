/**
*Author  : XW
*Desc    :
*/

import XDEBUGLOG from "../debug/XDEBUGLOG";

type AnyEventCallBack = IEvent.CallBack<IEvent.Name>;

export default class EventMgr {

    private static _inst: EventMgr;
    private _eventMap: Map<IEvent.Name, { callback: AnyEventCallBack, target?: Object }[]>;

    public static get inst(): EventMgr {
        if (!this._inst) {
            this._inst = new EventMgr();
            this._inst.init();
        }
        return this._inst;
    }

    public init() {
        this._eventMap = new Map<IEvent.Name, { callback: AnyEventCallBack, target?: Object }[]>();
    }

    public addEventListener<T extends IEvent.Name>(eventName: T, callback: IEvent.CallBack<T>, target?: Object): void {
        if (!this._eventMap.has(eventName)) {
            this._eventMap.set(eventName, []);
        }
        const eventQueue = this._eventMap.get(eventName);
        if (!eventQueue) return;
        eventQueue.push({ target: target, callback: callback as AnyEventCallBack });
    }

    public removeListener<T extends IEvent.Name>(eventName: T, callback?: IEvent.CallBack<T>, target?: Object): void {
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

    public dispatchEvent<T extends IEvent.Name>(
        eventName: T,
        ...data: IEvent.Data<T> extends undefined ? [] | [undefined] : [IEvent.Data<T>]
    ): void {
        if (!this._eventMap.has(eventName))
            return;
        const eventQueue = this._eventMap.get(eventName);
        if (!eventQueue) return;
        for (let i = 0; i < eventQueue.length; i++) {
            const obj = eventQueue[i];
            (obj.callback as IEvent.CallBack<T>).call(obj.target, eventName, data[0] as IEvent.Data<T>);
        }
    }

    public dump() {
        XDEBUGLOG.event(this._eventMap);
    }

    public clear() {
        this._eventMap = new Map<IEvent.Name, { callback: AnyEventCallBack, target?: Object }[]>();
    }
}

window["EventMgr"] = EventMgr;
