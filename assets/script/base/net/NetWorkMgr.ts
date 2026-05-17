/**
 *Author  : XW
 *Desc    : 网络管理器
 */

import { DEBUG } from "cc/env";
import { ProtoDataMap } from "../../app/define/ProtoDefine";
import { EVENTNAME } from "../../app/define/EventDefine";
import { UINAME } from "../../app/define/UIDefine";
import XConst from "../define/XConst";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import Extend from "../extend/Extend";
import ExtendString from "../extend/ExtendString";
import EventMgr from "../manager/EventMgr";
import TimerMgr, { ITimer } from "../manager/TimerMgr";
import UIMgr from "../manager/UIMgr";
import SocketMgr from "./SocketMgr";

type ProtoName = keyof ProtoDataMap & string;

/** RPC 超时时间（毫秒） */
const RPC_TIMEOUT_MS = 30 * 1000;
/** 重连间隔（毫秒） */
const RECONNECT_INTERVAL_MS = 2000;
/** 最大重连次数 */
const RECONNECT_MAX_RETRY = 5;

export default class NetWorkMgr {
	/** socket 连接成功回调 */
	private _successCb: (() => void) | null = null;
	/** socket 连接失败回调 */
	private _failCb: (() => void) | null = null;

	/** 最近一次连接 ip（用于断线重连） */
	private _lastConnectIp: string = "";
	/** 最近一次连接端口（用于断线重连） */
	private _lastConnectPort: number = 0;
	/** 当前重连次数 */
	private _reconnectAttempt: number = 0;
	/** 是否正在执行重连 */
	private _isReconnecting: boolean = false;
	/** 重连定时器 */
	private _reconnectTimer: ITimer | null = null;
	/** 最大重连次数 */
	private _maxReconnectRetry: number = RECONNECT_MAX_RETRY;

	/** RPC 的 id 自增 */
	private _rpcHandlerId: number = 0;
	/** RPC 集合 */
	private _rpcHandlerMap: { [key: number]: ProtoSender } = {};

	/** 监听事件的 id */
	private _listenerId: number = 0;
	/** 监听事件集合 */
	private _listenerMap: { [key: string | number]: { protoNameArr?: string[]; callback?: (p: string, m: any) => void } };
	/** 协议名 -> listenerId 集合 */
	private _listenerHandleIdMap: { [key: string]: number[] };

	private static _inst: NetWorkMgr;
	public static get inst(): NetWorkMgr {
		if (!this._inst) {
			this._inst = new NetWorkMgr();
		}
		return this._inst;
	}

	/** 初始化网络管理器 */
	public init(): void {
		this._listenerMap = {};
		this._listenerHandleIdMap = {};
		this._rpcHandlerMap = {};
		this._rpcHandlerId = 0;
		this._successCb = null;
		this._failCb = null;
		this._lastConnectIp = "";
		this._lastConnectPort = 0;
		this._reconnectAttempt = 0;
		this._isReconnecting = false;
		this.needReconnect = false;
		this.clearReconnectTimer();
		this.removeSocketEvent();
		SocketMgr.inst.init();
	}

	/** 是否已建立连接 */
	public isConnected(): boolean {
		return SocketMgr.inst.isConnected();
	}

	/** 监听 Socket 事件 */
	public addSocketEvent(): void {
		EventMgr.inst.addEventListener(EVENTNAME.SOCKET_CONNECTTED, this.onSocketConnect, this);
		EventMgr.inst.addEventListener(EVENTNAME.SOCKET_DISCONNECTTED, this.onSocketDisconnect, this);
		EventMgr.inst.addEventListener(EVENTNAME.SOCKET_ERROR, this.onSocketError, this);
	}

	/** 移除 Socket 事件 */
	public removeSocketEvent(): void {
		EventMgr.inst.removeListener(EVENTNAME.SOCKET_CONNECTTED, this.onSocketConnect, this);
		EventMgr.inst.removeListener(EVENTNAME.SOCKET_DISCONNECTTED, this.onSocketDisconnect, this);
		EventMgr.inst.removeListener(EVENTNAME.SOCKET_ERROR, this.onSocketError, this);
	}

