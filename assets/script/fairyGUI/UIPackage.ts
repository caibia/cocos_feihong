import { Asset, assetManager, AssetManager, AudioClip, BitmapFont, BufferAsset, CCClass, ccenum, CCObject, dragonBones, ImageAsset, LabelAtlas, path, Rect, resources, Size, sp, SpriteFrame, Texture2D, Vec2 } from "cc";
import PathUtils = path;
import { ObjectType, PackageItemType } from "./FieldTypes";
import { constructingDepth, GObject } from "./GObject";
import { PackageItem } from "./PackageItem";
import { TranslationHelper } from "./TranslationHelper";
import { ByteBuffer } from "./utils/ByteBuffer";
import { PixelHitTestData } from "./event/HitTest";
import { Frame } from "./display/MovieClip";

/**
 * 包依赖描述；记录当前包依赖的其他包的 `id` 与名称。
 */
type PackageDependency = { id: string, name: string };

/**
 * 包资源管理器，负责 FairyGUI 编辑器导出包的加载、索引、翻译与对象构建。
 */
export class UIPackage {
    /**
     * 包资源唯一标识。
     */
    private _id: string;
    /**
     * 包资源名称。
     */
    private _name: string;
    /**
     * 包资源路径。
     */
    private _path: string;
    /**
     * 包内资源项数组。
     */
    private _items: Array<PackageItem>;
    /**
     * 按 ID 建立的资源项映射表。
     */
    private _itemsById: { [index: string]: PackageItem };
    /**
     * 按名称建立的资源项映射表。
     */
    private _itemsByName: { [index: string]: PackageItem };
    /**
     * 图集子图描述映射表。
     */
    private _sprites: { [index: string]: AtlasSprite };
    /**
     * 当前包依赖的其他包列表。
     */
    private _dependencies: Array<PackageDependency>;
    /**
     * 包内可选分支名称列表。
     */
    private _branches: Array<string>;
    /**
     * 当前命中的分支索引。
     */
    public _branchIndex: number;
    /**
     * 当前包所属的资源包引用。
     */
    private _bundle: AssetManager.Bundle;
    /** 包内字符串表（会被翻译逻辑覆盖） */
    private _stringTable: Array<string>;
    /** 包内原始字符串快照（用于语言切换时还原） */
    private _originStringTable: Array<string>;

    /**
     * 初始化包资源索引表、依赖列表、分支信息和字符串表缓存。
     */
    public constructor() {
        this._items = [];
        this._itemsById = {};
        this._itemsByName = {};
        this._sprites = {};
        this._dependencies = [];
        this._branches = [];
        this._branchIndex = -1;
        this._stringTable = [];
        this._originStringTable = [];
    }

    /**
     * 获取当前全局资源分支名称。
     */
    public static get branch(): string | null {
        return _branch;
    }

    /**
     * 设置当前全局资源分支，并同步所有已加载包的分支索引。
     */
    public static set branch(value: string | null) {
        _branch = value;
        for (var pkgId in _instById) {
            var pkg: UIPackage = _instById[pkgId];
            if (pkg._branches) {
                pkg._branchIndex = pkg._branches.indexOf(value);
            }
        }
    }

    /**
     * 获取全局模板变量值。
     * @param key 变量名。
     * @returns 变量值；未命中时返回空值。
     */
    public static getVar(key: string): string | null {
        return _vars[key];
    }

    /**
     * 写入单个模板变量，便于后续统一刷新文本。
     * @param key 变量名。
     * @param value 变量值。
     */
    public static setVar(key: string, value: string | null) {
        _vars[key] = value;
    }

    /**
     * 根据包 ID 获取已加载包实例。
     * @param id 包 ID。
     * @returns 已加载包实例；未命中时返回空值。
     */
    public static getById(id: string): UIPackage {
        return _instById[id];
    }

    /**
     * 获取By Name。
     */
    public static getByName(name: string): UIPackage {
        return _instByName[name];
    }

