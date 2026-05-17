type TDebugLogData = {
	/** 日志标签。 */
	tag: string;
	/** 字体颜色。 */
	color?: string;
	/** 背景颜色。 */
	bgcolor?: string;
};

type TLogCallback = (tag: string, ...args: unknown[]) => void;
type TLogger = (...data: unknown[]) => void;

export const DEBUG_LOG: Record<string, TDebugLogData> = {
	debug: { tag: "debug", color: "#00EEEE" },
	warn: { tag: "warn", color: "#EEEE00" },
	error: { tag: "error", color: "#FF0000" },
	ui: { tag: "ui", color: "#54FF9F" },
	scene: { tag: "scene", color: "#C0FF3E" },
	res: { tag: "res", color: "#00BFFF" },
	event: { tag: "event", color: "#00F5FF" },
	material: { tag: "material", color: "#1E90FF" },
	spine: { tag: "spine", color: "#FFDAB9" },
	net: { tag: "net", color: "#FFA500" },
	http: { tag: "http", color: "#FF69B4" },
	spine_release: { tag: "spine", color: "#FF69B4" },
	ui_release: { tag: "ui", color: "#FF69B4" },
	ui_destory: { tag: "ui", color: "#FF69B4" },
	battle: { tag: "battle", color: "#FF8C69" },
	guide: { tag: "guide", color: "#DA70D6" },
	procedure: { tag: "procedure", color: "#FF34B3" },
};

export default class XDEBUGLOG {
	/** 日志系统初始化时间戳。 */
	public static startTime: number = Date.now();
	/** 最大缓存数量，当前保留为兼容字段。 */
	public static maxCache: number = 500;
	/** 外部日志回调。 */
	public static logCallback?: TLogCallback;

	/** 初始化日志起始时间。 */
	public static init(): void {
		this.startTime = Date.now();
	}

	/**
	 * 输出带颜色标签的日志。
	 * @param tagData 日志标签配置。
	 * @param args 日志内容。
	 */
	public static colorTag(tagData: TDebugLogData | string, ...args: unknown[]): void {
		this.print(this.normalizeTagData(tagData), true, ...args);
	}

	/**
	 * 输出普通标签日志。
	 * @param tag 日志标签。
	 * @param args 日志内容。
	 */
	public static tag(tag: string, ...args: unknown[]): void {
		this.print({ tag }, false, ...args);
	}