	/**
	 * 建立连接。
	 * @param ip 服务器 ip
	 * @param port 服务器端口
	 * @param successCb 连接成功回调
	 * @param failCb 连接失败回调
	 */
	public socketConnect(ip: string, port: number, successCb?: () => void, failCb?: () => void): void {
		const connectIp = String(ip || "").trim();
		const connectPort = Math.floor(Number(port || 0));
		if (!connectIp || connectPort <= 0) {
			XDEBUGLOG.warn("socketConnect 参数非法", connectIp, connectPort);
			failCb?.();
			return;
		}

		this._lastConnectIp = connectIp;
		this._lastConnectPort = connectPort;
		this.needReconnect = false;
		this._reconnectAttempt = 0;
		this._isReconnecting = false;
		this.clearReconnectTimer();

		if (SocketMgr.inst.isConnected()) {
			if (SocketMgr.inst.ip === connectIp && SocketMgr.inst.port === connectPort) {
				XDEBUGLOG.net("重复请求连接 socket，已复用现有连接");
				successCb?.();
				return;
			}
			SocketMgr.inst.disconnect();
			XDEBUGLOG.net("连接地址发生变化，已断开旧连接", `旧地址=${SocketMgr.inst.ip}:${SocketMgr.inst.port}`);
		}

		this.removeSocketEvent();
		this.addSocketEvent();
		this._successCb = successCb || null;
		this._failCb = failCb || null;
		SocketMgr.inst.connect(connectIp, connectPort);
	}

	/** 主动断开连接 */
	public disconnect(): void {
		this.needReconnect = false;
		this._isReconnecting = false;
		this._reconnectAttempt = 0;
		this.clearReconnectTimer();
		this._successCb = null;
		this._failCb = null;
		this.removeSocketEvent();
		SocketMgr.inst.disconnect();
	}

	/**
	 * 建立连接成功回调。
	 */
	private onSocketConnect(): void {
		this.needReconnect = false;
		this._isReconnecting = false;
		this._reconnectAttempt = 0;
		this.clearReconnectTimer();
		if (this._successCb) {
			this._successCb();
		}
		this._successCb = null;
		this._failCb = null;
	}

	/** 断开连接回调 */
	private onSocketDisconnect(): void {
		this.removeSocketEvent();
		XDEBUGLOG.net("NetworkMgr 连接已断开");
		if (this._failCb) {
			this._failCb();
			this._successCb = null;
			this._failCb = null;
			return;
		}
		this._successCb = null;
		this._failCb = null;
		this.needReconnect = true;
		this.CheckReconnect();
	}

	/** 心跳计数（保留字段） */
	public heartNum: number = 0;
	/** 是否需要重连 */
	public needReconnect: boolean = false;

	/**
	 * 检查并发起重连。
	 */
	public CheckReconnect(): void {
		if (!this.needReconnect) {
			return;
		}
		if (SocketMgr.inst.isConnected()) {
			this.needReconnect = false;
			this._isReconnecting = false;
			this._reconnectAttempt = 0;
			this.clearReconnectTimer();
			return;
		}
		if (!this._lastConnectIp || this._lastConnectPort <= 0) {
			XDEBUGLOG.warn("无法重连：缺少历史连接地址");
			return;
		}
		if (XConst.inBackground) {
			XDEBUGLOG.net("应用在后台，暂不执行重连");
			return;
		}
		if (this._reconnectTimer || this._isReconnecting) {
			return;
		}
		this._reconnectTimer = TimerMgr.inst.setTimeout(() => {
			this._reconnectTimer = null;
			this.reconnectFn();
		}, RECONNECT_INTERVAL_MS, this);
	}