    /**
     * 注册一个包。包的所有资源必须放在resources下，且已经预加载。
     * @param path 相对 resources 的路径。
     */
    public static addPackage(path: string): UIPackage {
        let pkg: UIPackage = _instById[path];
        if (pkg)
            return pkg;

        let asset = resources.get(path, BufferAsset);
        if (!asset)
            throw new Error("Resource '" + path + "' not ready");

        const buffer = asset.buffer();
        if (!buffer)
            throw new Error("Missing asset data.");

        pkg = new UIPackage();
        pkg._bundle = resources;
        pkg.loadPackage(new ByteBuffer(buffer), path);
        _instById[pkg.id] = pkg;
        _instByName[pkg.name] = pkg;
        _instById[pkg._path] = pkg;
        return pkg;
    }

    /**
     * 载入一个包。包的资源从Asset Bundle加载.
     * @param bundle Asset Bundle 对象.
     * @param path 资源相对 Asset Bundle 目录的路径.
     * @param onComplete 载入成功后的回调.
     */
    public static loadPackage(bundle: AssetManager.Bundle, path: string, onComplete?: (error: any, pkg: UIPackage) => void): void;
    /**
     * 载入一个包。包的资源从Asset Bundle加载.
     * @param bundle Asset Bundle 对象.
     * @param path 资源相对 Asset Bundle 目录的路径.
     * @param onProgress 加载进度回调.
     * @param onComplete 载入成功后的回调.
     */
    public static loadPackage(bundle: AssetManager.Bundle, path: string, onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void, onComplete?: (error: any, pkg: UIPackage) => void): void;
    /**
     * 载入一个包。包的资源从resources加载.
     * @param path 资源相对 resources 的路径.
     * @param onComplete 载入成功后的回调.
     */
    public static loadPackage(path: string, onComplete?: (error: any, pkg: UIPackage) => void): void;
    /**
     * 载入一个包。包的资源从resources加载.
     * @param path 资源相对 resources 的路径.
     * @param onProgress 加载进度回调.
     * @param onComplete 载入成功后的回调.
     */
    public static loadPackage(path: string, onProgress?: (finish: number, total: number, item: AssetManager.RequestItem) => void, onComplete?: (error: Error, pkg: UIPackage) => void): void;
    /**
     * 加载并解析 FairyGUI 包资源。
     */
    public static loadPackage(...args: any[]) {
        let path: string;
        let onProgress: (finish: number, total: number, item: AssetManager.RequestItem) => void;
        let onComplete: (error: Error, pkg: UIPackage) => void;
        let bundle: AssetManager.Bundle;
        if (args[0] instanceof AssetManager.Bundle) {
            bundle = args[0];
            path = args[1];
            if (args.length > 3) {
                onProgress = args[2];
                onComplete = args[3];
            }
            else
                onComplete = args[2];
        }
        else {
            path = args[0];
            if (args.length > 2) {
                onProgress = args[1];
                onComplete = args[2];
            }
            else
                onComplete = args[1];
        }

        bundle = bundle || resources;
        bundle.load(path, Asset, onProgress, (err: Error | null, asset: Asset) => {
            if (err) {
                if (onComplete != null)
                    onComplete(err, null);
                return;
            }

            let pkg: UIPackage = new UIPackage();
            pkg._bundle = bundle;
            let buffer: ArrayBuffer = (<any>asset).buffer ? (<any>asset).buffer() : (<any>asset)._nativeAsset;
            pkg.loadPackage(new ByteBuffer(buffer), path);
            let cnt: number = pkg._items.length;
            let urls: Array<string> = [];
            let types: Array<any> = [];
            for (var i: number = 0; i < cnt; i++) {
                var pi: PackageItem = pkg._items[i];
                if (pi.type == PackageItemType.Atlas || pi.type == PackageItemType.Sound) {
                    let assetType = ItemTypeToAssetType[pi.type];
                    urls.push(pi.file);
                    types.push(assetType);
                }
            }

            let total = urls.length;
            let lastErr: Error;
            let taskComplete = (err: Error | null, asset: Asset) => {
                total--;
                if (err)
                    lastErr = err;

                if (total <= 0) {
                    _instById[pkg.id] = pkg;
                    _instByName[pkg.name] = pkg;
                    if (pkg._path)
                        _instById[pkg._path] = pkg;

                    if (onComplete != null)
                        onComplete(lastErr, pkg);
                }
            }

            if (total > 0) {
                urls.forEach((url, index) => {
                    bundle.load(url, Asset, onProgress, taskComplete);
                });
            }
            else
                taskComplete(null, null);
        });
    }

