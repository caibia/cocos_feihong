/**
*Author  : XW
*Desc    : 
*/

import { Material, UIRenderer, Sprite, UITransform, Vec2, resources, v2, assetManager, EffectAsset, sp } from "cc";
import XDEBUGLOG, { DEBUG_LOG } from "../debug/XDEBUGLOG";


export enum MATERIAL_TYPE {
	/**圆角头像 */
	ROUND_HEAD = "shaders/AvatarClipping",
	/**模糊 */
	BLUR = "shaders/blur",
	/**描边 */
	SPRITE_OUTLINE = "shaders/sprite-outline",
	/**描边 */
	SPINE_OUTLINE = "shaders/spine-outline",
	/**置灰 */
	SPINE_GRAY = "shaders/builtin-spine-gray",
	/**置灰 */
	SPRITE_GRAY = "shaders/sprite-gray",
	/**扫光 */
	SWEEP_LIGHT = "shaders/sweeplight",
	/**水波纹 */
	WATER = "shaders/water",
}

type MaterialsMap = {
	[key: string]: Material;
}


export default class MaterialMgr {
	private materialsMap: MaterialsMap;

	/**
	 * 设置材质
	 * @param rc UIRenderer
	 * @param type 类型
	 * @param properties 参数
	 * 例如：
	 * 1.置灰：MaterialMgr.inst.setToMaterial(this.loaderBg._content, MATERIAL_TYPE.SPRITE_GRAY);
	 * 2.模糊：MaterialMgr.inst.setToMaterial(this.loaderBg._content, MATERIAL_TYPE.BLUR,{ blurThreshold: 0.25 });
	 * 3.扫光：MaterialMgr.inst.setToMaterial(this.loaderBg._content, MATERIAL_TYPE.SWEEP_LIGHT,{ width: 0.05, strength: 1.8 , speed: 0.5});
	 * 4.描边(及到uv不能使用合图)：MaterialMgr.inst.setToMaterial(this.loaderHead._content, MATERIAL_TYPE.OUTLINE, { outlineWidth: 0.004, outlineColor: new Vec4(1, 0, 0, 1) });
	 * 5.圆头像(及到uv不能使用合图)：MaterialMgr.inst.setToMaterial(this.loaderHead._content, MATERIAL_TYPE.ROUND_HEAD, { isGray: 0.0, center: new Vec2(0.5, 0.5), radius: 0.5, blur: 0.15, wh_ratio: 1 });
	 */
	public setToMaterial(rc: UIRenderer, type: MATERIAL_TYPE, properties?: { [key: string]: any }) {
		let material: Material;
		if (rc["$_materialType"] == type) {
			material = rc.getSharedMaterial(0);
		} else {
			material = this.getMaterial(type);
			if (!material) {
				XDEBUGLOG.material("材质不存在", type);
				return;
			}
			rc["$_lastMaterial"] = rc.getSharedMaterial(0);
			rc.setSharedMaterial(material, 0);
			rc["$_materialType"] = type;
		}
		if (properties) {
			for (const key in properties) {
				let value = properties[key];
				material.setProperty(key, value);
			}
		}

		if (rc instanceof sp.Skeleton) {
			rc.customMaterial = material;
		}
		return material;
	}
	/**
	 * 重置材质 MaterialMgr.inst.resetToLastMaterial(this.loaderBg._content);
	 * @param rc UIRenderer
	 */
	resetToLastMaterial(rc: UIRenderer) {
		let mat: Material = rc["$_lastMaterial"];
		if (mat) {
			delete rc["$_lastMaterial"];
			rc.setSharedMaterial(mat, 0);

			if (rc instanceof sp.Skeleton) {
				rc.customMaterial = mat;
			}
		}
		delete rc["$_materialType"];
	}

	public getMaterial(type: MATERIAL_TYPE) {
		let material = this.materialsMap[type];
		if (!material) {
			let path = type;
			material = resources.get(path, Material);
			if (!material) {
				XDEBUGLOG.material("不存在该material", type, path);
			}
			this.materialsMap[type] = material;
		}
		return material;
	}

	/**预先加载材质 */
	public async preload() {
		this.materialsMap = {};
		let preloadMaterials = [];
		for (let key in MATERIAL_TYPE) {
			preloadMaterials.push(MATERIAL_TYPE[key]);
		}
		return new Promise<void>((resolve, reject) => {
			resources.load(preloadMaterials, Material, (error, assets) => {
				if (error) {
					XDEBUGLOG.error(error);
					reject();
					return;
				}
				XDEBUGLOG.material(`加载material 加载完成！`, preloadMaterials);
				resolve();
			});
		});
	}

	private static _inst: MaterialMgr;
	public static get inst() {
		if (!MaterialMgr._inst) {
			MaterialMgr._inst = new MaterialMgr;
		}
		return MaterialMgr._inst;
	}


}


window["MaterialMgr"] = MaterialMgr;