	/**
	 * 执行一次重连。
	 */
	public reconnectFn(): void {
		if (!this.needReconnect || SocketMgr.inst.isConnected()) {
			return;
		}
		if (XConst.inBackground) {
			this.CheckReconnect();
			return;
		}
		if (this._isReconnecting) {
			return;
		}
		if (this._reconnectAttempt >= this._maxReconnectRetry) {
			this.needReconnect = false;
			XDEBUGLOG.warn("重连次数已达上限，停止重连", `上限=${this._maxReconnectRetry}`);
			return;
		}

		this._reconnectAttempt += 1;
		const reconnectIndex = this._reconnectAttempt;
		this._isReconnecting = true;
		XDEBUGLOG.net("开始重连", `第${reconnectIndex}次`, `${this._lastConnectIp}:${this._lastConnectPort}`);

		this.removeSocketEvent();
		this.addSocketEvent();
		this._successCb = () => {
			this._isReconnecting = false;
			this.needReconnect = false;
			this._reconnectAttempt = 0;
			XDEBUGLOG.net("重连成功", `第${reconnectIndex}次`);
		};
		this._failCb = () => {
			this._isReconnecting = false;
			this.needReconnect = true;
			XDEBUGLOG.warn("重连失败", `第${reconnectIndex}次`);
			this.CheckReconnect();
		};
		SocketMgr.inst.connect(this._lastConnectIp, this._lastConnectPort);
	}

	/** socket 错误回调 */
	private onSocketError(): void {
		if (this._failCb) {
			this._failCb();
		}
		this._successCb = null;
		this._failCb = null;
		if (this.needReconnect) {
			this.CheckReconnect();
		}
	}

	/** 清理重连定时器 */
	private clearReconnectTimer(): void {
		if (!this._reconnectTimer) {
			return;
		}
		TimerMgr.inst.removeTimer(this._reconnectTimer);
		this._reconnectTimer = null;
	}

	/**
	 * 单向发送协议。
	 * @param protocol 协议名
	 * @param msg 协议内容
	 */
	public send<T extends ProtoName>(protocol: T, msg: ProtoDataMap[T]): boolean {
		return SocketMgr.inst.send(protocol, msg);
	}

	/**
	 * 协议接收分发。
	 * @param protoName 协议名
	 * @param msg 协议体
	 */
	public onReceiveMessage<T extends ProtoName>(protoName: T, msg: ProtoDataMap[T]): void {
		UIMgr.inst.destroy(UINAME.NetLoadingView);
		const startTime = Date.now();
		try {
			const listenerIdArr = this._listenerHandleIdMap[protoName];
			if (listenerIdArr) {
				for (let j = 0; j < listenerIdArr.length; j += 1) {
					const handlerId = listenerIdArr[j];
					const handler = this._listenerMap[handlerId];
					if (handler && handler.callback) {
						handler.callback(protoName, msg);
					}
				}
			}
			for (const handlerIdx in this._rpcHandlerMap) {
				const pSender: ProtoSender = this._rpcHandlerMap[handlerIdx];
				const isMatch = pSender.onReceivePto(protoName, msg);
				if (isMatch) {
					break;
				}
			}
		} catch (e) {
			if (DEBUG) {
				XDEBUGLOG.warn(`接收协议 ${protoName} 处理异常`);
				throw e;
			}
			XDEBUGLOG.warn(`接收协议 ${protoName} 处理异常`, e);
		}
		const dt = Date.now() - startTime;
		if (dt > 2) {
			const lag = dt >= 150 ? "耗时较高" : "";
			XDEBUGLOG.warn(`${protoName} 协议处理耗时 ${dt}ms ${lag}`);
		}
	}

	/**
	 * 添加协议监听。
	 * @param protoNameArr 协议名数组
	 * @param callback 回调
	 */
	public addProtoListener(protoNameArr: string[], callback: (p: string, m: any) => void): number {
		const listenerId = ++this._listenerId;
		const handler = { protoNameArr, callback };
		this._listenerMap[this._listenerId] = handler;

		for (let i = 0; i < protoNameArr.length; i += 1) {
			const protoName = protoNameArr[i];
			let arr: number[] = this._listenerHandleIdMap[protoName];
			if (!arr) {
				arr = [];
				this._listenerHandleIdMap[protoName] = arr;
			}
			arr.push(listenerId);
			if (arr.length > 4) {
				XDEBUGLOG.warn("协议监听数量较多，请检查是否遗漏移除", protoName);
			}
		}
		return listenerId;
	}