    /**
     * 从全局包管理表中移除指定包实例。
     */
    public static removePackage(packageIdOrName: string): void {
        var pkg: UIPackage = _instById[packageIdOrName];
        if (!pkg)
            pkg = _instByName[packageIdOrName];
        if (!pkg)
            throw new Error("No package found: " + packageIdOrName);
        pkg.dispose();
        delete _instById[pkg.id];
        delete _instByName[pkg.name];
        if (pkg._path)
            delete _instById[pkg._path];
    }

    /**
     * 创建指定包资源对应的对象实例。
     */
    public static createObject(pkgName: string, resName: string, userClass?: new () => GObject): GObject {
        var pkg: UIPackage = UIPackage.getByName(pkgName);
        if (pkg)
            return pkg.createObject(resName, userClass);
        else
            return null;
    }

    /**
     * 根据 URL 创建对象实例。
     */
    public static createObjectFromURL(url: string, userClass?: new () => GObject): GObject {
        var pi: PackageItem = UIPackage.getItemByURL(url);
        if (pi)
            return pi.owner.internalCreateObject(pi, userClass);
        else
            return null;
    }

    /**
     * 获取Item URL。
     */
    public static getItemURL(pkgName: string, resName: string): string {
        var pkg: UIPackage = UIPackage.getByName(pkgName);
        if (!pkg)
            return null;

        var pi: PackageItem = pkg._itemsByName[resName];
        if (!pi)
            return null;

        return "ui://" + pkg.id + pi.id;
    }

    /**
     * 获取Item By URL。
     */
    public static getItemByURL(url: string): PackageItem {
        var pos1: number = url.indexOf("//");
        if (pos1 == -1)
            return null;

        var pos2: number = url.indexOf("/", pos1 + 2);
        if (pos2 == -1) {
            if (url.length > 13) {
                var pkgId: string = url.substring(5, 13);
                var pkg: UIPackage = UIPackage.getById(pkgId);
                if (pkg != null) {
                    var srcId: string = url.substring(13);
                    return pkg.getItemById(srcId);
                }
            }
        }
        else {
            var pkgName: string = url.substring(pos1 + 2, pos2);
            pkg = UIPackage.getByName(pkgName);
            if (pkg != null) {
                var srcName: string = url.substring(pos2 + 1);
                return pkg.getItemByName(srcName);
            }
        }

        return null;
    }

    /**
     * 规范化 FairyGUI 资源 URL，便于统一查询包资源。
     */
    public static normalizeURL(url: string): string {
        if (url == null)
            return null;

        var pos1: number = url.indexOf("//");
        if (pos1 == -1)
            return null;

        var pos2: number = url.indexOf("/", pos1 + 2);
        if (pos2 == -1)
            return url;

        var pkgName: string = url.substring(pos1 + 2, pos2);
        var srcName: string = url.substring(pos2 + 1);
        return UIPackage.getItemURL(pkgName, srcName);
    }

    /**
     * 设置多语言文本源（仅接收 XML 字符串）
     * @param source XML字符串
     */
    public static setStringsSource(source: string): void {
        const input = source ? source.trim() : "";
        if (!input) {
            TranslationHelper.clear();
            return;
        }
        TranslationHelper.loadFromXML(input);
    }

    /** 清空翻译源，后续构建将使用包内默认文案 */
    public static clearStringsSource(): void {
        TranslationHelper.clear();
    }

    /** 为语言切换做准备：恢复字符串表并重置组件翻译状态 */
    public static prepareForLanguageSwitch(): void {
        const pkgArr = UIPackage.getAllPackages();
        for (let i = 0; i < pkgArr.length; i++) {
            const pkg = pkgArr[i];
            pkg.restoreStringTable();
            pkg.resetComponentDecodeState();
        }
    }

