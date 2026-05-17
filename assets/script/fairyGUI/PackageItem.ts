import { Asset, dragonBones, Rect, Vec2 } from "cc";
import { Frame } from "./display/MovieClip";
import { PixelHitTestData } from "./event/HitTest";
import { PackageItemType, ObjectType } from "./FieldTypes";
import { UIContentScaler } from "./UIContentScaler";
import { UIPackage } from "./UIPackage";
import { ByteBuffer } from "./utils/ByteBuffer";

/**
 * 包资源项描述对象，记录编辑器导出资源的类型、尺寸与依赖信息。
 */
export class PackageItem {
    /**
     * 所属宿主组件。
     */
    public owner: UIPackage;

    /**
     * 类型。
     */
    public type: PackageItemType;
    /**
     * 对象类型。
     */
    public objectType?: ObjectType;
    /**
     * 资源标识。
     */
    public id: string;
    /**
     * 资源名称。
     */
    public name: string;
    /**
     * 宽度。
     */
    public width: number = 0;
    /**
     * 高度。
     */
    public height: number = 0;
    /**
     * 原始资源文件路径或文件名。
     */
    public file: string;
    /**
     * 当前资源是否已经完成解码。
     */
    public decoded?: boolean;
    /**
     * 等待当前资源加载完成后执行的回调列表。
     */
    public loading?: Array<Function>;
    /**
     * 原始序列化配置数据。
     */
    public rawData?: ByteBuffer;
    /**
     * 已加载完成的主资源对象。
     */
    public asset?: Asset;

    /**
     * 高分辨率替代资源列表。
     */
    public highResolution?: Array<string>;
    /**
     * 分支资源列表。
     */
    public branches?: Array<string>;

    //image
    /**
     * 九宫格缩放区域。
     */
    public scale9Grid?: Rect;
    /**
     * 是否按平铺方式缩放。
     */
    public scaleByTile?: boolean;
    /**
     * 九宫格切片索引数据。
     */
    public tileGridIndice?: number;
    /**
     * 当前纹理是否启用平滑采样。
     */
    public smoothing?: boolean;
    /**
     * 像素级命中测试数据。
     */
    public hitTestData?: PixelHitTestData;

    //movieclip
    /**
     * 序列帧基础播放间隔。
     */
    public interval?: number;
    /**
     * 序列帧循环之间的附加延迟。
     */
    public repeatDelay?: number;
    /**
     * 序列帧是否启用往返摆动播放。
     */
    public swing?: boolean;
    /**
     * 序列帧数组。
     */
    public frames?: Array<Frame>;

    //componenet
    /**
     * 组件扩展类类型。
     */
    public extensionType?: any;

    //skeleton
    /**
     * 骨骼资源的锚点偏移。
     */
    public skeletonAnchor?: Vec2;
    /**
     * 骨骼资源使用的图集资源对象。
     */
    public atlasAsset?: dragonBones.DragonBonesAtlasAsset;

    /**
     * 初始化包资源项的基础描述字段。
     */
    public constructor() {
    }

    /**
     * 按资源项类型加载当前包资源的实际内容。
     * @returns 当前资源项对应的主资源对象。
     */
    public load(): Asset {
        return this.owner.getItemAsset(this);
    }

    /**
     * 获取当前分支配置下实际应使用的资源项。
     * @returns 分支命中后的资源项；未命中时返回自身。
     */
    public getBranch(): PackageItem {
        if (this.branches && this.owner._branchIndex != -1) {
            var itemId: string = this.branches[this.owner._branchIndex];
            if (itemId)
                return this.owner.getItemById(itemId);
        }

        return this;
    }

    /**
     * 获取当前分辨率等级下实际应使用的高分资源项。
     * @returns 高分资源项；未命中时返回自身。
     */
    public getHighResolution(): PackageItem {
        if (this.highResolution && UIContentScaler.scaleLevel > 0) {
            var itemId: string = this.highResolution[UIContentScaler.scaleLevel - 1];
            if (itemId)
                return this.owner.getItemById(itemId);
        }

        return this;
    }

    /**
     * 返回资源项名称，便于调试输出。
     */
    public toString(): string {
        return this.name;
    }
}
