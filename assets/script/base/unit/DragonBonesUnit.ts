/**
*Author  : XW
*Desc    : 
*/

import { GComponent } from "../../fairyGUI/GComponent";
import { GLoader3D } from "../../fairyGUI/GLoader3D";
import { DragonBonesMgr } from "../manager/DragonBonesMgr";


export class DragonBonesUnit {
	/** 是否在clearByCache时不要清理spine */
	public clearDisable: boolean = true;
	public isPause: boolean;
	private _allLoader3D: { [uuid: string]: GLoader3D };
	private _isDestroyed: boolean;

	constructor() {
		this._allLoader3D = {};
	}

	/**
	 * 播放spine动画
	 * @param url 举例："spine/login/login"
	 * @param parent 父节点
	 * @param x 坐标x
	 * @param y 坐标y
	 * @param loader3D 使用开发者自己的模块中的loader3D，从而使得loader3D可以复用，并且可以在fgui中摆放位置。(loader3D如果已经有parent，则parent可以传null)
	 * @param animation 动画名，默认为"animation"
	 * @param loop 是否循环播放
	 * @param complete loader3d创建完成回调
	 */
	public async play(url: string, parent: GComponent, x?: number, y?: number, loader3D?: GLoader3D, animation: string = "animation", loop: boolean = true, complete?: (l3d: GLoader3D) => void): Promise<GLoader3D> {
		if (!loader3D) {
			loader3D = new GLoader3D();
			loader3D.name = "loader3D";
			loader3D.spineUnitCreated = true;
		}
		if (loader3D.dragonBonesUrl) {
			this.stopAndRelease(loader3D);
		}
		loader3D.dragonBonesUrl = url;
		//这里每次都要调用，确保引用计数加1
		let sk = await DragonBonesMgr.inst.loadDragonBones(url);
		//异步需要判断下是不是当前url加载完成
		if (loader3D.dragonBonesUrl != url) { return; }
		if (this._isDestroyed) return;
		// 加载资源过程中 外部已调用删除操作
		if (!loader3D.node) { return; }
		if (!loader3D.parent) {
			parent.addChild(loader3D);
		}
		this._allLoader3D[loader3D.node.uuid] = loader3D;
		//这里只是先设置一个保底值避免不能显示，最终size会根据spine文件自动设置
		loader3D.setSize(50, 50);
		loader3D.animationName = animation;
		loader3D.autoSize = true;
		loader3D.loop = loop;
		loader3D.touchable = false;
		loader3D.url = url;
		loader3D.playing = true;
		if (x && y) loader3D.setPosition(x, y);
		complete && complete(loader3D);
		return loader3D;
	}

	/** 停止spine播放，并且把url设置为""空串 */
	public stopAndRelease(loader3D: GLoader3D) {
		if (!loader3D) return;
		if (loader3D.dragonBonesUrl) {
			DragonBonesMgr.inst.releaseDragonBones(loader3D.dragonBonesUrl);
			loader3D.dragonBonesUrl = undefined;
		}
		loader3D.url = "";
	}
	/**暂停 */
	public pause() {
		if (!this.isPause) {
			this.isPause = true;
			let loader3D: GLoader3D;
			for (let uuid in this._allLoader3D) {
				loader3D = this._allLoader3D[uuid];
				loader3D.playing = false;
			}
		}
	}

	public resume() {
		if (this.isPause) {
			this.isPause = false;
			let loader3D: GLoader3D;
			for (let uuid in this._allLoader3D) {
				loader3D = this._allLoader3D[uuid];
				if (loader3D._content) {
					loader3D.playing = true;
				}
			}
		}
	}

	public clearByCache() {
		if (this.clearDisable) return;
		let loader3D: GLoader3D;
		for (let uuid in this._allLoader3D) {
			loader3D = this._allLoader3D[uuid];
			this.stopAndRelease(loader3D);
		}
	}

	/** 删除全部 GLoader3D【删除界面时自动删除，无需手动删除】*/
	public dispose() {
		if (this._isDestroyed) return;
		this._isDestroyed = true;
		let loader3D: GLoader3D;
		for (let uuid in this._allLoader3D) {
			loader3D = this._allLoader3D[uuid];
			this.disposeOne(loader3D, uuid);
		}
		this._allLoader3D = undefined;
	}

	/** 单个删除 GLoader3D【中途确定不需要时，手动删除】*/
	public disposeOne(loader3D: GLoader3D, uuid?: string) {
		if (!uuid) {
			uuid = loader3D && loader3D.node && loader3D.node.uuid;
			if (!uuid) { return; }
		}
		this.stopAndRelease(loader3D);
		if (loader3D.spineUnitCreated) {
			loader3D.dispose();
		}
		if (this._allLoader3D) {
			delete this._allLoader3D[uuid]
		}
	}

}