    /** 获取当前所有已加载包（去重后） */
    private static getAllPackages(): UIPackage[] {
        const result: UIPackage[] = [];
        const visited = new Set<UIPackage>();
        for (const key in _instById) {
            const pkg = _instById[key];
            if (!pkg || visited.has(pkg)) {
                continue;
            }
            visited.add(pkg);
            result.push(pkg);
        }
        return result;
    }

    /**
     * 加载并解析 FairyGUI 包资源。
     */
    private loadPackage(buffer: ByteBuffer, path: string): void {
        if (buffer.readUint() != 0x46475549)
            throw new Error("FairyGUI: old package format found in '" + path + "'");

        this._path = path;
        buffer.version = buffer.readInt();
        var ver2: boolean = buffer.version >= 2;
        var compressed: boolean = buffer.readBool();
        this._id = buffer.readString();
        this._name = buffer.readString();
        buffer.skip(20);

        var indexTablePos: number = buffer.position;
        var cnt: number;
        var i: number;
        var nextPos: number;
        var str: string;
        var branchIncluded: boolean;

        buffer.seek(indexTablePos, 4);

        cnt = buffer.readInt();
        var stringTable: Array<string> = new Array<string>(cnt);
        buffer.stringTable = stringTable;

        for (i = 0; i < cnt; i++)
            stringTable[i] = buffer.readString();

        if (buffer.seek(indexTablePos, 5)) {
            cnt = buffer.readInt();
            for (i = 0; i < cnt; i++) {
                let index = buffer.readUshort();
                let len = buffer.readInt();
                stringTable[index] = buffer.readString(len);
            }
        }
        this._stringTable = stringTable;
        this._originStringTable = stringTable.slice();

        buffer.seek(indexTablePos, 0);
        cnt = buffer.readShort();
        for (i = 0; i < cnt; i++)
            this._dependencies.push({ id: buffer.readS(), name: buffer.readS() });

        if (ver2) {
            cnt = buffer.readShort();
            if (cnt > 0) {
                this._branches = buffer.readSArray(cnt);
                if (_branch)
                    this._branchIndex = this._branches.indexOf(_branch);
            }

            branchIncluded = cnt > 0;
        }

        buffer.seek(indexTablePos, 1);

        var pi: PackageItem;
        let pos = path.lastIndexOf('/');
        let shortPath = pos == -1 ? "" : path.substring(0, pos + 1);
        path = path + "_";

        cnt = buffer.readShort();
        for (i = 0; i < cnt; i++) {
            nextPos = buffer.readInt();
            nextPos += buffer.position;

            pi = new PackageItem();
            pi.owner = this;
            pi.type = buffer.readByte();
            pi.id = buffer.readS();
            pi.name = buffer.readS();
            buffer.readS(); //path
            pi.file = buffer.readS();
            buffer.readBool();//exported
            pi.width = buffer.readInt();
            pi.height = buffer.readInt();

            switch (pi.type) {
                case PackageItemType.Image:
                    {
                        pi.objectType = ObjectType.Image;
                        var scaleOption: number = buffer.readByte();
                        if (scaleOption == 1) {
                            pi.scale9Grid = new Rect();
                            pi.scale9Grid.x = buffer.readInt();
                            pi.scale9Grid.y = buffer.readInt();
                            pi.scale9Grid.width = buffer.readInt();
                            pi.scale9Grid.height = buffer.readInt();

                            pi.tileGridIndice = buffer.readInt();
                        }
                        else if (scaleOption == 2)
                            pi.scaleByTile = true;

                        pi.smoothing = buffer.readBool();
                        break;
                    }

                case PackageItemType.MovieClip:
                    {
                        pi.smoothing = buffer.readBool();
                        pi.objectType = ObjectType.MovieClip;
                        pi.rawData = buffer.readBuffer();
                        break;
                    }

                case PackageItemType.Font:
                    {
                        pi.rawData = buffer.readBuffer();
                        break;
                    }

                case PackageItemType.Component:
                    {
                        var extension: number = buffer.readByte();
                        if (extension > 0)
                            pi.objectType = extension;
                        else
                            pi.objectType = ObjectType.Component;
                        pi.rawData = buffer.readBuffer();

                        Decls.UIObjectFactory.resolveExtension(pi);
                        break;
                    }

                case PackageItemType.Atlas:
                case PackageItemType.Sound:
                case PackageItemType.Misc:
                    {
                        pi.file = path + PathUtils.mainFileName(pi.file);
                        break;
                    }

                case PackageItemType.Spine:
                case PackageItemType.DragonBones:
                    {
                        pi.file = shortPath + PathUtils.mainFileName(pi.file);
                        pi.skeletonAnchor = new Vec2();
                        pi.skeletonAnchor.x = buffer.readFloat();
                        pi.skeletonAnchor.y = buffer.readFloat();
                        break;
                    }
            }

            if (ver2) {
                str = buffer.readS();//branch
                if (str)
                    pi.name = str + "/" + pi.name;

                var branchCnt: number = buffer.readByte();
                if (branchCnt > 0) {
                    if (branchIncluded)
                        pi.branches = buffer.readSArray(branchCnt);
                    else
                        this._itemsById[buffer.readS()] = pi;
                }

                var highResCnt: number = buffer.readByte();
                if (highResCnt > 0)
                    pi.highResolution = buffer.readSArray(highResCnt);
            }

            this._items.push(pi);
            this._itemsById[pi.id] = pi;
            if (pi.name != null)
                this._itemsByName[pi.name] = pi;

            buffer.position = nextPos;
        }

        buffer.seek(indexTablePos, 2);

        cnt = buffer.readShort();
        for (i = 0; i < cnt; i++) {
            nextPos = buffer.readShort();
            nextPos += buffer.position;

            var itemId: string = buffer.readS();
            pi = this._itemsById[buffer.readS()];

            let rect: Rect = new Rect();
            rect.x = buffer.readInt();
            rect.y = buffer.readInt();
            rect.width = buffer.readInt();
            rect.height = buffer.readInt();
            var sprite: AtlasSprite = { atlas: pi, rect: rect, offset: new Vec2(), originalSize: new Size(0, 0) };
            sprite.rotated = buffer.readBool();
            if (ver2 && buffer.readBool()) {
                sprite.offset.x = buffer.readInt();
                sprite.offset.y = buffer.readInt();
                sprite.originalSize.width = buffer.readInt();
                sprite.originalSize.height = buffer.readInt();
            }
            else {
                sprite.originalSize.width = sprite.rect.width;
                sprite.originalSize.height = sprite.rect.height;
            }
            this._sprites[itemId] = sprite;

            buffer.position = nextPos;
        }

        if (buffer.seek(indexTablePos, 3)) {
            cnt = buffer.readShort();
            for (i = 0; i < cnt; i++) {
                nextPos = buffer.readInt();
                nextPos += buffer.position;

                pi = this._itemsById[buffer.readS()];
                if (pi && pi.type == PackageItemType.Image)
                    pi.hitTestData = new PixelHitTestData(buffer);

                buffer.position = nextPos;
            }
        }
    }