	/**
	 * 根据监听 id 移除协议监听。
	 * @param listenerId 监听 id
	 */
	public removeProtoListener(listenerId: number | string): void {
		const handler = this._listenerMap[listenerId];
		if (!handler) {
			return;
		}
		if (handler.protoNameArr) {
			for (let i = 0; i < handler.protoNameArr.length; i += 1) {
				const protocol = handler.protoNameArr[i];
				const arr = this._listenerHandleIdMap[protocol] || [];
				for (let idx = 0; idx < arr.length; idx += 1) {
					if (arr[idx] === listenerId) {
						arr.splice(idx, 1);
						break;
					}
				}
			}
		}
		delete this._listenerMap[listenerId];
	}

	/**
	 * 请求-应答协议。
	 * @param protoName 发送协议名
	 * @param msg 协议体
	 * @param recvProtoArr 期望回包协议
	 * @param successCb 成功回调
	 * @param failCb 失败回调
	 */
	public sendRPC<TSend extends ProtoName, TRecv extends ProtoName>(
		protoName: TSend,
		msg: ProtoDataMap[TSend],
		recvProtoArr: TRecv[],
		successCb?: (name: TRecv, msg: ProtoDataMap[TRecv]) => void,
		failCb?: (msg: any) => void
	): number {
		XDEBUGLOG.net("sendRPC", protoName, "期望:", recvProtoArr.join(" "));
		this._rpcHandlerId += 1;
		const pSender = new ProtoSender();
		pSender.init(
			protoName,
			msg,
			recvProtoArr as unknown as string[],
			this._rpcHandlerId,
			successCb as unknown as (name: string, msg: any) => void,
			failCb
		);
		this._rpcHandlerMap[this._rpcHandlerId] = pSender;
		pSender.send();
		return this._rpcHandlerId;
	}

	/**
	 * 清理单个 RPC。
	 * @param id RPC id
	 */
	public clearRPC(id: number | string): void {
		const pSender = this._rpcHandlerMap[id];
		if (!pSender) {
			return;
		}
		delete this._rpcHandlerMap[id];
		pSender.clear();
	}

	/** 清理全部 RPC */
	public clearAllRPC(): void {
		for (const k in this._rpcHandlerMap) {
			const pSender = this._rpcHandlerMap[k];
			pSender.clear();
		}
		this._rpcHandlerMap = {};
	}

	/**
	 * 发送 HTTP 请求。
	 * @param method 请求方法
	 * @param url 请求地址
	 * @param param 请求参数
	 * @param sendJson 是否按 json 提交
	 * @param successCb 成功回调
	 * @param failCb 失败回调
	 * @param extraOption 请求附加配置
	 */
	public sendHttp(
		method: "GET" | "POST",
		url: string,
		param?: any,
		sendJson?: boolean,
		successCb?: Function,
		failCb?: Function,
		extraOption?: { headers?: Record<string, string> }
	) {
		return new Promise<any>((resolve, reject) => {
			const isGet = method === "GET";
			const isPost = method === "POST";
			const requestHeaders = extraOption?.headers;
			let postdata: any;
			let response: any;
			let isClose = false;
			const req = new XMLHttpRequest();
			const fail = (...args: any[]) => {
				XDEBUGLOG.http("fail", url, response, ...args);
				req.onabort = req.onerror = req.onreadystatechange = null;
				if (failCb) failCb(response, ...args);
				if (!isClose) {
					isClose = true;
					reject(response);
				}
			};
			const success = (ret: any) => {
				req.onabort = req.onerror = req.onreadystatechange = null;
				if (successCb) successCb(ret);
				if (!isClose) {
					isClose = true;
					resolve(ret);
				}
			};
			req.onabort = (...args) => {
				fail(...args);
			};
			req.onerror = (...args) => {
				fail(...args);
			};
			req.onreadystatechange = () => {
				response = req.response;
				const OPENED = 1;
				const DONE = 4;
				if (req.readyState === OPENED) {
					if (sendJson && !requestHeaders?.["Content-Type"]) {
						req.setRequestHeader("Content-Type", "application/json");
					}
					if (requestHeaders) {
						for (const key in requestHeaders) {
							req.setRequestHeader(key, requestHeaders[key]);
						}
					}
					req.send(postdata);
					XDEBUGLOG.http("send", url, postdata);
				} else if (req.readyState === DONE) {
					if (req.status === 200) {
						XDEBUGLOG.http("result", url, response);
						const resContentType = req.getResponseHeader("Content-Type") || "";
						if (/application\/json/.test(resContentType)) {
							response = Extend.jsonSafeParse(response);
						}
						success(response);
					} else {
						XDEBUGLOG.http(`非 200 状态码,url=${url},req.status=${req.status},response=${response}`);
						fail();
					}
				}
			};

			if (isGet) {
				if (param) {
					if (typeof param === "object") {
						const pstr = ExtendString.joinHttpQuery(param);
						if (pstr.length > 0) {
							if (url.indexOf("?") >= 0) {
								url = `${url}&${pstr}`;
							} else {
								url = `${url}?${pstr}`;
							}
						}
					} else {
						XDEBUGLOG.error("GET 请求时，param 参数必须是 object 类型");
					}
				}
			} else if (isPost) {
				if (param && typeof param === "string") {
					postdata = param;
				} else if (sendJson && typeof param === "object") {
					postdata = JSON.stringify(param);
				}
			}

			XDEBUGLOG.http("open", url);
			req.open(method, url, true);
		});
	}
}

