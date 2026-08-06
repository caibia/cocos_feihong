
/**
*Author  : XW
*Desc    : 
*/

import { CacheMode, Color, Material, resources, UIRenderer } from "cc";
import { GTextField } from "../../fairyGUI/GTextField";
import XDEBUGLOG from "../debug/XDEBUGLOG";
import Extend from "./Extend";

/** 文本竖向渐变材质资源路径（编辑器据 text-gradient.effect 生成的 .mtl） */
const TEXT_GRADIENT_MAT_PATH = "shaders/text-gradient";

/**渐变色 */
export const enum GRADUEBTCOLOR_ENUM {
	/**绿-白 */
	GREEN_WHITE = "@GREEN_WHITE",
	/**蓝-白 */
	BLUE_WHITE = "@BLUE_WHITE",
	/**紫-白 A020F0*/
	PURPLE_WHITE = "@PURPLE_WHITE",
	/**橙-白 FFA500*/
	ORANGE_WHITE = "@ORANGE_WHITE",
	/**红-白 */
	RED_WHITE = "@RED_WHITE",
	/**金-红 FFC125*/
	GOLDEN_WHITE = "@GOLDEN_WHITE",
}

/**渐变色配置 */
const GradientColorMap = {
	//顶点颜色按照 左下、右下、左上、右上、的顺序
	[GRADUEBTCOLOR_ENUM.GREEN_WHITE]: [Color.WHITE, Color.WHITE, Color.GREEN, Color.GREEN],
	[GRADUEBTCOLOR_ENUM.BLUE_WHITE]: [Color.WHITE, Color.WHITE, Color.BLUE, Color.BLUE],
	[GRADUEBTCOLOR_ENUM.PURPLE_WHITE]: [Color.WHITE, Color.WHITE, new Color().fromHEX("#A020F0"), new Color().fromHEX("#A020F0")],
	[GRADUEBTCOLOR_ENUM.ORANGE_WHITE]: [Color.WHITE, Color.WHITE, new Color().fromHEX("#FFA500"), new Color().fromHEX("#FFA500")],
	[GRADUEBTCOLOR_ENUM.RED_WHITE]: [Color.WHITE, Color.WHITE, Color.RED, Color.RED],
	[GRADUEBTCOLOR_ENUM.GOLDEN_WHITE]: [Color.WHITE, Color.WHITE, new Color().fromHEX("#FFD700"), new Color().fromHEX("#FFD700")],
}

/**渐变/变色信息 CacheMode.CHAR时要逐字修改的颜色，主要用于支持UBB改变颜色的需求*/
export type GradientColorInfo = {
	color: Color | string,
	start: number,
	end: number
};
/**变色/渐变色的信息合集 CacheMode.CHAR时要逐字修改的颜色，主要用于支持UBB改变颜色的需求*/
export type GradientColorInfoArr = GradientColorInfo[];

export default class ExtendColor {
	private static _setVertexColorToVB(vData: Float32Array<ArrayBuffer>, vert: any, vertexIndex: number, stride: number, colorOffset: number, color: Color) {
		let baseOffset: number;
		if (vert && vert.vertexOffset != null) {
			baseOffset = vert.vertexOffset + colorOffset;
		} else {
			baseOffset = vertexIndex * stride + colorOffset;
		}
		vData[baseOffset] = color.r / 255;
		vData[baseOffset + 1] = color.g / 255;
		vData[baseOffset + 2] = color.b / 255;
		vData[baseOffset + 3] = color.a / 255;
	}

	public static txtColor: Color = new Color();
	public static GOLD: Color = new Color().fromHEX("FFFF00FF");
	public static RED: Color = new Color().fromHEX("ff0000ff");
	public static ORANGE: Color = new Color().fromHEX("FF6633FF");
	public static PURPLE: Color = new Color().fromHEX("ff00ffff");
	public static BLUE: Color = new Color().fromHEX("0099FFFF");
	public static GREEN: Color = new Color().fromHEX("66FF00FF");
	public static WHITE: Color = new Color().fromHEX("FFFFFFFF");
	public static BROWN: Color = new Color().fromHEX("802A2AFF");
	public static LIGHTGREY: Color = new Color().fromHEX("999999FF");


	public static fromHEX(hex: string): Color {
		let color: Color = new Color();
		return color.fromHEX(hex);
	}

	/** 每个渐变预设缓存一个材质实例（预设固定、数量少，可跨 Label 共享同一预设的材质） */
	private static _gradMatCache: { [presetKey: string]: Material } = {};
	/** 渐变基础材质（懒加载，避免进 MaterialMgr 批量预加载导致整批失败） */
	private static _gradBaseMat: Material = null;
	private static _gradBaseLoading: boolean = false;