    /** 还原到包内默认字符串表 */
    private restoreStringTable(): void {
        if (!this._stringTable || !this._originStringTable) {
            return;
        }
        const len = this._originStringTable.length;
        this._stringTable.length = len;
        for (let i = 0; i < len; i++) {
            this._stringTable[i] = this._originStringTable[i];
        }
    }

    /** 重置组件解析标记，确保下次构建会重新套用翻译 */
    private resetComponentDecodeState(): void {
        const cnt = this._items.length;
        for (let i = 0; i < cnt; i++) {
            const pi = this._items[i];
            if (pi.type == PackageItemType.Component) {
                pi.decoded = false;
            }
        }
    }

    /**
     * 释放当前包持有的资源索引、已加载资源引用与语言相关缓存。
     */
    public dispose(): void {
        var cnt: number = this._items.length;
        for (var i: number = 0; i < cnt; i++) {
            var pi: PackageItem = this._items[i];
            if (pi.asset)
                assetManager.releaseAsset(pi.asset);
        }
    }

    /**
     * 获取当前对象的唯一标识。
     */
    public get id(): string {
        return this._id;
    }

    /**
     * 获取当前对象名称。
     */
    public get name(): string {
        return this._name;
    }

    /**
     * 获取当前包资源路径。
     */
    public get path(): string {
        return this._path;
    }