/** RPC 发送对象 */
export class ProtoSender {
	/** 发送协议名 */
	public sendProtoName: string;
	/** 接收协议集合 */
	public recvProtoArr: string[];
	/** 接收协议映射 */
	private recvProtoMap: { [key: string]: boolean };
	/** 成功回调 */
	private _successCallback: ((p: string, m: any) => void) | null = null;
	/** 失败回调 */
	private _errCallback: ((msg?: any) => void) | null = null;
	/** 发送协议体 */
	private sendMsg: any;
	/** 超时计时器 */
	private timer: ITimer | null = null;
	/** RPC id */
	private id: number;

	public constructor() {
		this.recvProtoMap = {};
	}

	/**
	 * 初始化发送器。
	 * @param sendPtoName 发送协议名
	 * @param msg 发送协议体
	 * @param receivePtoArr 接收协议集合
	 * @param id RPC id
	 * @param successCb 成功回调
	 * @param errCb 失败回调
	 */
	public init(
		sendPtoName: string,
		msg: any,
		receivePtoArr: string[],
		id: number,
		successCb?: (p: string, m: any) => void,
		errCb?: (msg?: any) => void,
	): void {
		this.sendProtoName = sendPtoName;
		this.sendMsg = msg;
		this.recvProtoArr = receivePtoArr;
		this._successCallback = successCb || null;
		this._errCallback = errCb || null;
		this.id = id;

		for (let i = 0; i < receivePtoArr.length; i += 1) {
			const ptoName = receivePtoArr[i];
			this.recvProtoMap[ptoName] = true;
		}
	}

	/** 发送协议 */
	public send(): void {
		SocketMgr.inst.send(this.sendProtoName, this.sendMsg);
		this.timer = TimerMgr.inst.setTimeout(() => {
			this.onOverTime();
		}, RPC_TIMEOUT_MS, this);
	}

	/**
	 * 处理协议接收。
	 * @param protoName 协议名
	 * @param msg 协议体
	 */
	public onReceivePto(protoName: string, msg: any): boolean {
		let isMatch = false;
		if (this.recvProtoArr.indexOf(protoName) > -1) {
			isMatch = true;
			if (this._successCallback) {
				this._successCallback(protoName, msg);
			}
			this.clear();
		}
		return isMatch;
	}

	/** 协议发送超时 */
	private onOverTime(): void {
		XDEBUGLOG.error("sendRPC 失败", this.sendProtoName, "期望:", this.recvProtoArr.join(" "));
		if (this._errCallback) {
			this._errCallback();
		}
		this.clear();
	}

	/** 清理超时计时器 */
	public clearOvertime(): void {
		if (!this.timer) {
			return;
		}
		TimerMgr.inst.removeTimer(this.timer);
		this.timer = null;
	}

	/** 清理发送器 */
	public clear(): void {
		this.clearOvertime();
		NetWorkMgr.inst.clearRPC(this.id);
		this.sendProtoName = null;
		this.recvProtoArr = null;
		this.recvProtoMap = null;
		this._successCallback = null;
		this._errCallback = null;
		this.sendMsg = null;
		this.id = null;
	}
}

window["NetWorkMgr"] = NetWorkMgr;