	/** 懒加载渐变基础材质；未就绪返回 null 并触发一次异步加载，下次调用即可用 */
	private static _getGradBaseMat(): Material {
		if (ExtendColor._gradBaseMat) return ExtendColor._gradBaseMat;
		let mat = resources.get(TEXT_GRADIENT_MAT_PATH, Material);
		if (mat) {
			ExtendColor._gradBaseMat = mat;
			return mat;
		}
		if (!ExtendColor._gradBaseLoading) {
			ExtendColor._gradBaseLoading = true;
			resources.load(TEXT_GRADIENT_MAT_PATH, Material, (err, asset) => {
				ExtendColor._gradBaseLoading = false;
				if (err || !asset) {
					XDEBUGLOG.warn("text-gradient 材质加载失败，请先在编辑器据 effect 生成 shaders/text-gradient.mtl", err);
					return;
				}
				ExtendColor._gradBaseMat = asset;
			});
		}
		return null;
	}

	/**
	 * 给整段文本挂"竖向渐变材质"（纯材质实现，不依赖逐顶点色，原生/Web 一致）。
	 * 仅适用于整段统一渐变（如 [color=@金渐变] 包裹全文）。多段不同纯色请用富文本。
	 * @param tf 目标 GTextField
	 * @param presetKey GradientColorMap 的预设 key，如 GRADUEBTCOLOR_ENUM.GOLDEN_WHITE
	 * @param flipY 渐变方向翻转（不同字体/贴图 uv 原点可能上下相反时置 1）
	 * @returns 是否成功挂上材质；失败（材质未创建/未加载）时返回 false，调用方可回退原逻辑
	 */
	public static applyGradientMaterial(tf: GTextField, presetKey: string, flipY: number = 0): boolean {
		if (!tf || !tf.ccLabel) return false;
		const colors = GradientColorMap[presetKey];
		if (!colors) {
			XDEBUGLOG.warn("未定义的渐变预设", presetKey);
			return false;
		}
		// 预设顶点顺序：左下、右下、左上、右上 => top=colors[2], bottom=colors[0]
		const top = colors[2];
		const bottom = colors[0];

		let mat = ExtendColor._gradMatCache[presetKey];
		if (!mat) {
			const base = ExtendColor._getGradBaseMat();
			if (!base) {
				// 材质尚未就绪（首次会触发异步加载），本次回退到调用方原逻辑
				return false;
			}
			mat = new Material();
			mat.copy(base);
			mat.setProperty("topColor", top);
			mat.setProperty("bottomColor", bottom);
			mat.setProperty("flipY", flipY);
			ExtendColor._gradMatCache[presetKey] = mat;
		}

		const label = tf.ccLabel;
		// 整段一张贴图，uv.y 即上→下，作为渐变坐标
		if (label.cacheMode != CacheMode.NONE) label.cacheMode = CacheMode.NONE;
		// 渲染色交给材质：只把底层 label 渲染色置白避免二次叠乘，保留 GTextField._color 不变
		label.color = Color.WHITE;
		label.customMaterial = mat;
		return true;
	}

	/** 清除文本上的渐变材质，恢复默认渲染 */
	public static clearGradientMaterial(tf: GTextField) {
		if (tf && tf.ccLabel && tf.ccLabel.customMaterial) {
			tf.ccLabel.customMaterial = null;
		}
	}

	/**
	 * 设置文本整体渐变色，不支持CacheMode.CHAR, 只支持CacheMode.NONE/CacheMode.BITMAP
	 * @param tf GtextField
	 * @param colorType 渐变颜色配置key
	 */
	public static gradientColor(tf: GTextField, colorType: GRADUEBTCOLOR_ENUM) {
		if (!tf || !tf.ccLabel) return;
		if (tf.ccLabel.cacheMode == CacheMode.CHAR) {
			XDEBUGLOG.warn("gradientColor不支持CacheMode.CHAR模式，请改用gradientColorByChar接口");
			return;
		}
		let colors = GradientColorMap[colorType];
		Extend.assert(colors, "没有配置该渐变色" + colorType);
		tf.color = Color.WHITE;
		ExtendColor._gradientColor(tf, colors);
	}

	/**
	 * 逐字变色 仅支持GTextField，不支持GRichTextField 
	 * @param tf GtextField
	 * @param colorArr 变色/渐变色的信息合集 CacheMode.CHAR时要逐字修改的颜色，主要用于支持UBB改变颜色的需求
	 */
	public static gradientColorByChar(tf: GTextField, colorArr: GradientColorInfoArr) {
		if (!tf || !tf.ccLabel) return;
		if (tf.ccLabel.cacheMode != CacheMode.CHAR) {
			XDEBUGLOG.warn("gradientColorByChar只支持CacheMode.CHAR模式");
			return;
		}
		ExtendColor._gradientColor(tf, undefined, colorArr);
	}