    /**
     * 获取当前包依赖列表。
     */
    public get dependencies(): Array<PackageDependency> {
        return this._dependencies;
    }

    /**
     * 创建指定包资源对应的对象实例。
     */
    public createObject(resName: string, userClass?: new () => GObject): GObject {
        var pi: PackageItem = this._itemsByName[resName];
        if (pi)
            return this.internalCreateObject(pi, userClass);
        else
            return null;
    }

    /**
     * 执行内部对象构建流程。
     */
    public internalCreateObject(item: PackageItem, userClass?: new () => GObject): GObject {
        var g: GObject = Decls.UIObjectFactory.newObject(item, userClass);

        if (g == null)
            return null;

        constructingDepth.n++;
        g.constructFromResource();
        constructingDepth.n--;
        return g;
    }

    /**
     * 获取Item By Id。
     */
    public getItemById(itemId: string): PackageItem {
        return this._itemsById[itemId];
    }

    /**
     * 获取Item By Name。
     */
    public getItemByName(resName: string): PackageItem {
        return this._itemsByName[resName];
    }

    /**
     * 获取Item Asset By Name。
     */
    public getItemAssetByName(resName: string): Asset {
        var pi: PackageItem = this._itemsByName[resName];
        if (pi == null) {
            throw new Error("Resource not found -" + resName);
        }

        return this.getItemAsset(pi);
    }

    /**
     * 获取Item Asset。
     */
    public getItemAsset(item: PackageItem): Asset {
        switch (item.type) {
            case PackageItemType.Image:
                if (!item.decoded) {
                    item.decoded = true;
                    var sprite: AtlasSprite = this._sprites[item.id];
                    if (sprite) {
                        let atlasTexture: Texture2D = <Texture2D>this.getItemAsset(sprite.atlas);
                        if (atlasTexture) {
                            let sf = new SpriteFrame();
                            sf.texture = atlasTexture;
                            sf.rect = sprite.rect;
                            sf.rotated = sprite.rotated;
                            sf.offset = new Vec2(sprite.offset.x - (sprite.originalSize.width - sprite.rect.width) / 2, -(sprite.offset.y - (sprite.originalSize.height - sprite.rect.height) / 2));
                            sf.originalSize = sprite.originalSize;

                            if (item.scale9Grid) {
                                sf.insetLeft = item.scale9Grid.x;
                                sf.insetTop = item.scale9Grid.y;
                                sf.insetRight = item.width - item.scale9Grid.xMax;
                                sf.insetBottom = item.height - item.scale9Grid.yMax;
                            }
                            item.asset = sf;
                        }
                    }
                }
                break;

            case PackageItemType.Atlas:
            case PackageItemType.Sound:
                if (!item.decoded) {
                    item.decoded = true;
                    item.asset = this._bundle.get<Asset>(item.file, ItemTypeToAssetType[item.type]);
                    if (!item.asset)
                        console.log("Resource '" + item.file + "' not found");
                    else if (item.type == PackageItemType.Atlas) {
                        const asset: any = item.asset;
                        let tex: Texture2D = asset['_texture'];
                        if (!tex) {
                            tex = new Texture2D();
                            tex.name = asset.nativeUrl;
                            tex.image = asset;
                        }
                        item.asset = tex;
                    }
                    else {
                        item.asset = (<AudioClip>item.asset);
                    }
                }
                break;

            case PackageItemType.Font:
                if (!item.decoded) {
                    item.decoded = true;
                    this.loadFont(item);
                }
                break;

            case PackageItemType.MovieClip:
                if (!item.decoded) {
                    item.decoded = true;
                    this.loadMovieClip(item);
                }
                break;

            default:
                break;
        }

        return item.asset;
    }