	/**
	 * 输出调试日志。
	 * @param args 日志内容。
	 */
	public static debug(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.debug, ...args);
	}

	/**
	 * 输出警告日志。
	 * @param args 日志内容。
	 */
	public static warn(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.warn, ...args);
	}

	/**
	 * 输出错误日志。
	 * @param args 日志内容。
	 */
	public static error(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.error, ...args);
	}

	/**
	 * 输出 UI 日志。
	 * @param args 日志内容。
	 */
	public static ui(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.ui, ...args);
	}

	/**
	 * 输出场景日志。
	 * @param args 日志内容。
	 */
	public static scene(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.scene, ...args);
	}

	/**
	 * 输出资源日志。
	 * @param args 日志内容。
	 */
	public static res(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.res, ...args);
	}

	/**
	 * 输出事件日志。
	 * @param args 日志内容。
	 */
	public static event(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.event, ...args);
	}

	/**
	 * 输出材质日志。
	 * @param args 日志内容。
	 */
	public static material(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.material, ...args);
	}

	/**
	 * 输出 Spine 日志。
	 * @param args 日志内容。
	 */
	public static spine(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.spine, ...args);
	}

	/**
	 * 输出网络日志。
	 * @param args 日志内容。
	 */
	public static net(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.net, ...args);
	}

	/**
	 * 输出 HTTP 日志。
	 * @param args 日志内容。
	 */
	public static http(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.http, ...args);
	}

	/**
	 * 输出 Spine 释放日志。
	 * @param args 日志内容。
	 */
	public static spineRelease(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.spine_release, ...args);
	}

	/**
	 * 输出 UI 释放日志。
	 * @param args 日志内容。
	 */
	public static uiRelease(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.ui_release, ...args);
	}

	/**
	 * 输出 UI 销毁日志。
	 * @param args 日志内容。
	 */
	public static uiDestory(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.ui_destory, ...args);
	}

	/**
	 * 输出战斗日志。
	 * @param args 日志内容。
	 */
	public static battle(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.battle, ...args);
	}

	/**
	 * 输出引导日志。
	 * @param args 日志内容。
	 */
	public static guide(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.guide, ...args);
	}

	/**
	 * 输出流程日志。
	 * @param args 日志内容。
	 */
	public static procedure(...args: unknown[]): void {
		this.colorTag(DEBUG_LOG.procedure, ...args);
	}

	/**
	 * 输出日志的统一入口。
	 * @param tagData 日志标签配置。
	 * @param useColor 是否使用彩色输出。
	 * @param args 日志内容。
	 */
	private static print(tagData: TDebugLogData, useColor: boolean, ...args: unknown[]): void {
		const tag = tagData.tag;
		const logger = this.getLogger(tag);
		const passTimeSec = this.getPassTimeSec();
		const { message, error } = this.formatArgs(args);

		this.output(logger, tagData, useColor, message, passTimeSec);
		if (error) {
			console.error(error);
		}
		if (this.logCallback) {
			this.logCallback(tag, ...args);
		}
	}

	/**
	 * 规范化日志标签配置。
	 * @param tagData 原始标签配置或标签字符串。
	 * @returns 标准化后的标签配置对象。
	 */
	private static normalizeTagData(tagData: TDebugLogData | string): TDebugLogData {
		if (typeof tagData === "string") {
			return { tag: tagData };
		}
		return tagData;
	}

	/**
	 * 根据标签获取对应的日志函数。
	 * @param tag 日志标签。
	 * @returns 控制台输出函数。
	 */
	private static getLogger(tag: string): TLogger {
		if (tag === "error") {
			return console.error.bind(console);
		}
		if (tag === "warn") {
			return console.warn.bind(console);
		}
		return console.log.bind(console);
	}

	/**
	 * 计算当前日志相对初始化时的耗时文本。
	 * @returns 以秒为单位的耗时字符串。
	 */
	private static getPassTimeSec(): string {
		if (!this.startTime) {
			this.startTime = Date.now();
		}
		const passTime = Date.now() - this.startTime;
		return (passTime / 1000).toFixed(3);
	}

	/**
	 * 将参数整理为可输出字符串，并提取错误对象。
	 * @param args 原始日志参数列表。
	 * @returns 格式化后的日志文本与错误对象。
	 */
	private static formatArgs(args: unknown[]): { message: string; error: Error | null } {
		const splitTag = "  ";
		let message = "";
		let error: Error | null = null;

		for (let i = 0; i < args.length; i++) {
			const value = args[i];
			if (value instanceof Error) {
				error = value;
				message += splitTag + value.toString();
				continue;
			}
			message += splitTag + this.stringifyArg(value);
		}

		return { message, error };
	}

	/**
	 * 将单个参数安全转换为字符串。
	 * @param value 待转换的日志参数。
	 * @returns 转换后的字符串。
	 */
	private static stringifyArg(value: unknown): string {
		if (value === undefined) {
			return "undefined";
		}
		if (typeof value === "string") {
			return value;
		}
		if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
			return String(value);
		}
		if (typeof value === "symbol") {
			return value.toString();
		}
		if (typeof value === "function") {
			return `[Function ${value.name || "anonymous"}]`;
		}

		try {
			return JSON.stringify(value)?.replace(/\\n/g, "\n") ?? String(value);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return `[无法序列化对象: ${message}]`;
		}
	}

	/**
	 * 将日志内容输出到控制台。
	 * @param logger 控制台输出函数。
	 * @param tagData 日志标签配置。
	 * @param useColor 是否使用彩色输出。
	 * @param message 已格式化好的日志内容。
	 * @param passTimeSec 相对启动时间的秒数字符串。
	 */
	private static output(logger: TLogger, tagData: TDebugLogData, useColor: boolean, message: string, passTimeSec: string): void {
		const tag = tagData.tag;
		if (!useColor) {
			logger(`[${tag}]`, message, `[${passTimeSec}s]`);
			return;
		}

		const style = this.buildStyle(tagData);
		if (style) {
			logger(`%c[${tag}]${message}	[${passTimeSec}s]`, style);
			return;
		}

		logger(`[${tag}]`, message, `[${passTimeSec}s]`);
	}

	/**
	 * 根据标签配置生成控制台样式字符串。
	 * @param tagData 日志标签配置。
	 * @returns 控制台样式字符串。
	 */
	private static buildStyle(tagData: TDebugLogData): string {
		const styles: string[] = [];
		if (tagData.bgcolor) {
			styles.push(`background:${tagData.bgcolor}`);
		}
		if (tagData.color) {
			styles.push(`color:${tagData.color}`);
		}
		return styles.join(";");
	}
}

(globalThis as typeof globalThis & { XDEBUGLOG?: typeof XDEBUGLOG }).XDEBUGLOG = XDEBUGLOG;