	/** 
	 * GTextField中部分文本改为渐变色文本	
	 * 仅支持GTextField，不支持GRichTextField
	 * CacheMode.NONE/CacheMode.BITMAP时，整体文本变色
	 * CacheMode.CHAR时，逐字变色
	 * @param colors 4个颜色数值
	 * @param colorArr 变色/渐变色的信息合集 CacheMode.CHAR时要逐字修改的颜色，主要用于支持UBB改变颜色的需求
	 * */
	private static _gradientColor(tf: GTextField, colors?: Color[], colorArr?: GradientColorInfoArr) {
		if (!tf || !tf.ccLabel) return;
		//TODO：nativeTTF时，顶点数据是在C++中装配的，ts代码无法修改
		if (tf.isNativeTTF) {
			return;
		}
		let cacheMode = tf.ccLabel.cacheMode;
		//TODO：节点颜色
		let nodeColor = tf.color;
		let labelOpacity = tf.node._uiProps.opacity;

		//TODO：渲染数据
		const renderData = tf.ccLabel.renderData!;
		//TODO：顶点的原始属性
		const dataList = renderData.data;
		//TODO：顶点数量	vData.length/9 = 48个顶点
		const vertexCount = renderData.vertexCount;
		if (vertexCount === 0) return;
		//TODO：顶点缓冲区数据  vData.length/9 = 48个顶点 48/4 = 12个字(图)
		let vData = renderData.chunk.vb;
		//TODO：顶点的步距(顶点属性数量 3D的为9 包含：[x,y,z,u,v,r,g,b,a])
		const stride = renderData.floatStride;
		//TODO：顶点颜色偏移
		let colorOffset = 5;

		//TODO：对于CacheMode.CHAR模式的Label
		if (cacheMode == CacheMode.CHAR) {
			// 每个字符占用4个顶点
			const step = 4 * stride; // stride: 单个顶点的数据步长（如位置+颜色+UV的总长度）
			// 遍历颜色配置数组
			for (let tci = 0; tci < colorArr.length; tci++) {
				const colorInfo = colorArr[tci];
				if (colorInfo.start == null || colorInfo.end == null) continue;
				// 获取颜色配置（支持渐变色或固定色）
				let colors: Color[];
				if (typeof colorInfo.color === "string") {
					// 从渐变映射表中获取颜色数组
					colors = GradientColorMap[colorInfo.color];
					if (!colors) {
						console.error("未定义的渐变色", colorInfo.color);
						continue;
					}
				} else {
					// 固定颜色（四个顶点用同一颜色）
					colors = [colorInfo.color, colorInfo.color, colorInfo.color, colorInfo.color];
				}

				// 遍历需要修改的字符范围（从start到end）
				for (let charIdx = colorInfo.start; charIdx < colorInfo.end; charIdx++) {
					// 计算当前字符的4个顶点在dataList中的起始索引
					const vertexStartIdx = charIdx * 4; // 每个字符占4个顶点

					// 修改4个顶点的颜色
					for (let j = 0; j < 4; j++) {
						const vert = dataList[vertexStartIdx + j];
						if (vert) {
							vert.color = colors[j];
							ExtendColor._setVertexColorToVB(vData, vert, vertexStartIdx + j, stride, colorOffset, colors[j]); // 直接赋值Color对象
						}
					}
				}
			}
		} else if (cacheMode == CacheMode.NONE || cacheMode == CacheMode.BITMAP) {
			//TODO：CacheMode.NONE或CacheMode.BITMAP的情况下整个文本占用4个顶点
			// 预计算透明度系数（性能优化）
			const alphaMultiplier = labelOpacity / 255;

			// 每个字符占用4个顶点
			const vertsPerChar = 4;

			for (const colorInfo of colorArr) {
				if (colorInfo.start == null || colorInfo.end == null) continue;
				// 获取颜色配置（支持渐变色或固定色）
				const colors = typeof colorInfo.color === "string" ? GradientColorMap[colorInfo.color] : Array(4).fill(colorInfo.color);

				if (!colors) {
					console.error("颜色配置无效", colorInfo.color);
					continue;
				}

				// 处理每个字符的顶点
				for (let charIdx = colorInfo.start; charIdx < colorInfo.end; charIdx++) {
					const startVertIdx = charIdx * vertsPerChar;

					// 修改4个顶点的颜色数据
					for (let vertOffset = 0; vertOffset < vertsPerChar; vertOffset++) {
						const vert = dataList[startVertIdx + vertOffset];
						if (!vert) continue;

						// 创建或复用Color对象（内存优化）
						if (!vert.color) {
							vert.color = new Color();
						}

						const targetColor = colors[vertOffset % colors.length];
						vert.color.set(
							targetColor.r,
							targetColor.g,
							targetColor.b,
							targetColor.a * alphaMultiplier * 255 // 还原到0-255范围
						);
					}
				}
			}
		}
	}
}