    /**
     * 获取Item Asset Async。
     */
    public getItemAssetAsync(item: PackageItem, onComplete?: (err: Error, item: PackageItem) => void): void {
        if (item.decoded) {
            onComplete(null, item);
            return;
        }

        if (item.loading) {
            item.loading.push(onComplete);
            return;
        }

        switch (item.type) {
            case PackageItemType.Spine:
                item.loading = [onComplete];
                this.loadSpine(item);
                break;

            case PackageItemType.DragonBones:
                item.loading = [onComplete];
                this.loadDragonBones(item);
                break;

            default:
                this.getItemAsset(item);
                onComplete(null, item);
                break;
        }
    }

    /**
     * 执行`AllAssets`相关的加载逻辑。
     */
    public loadAllAssets(): void {
        var cnt: number = this._items.length;
        for (var i: number = 0; i < cnt; i++) {
            var pi: PackageItem = this._items[i];
            this.getItemAsset(pi);
        }
    }

    /**
     * 执行`MovieClip`相关的加载逻辑。
     */
    private loadMovieClip(item: PackageItem): void {
        var buffer: ByteBuffer = item.rawData;

        buffer.seek(0, 0);

        item.interval = buffer.readInt() / 1000;
        item.swing = buffer.readBool();
        item.repeatDelay = buffer.readInt() / 1000;

        buffer.seek(0, 1);

        var frameCount: number = buffer.readShort();
        item.frames = Array<Frame>(frameCount);

        var spriteId: string;
        var sprite: AtlasSprite;

        for (var i: number = 0; i < frameCount; i++) {
            var nextPos: number = buffer.readShort();
            nextPos += buffer.position;

            let rect: Rect = new Rect();
            rect.x = buffer.readInt();
            rect.y = buffer.readInt();
            rect.width = buffer.readInt();
            rect.height = buffer.readInt();
            let addDelay = buffer.readInt() / 1000;
            let frame: Frame = { rect: rect, addDelay: addDelay, texture: null };
            spriteId = buffer.readS();

            if (spriteId != null && (sprite = this._sprites[spriteId]) != null) {
                let atlasTexture: Texture2D = <Texture2D>this.getItemAsset(sprite.atlas);
                if (atlasTexture) {
                    let sx: number = item.width / frame.rect.width;
                    let sf = new SpriteFrame();

                    sf.texture = atlasTexture;
                    sf.rect = sprite.rect;
                    sf.rotated = sprite.rotated;
                    sf.offset = new Vec2(frame.rect.x - (item.width - frame.rect.width) / 2, -(frame.rect.y - (item.height - frame.rect.height) / 2))
                    sf.originalSize = new Size(item.width, item.height);
                    frame.texture = sf;
                }
            }
            item.frames[i] = frame;

            buffer.position = nextPos;
        }
    }

    /**
     * 执行字体相关的加载逻辑。
     */
    private loadFont(item: PackageItem): void {
        var font: BitmapFont = new BitmapFont();
        item.asset = font;

        font.fntConfig = {
            commonHeight: 0,
            fontSize: 0,
            kerningDict: {},
            fontDefDictionary: {}
        };
        let dict = font.fntConfig.fontDefDictionary;

        var buffer: ByteBuffer = item.rawData;

        buffer.seek(0, 0);

        let ttf = buffer.readBool();
        let canTint = buffer.readBool();
        let resizable = buffer.readBool();
        buffer.readBool(); //has channel
        let fontSize = buffer.readInt();
        var xadvance: number = buffer.readInt();
        var lineHeight: number = buffer.readInt();

        let mainTexture: Texture2D;
        var mainSprite: AtlasSprite = this._sprites[item.id];
        if (mainSprite)
            mainTexture = <Texture2D>(this.getItemAsset(mainSprite.atlas));

        buffer.seek(0, 1);

        var bg: any;
        var cnt: number = buffer.readInt();
        for (var i: number = 0; i < cnt; i++) {
            var nextPos: number = buffer.readShort();
            nextPos += buffer.position;

            bg = {};
            var ch: number = buffer.readUshort();
            dict[ch] = bg;

            let rect: Rect = new Rect();
            bg.rect = rect;

            var img: string = buffer.readS();
            rect.x = buffer.readInt();
            rect.y = buffer.readInt();
            bg.xOffset = buffer.readInt();
            bg.yOffset = buffer.readInt();
            rect.width = buffer.readInt();
            rect.height = buffer.readInt();
            bg.xAdvance = buffer.readInt();
            bg.channel = buffer.readByte();
            if (bg.channel == 1)
                bg.channel = 3;
            else if (bg.channel == 2)
                bg.channel = 2;
            else if (bg.channel == 3)
                bg.channel = 1;

            if (ttf) {
                rect.x += mainSprite.rect.x;
                rect.y += mainSprite.rect.y;
            }
            else {
                let sprite: AtlasSprite = this._sprites[img];
                if (sprite) {
                    rect.set(sprite.rect);
                    bg.xOffset += sprite.offset.x;
                    bg.yOffset += sprite.offset.y;
                    if (fontSize == 0)
                        fontSize = sprite.originalSize.height;
                    if (!mainTexture) {
                        sprite.atlas.load();
                        mainTexture = <Texture2D>sprite.atlas.asset;
                    }
                }

                if (bg.xAdvance == 0) {
                    if (xadvance == 0)
                        bg.xAdvance = bg.xOffset + bg.rect.width;
                    else
                        bg.xAdvance = xadvance;
                }
            }

            buffer.position = nextPos;
        }


        font.fontSize = fontSize;
        font.fntConfig.fontSize = fontSize;
        font.fntConfig.commonHeight = lineHeight == 0 ? fontSize : lineHeight;
        font.fntConfig.resizable = resizable;
        font.fntConfig.canTint = canTint;

        let spriteFrame = new SpriteFrame();
        spriteFrame.texture = mainTexture;
        font.spriteFrame = spriteFrame;
        font.onLoaded();
    }

    /**
     * 执行`Spine`相关的加载逻辑。
     */
    private loadSpine(item: PackageItem): void {
        this._bundle.load(item.file, sp.SkeletonData, (err: Error | null, asset: sp.SkeletonData) => {
            item.decoded = true;
            item.asset = asset;
            let arr = item.loading;
            delete item.loading;
            arr.forEach(e => e(err, item));
        });
    }

    /**
     * 执行`DragonBones`相关的加载逻辑。
     */
    private loadDragonBones(item: PackageItem): void {
        this._bundle.load(item.file, dragonBones.DragonBonesAsset, (err: Error | null, asset: dragonBones.DragonBonesAsset) => {
            if (err) {
                item.decoded = true;
                let arr = item.loading;
                delete item.loading;
                arr.forEach(e => e(err, item));
                return;
            }

            item.asset = asset;
            let atlasFile = item.file.replace("_ske", "_tex");
            let pos = atlasFile.lastIndexOf('.');
            if (pos != -1)
                atlasFile = atlasFile.substring(0, pos + 1) + "json";
            this._bundle.load(atlasFile, dragonBones.DragonBonesAtlasAsset, (err: Error | null, asset: dragonBones.DragonBonesAtlasAsset) => {
                item.decoded = true;
                item.atlasAsset = asset;

                let arr = item.loading;
                delete item.loading;
                arr.forEach(e => e(err, item));
            });
        });
    }
}

interface AtlasSprite {
    /**
     * 所属图集资源项。
     */
    atlas: PackageItem;
    /**
     * 区域矩形数据。
     */
    rect: Rect;
    /**
     * 偏移量。
     */
    offset: Vec2;
    /**
     * 原始尺寸。
     */
    originalSize: Size;
    /**
     * 是否经过旋转打包。
     */
    rotated?: boolean;
}

const ItemTypeToAssetType = {
    [PackageItemType.Atlas]: ImageAsset,
    [PackageItemType.Sound]: AudioClip
};

var _instById: { [index: string]: UIPackage } = {};
var _instByName: { [index: string]: UIPackage } = {};
var _branch: string = "";
var _vars: { [index: string]: string } = {};

/**
 * IObjectFactoryType 接口，约束当前模块对象的结构与能力边界。
 */
export interface IObjectFactoryType {
    resolveExtension(pi: PackageItem): void;
    newObject(type: number | PackageItem, userClass?: new () => GObject): GObject;
}

export var Decls: { UIObjectFactory?: IObjectFactoryType } = {};
