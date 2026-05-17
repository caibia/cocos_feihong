import FairyEditor = CS.FairyEditor;
import CodeWriter from './CodeWriter';

// 导入表：key=导入路径，value=该路径下需要导入的类型集合（去重）
type ImportTable = { [path: string]: Set<string> };

// FairyGUI 内置类型 -> 对应导入路径（基于目标输出目录 assets/script/app/module/.../Interfaces）
const BUILTIN_TYPE_IMPORTS: { [typeName: string]: string } = {
    Controller: '../../../../fairyGUI/Controller',
    GButton: '../../../../fairyGUI/GButton',
    GComboBox: '../../../../fairyGUI/GComboBox',
    GComponent: '../../../../fairyGUI/GComponent',
    GGraph: '../../../../fairyGUI/GGraph',
    GGroup: '../../../../fairyGUI/GGroup',
    GImage: '../../../../fairyGUI/GImage',
    GLabel: '../../../../fairyGUI/GLabel',
    GList: '../../../../fairyGUI/GList',
    GLoader: '../../../../fairyGUI/GLoader',
    GLoader3D: '../../../../fairyGUI/GLoader3D',
    GMovieClip: '../../../../fairyGUI/GMovieClip',
    GObject: '../../../../fairyGUI/GObject',
    GProgressBar: '../../../../fairyGUI/GProgressBar',
    GRichTextField: '../../../../fairyGUI/GRichTextField',
    GSlider: '../../../../fairyGUI/GSlider',
    GTextField: '../../../../fairyGUI/GTextField',
    GTextInput: '../../../../fairyGUI/GTextInput',
    GTree: '../../../../fairyGUI/GTree',
    Transition: '../../../../fairyGUI/Transition'
};

// 统一路径分隔符并转小写，避免 Windows/大小写差异导致的目录匹配问题
function normalizePath(path: string | null | undefined): string {
    if (!path)
        return '';
    return path.replace(/\\/g, '/').toLowerCase();
}

// 仅允许 view/widget 目录下的组件参与代码生成
function hasPathSegment(classInfo: FairyEditor.PublishHandler.ClassInfo, segment: string): boolean {
    const folderPath = normalizePath(classInfo.res?.path);
    if (!folderPath)
        return false;
    const segments = folderPath.split('/').filter(s => s.length > 0);
    return segments.indexOf(segment) >= 0;
}

// 仅允许 view/widget 目录下的组件参与代码生成
function isViewOrWidget(classInfo: FairyEditor.PublishHandler.ClassInfo): boolean {
    return hasPathSegment(classInfo, 'view') || hasPathSegment(classInfo, 'widget');
}

// 是否位于 view 目录（用于额外生成全屏适配）
function isViewClass(classInfo: FairyEditor.PublishHandler.ClassInfo): boolean {
    return hasPathSegment(classInfo, 'view');
}

// 根据组件命名规则确定继承基类
// 规则优先级：btn 前缀 > view 后缀 > 默认
function resolveBaseClass(className: string): string {
    const lowerClassName = (className || '').toLowerCase();
    if (lowerClassName.startsWith('btn'))
        return 'XButton';
    if (lowerClassName.endsWith('view'))
        return 'XWindow';
    return 'XComponent';
}

// 标准化类型名：去掉可能存在的 fgui. 前缀
function normalizeTypeName(typeName: string): string {
    if (!typeName)
        return 'GObject';
    if (typeName.startsWith('fgui.'))
        return typeName.substring(5);
    return typeName;
}

// 去掉类名前缀（例如 UI_），用于输出 I组件名.ts
function stripClassNamePrefix(className: string, classNamePrefix: string | null | undefined): string {
    if (!className)
        return '';
    if (classNamePrefix && className.startsWith(classNamePrefix))
        return className.substring(classNamePrefix.length);
    return className;
}

// 字段名以组件原名为准，并兜底去掉 m_ 前缀
function resolveMemberName(memberInfo: FairyEditor.PublishHandler.MemberInfo, memberNamePrefix: string | null | undefined): string {
    let name = memberInfo.name || memberInfo.varName || '';
    if (memberNamePrefix && name.startsWith(memberNamePrefix))
        name = name.substring(memberNamePrefix.length);
    if (name.startsWith('m_'))
        name = name.substring(2);
    return name;
}

// 代码导出根路径优先取 FairyGUI 发布设置：
// 1) codePath -> handler.exportCodePath
// 2) publish path -> handler.exportPath
// 3) 回退默认目录（避免空路径导致异常）
function resolveCodeRootPath(handler: FairyEditor.PublishHandler): string {
    const codePath = handler.exportCodePath || '';
    if (codePath.length > 0)
        return codePath;
    const publishPath = handler.exportPath || '';
    if (publishPath.length > 0)
        return publishPath;
    return handler.project.basePath + '/../../assets/script/app/module';
}

// 向导入表追加一个 named import，并自动去重
function addNamedImport(importTable: ImportTable, importPath: string, typeName: string): void {
    if (!importTable[importPath])
        importTable[importPath] = new Set<string>();
    importTable[importPath].add(typeName);
}

// 将收集到的 named import 按路径排序后写入，保证生成结果稳定
function writeNamedImports(writer: CodeWriter, importTable: ImportTable): void {
    const importPaths = Object.keys(importTable).sort();
    for (let i = 0; i < importPaths.length; i++) {
        const importPath = importPaths[i];
        const names = Array.from(importTable[importPath]).sort();
        writer.writeln('import { %s } from "%s";', names.join(', '), importPath);
    }
}

// FairyGUI 发布入口：按项目规则生成 Interface 声明代码
function genCode(handler: FairyEditor.PublishHandler) {
    // 读取发布配置
    let settings = (<FairyEditor.GlobalPublishSettings>handler.project.GetSettings('Publish')).codeGeneration;
    // 包名用于目录名（会被 ToFilename 标准化）
    let codePkgName = handler.ToFilename(handler.pkg.name);
    // 输出路径：发布设置路径 + 包名 + Interfaces
    let exportCodePath = resolveCodeRootPath(handler) + '/' + codePkgName + '/Interfaces';

    // 收集可导出的类信息
    let classes = handler.CollectClasses(settings.ignoreNoname, settings.ignoreNoname, 'fgui');
    // 创建并清理目标目录
    handler.SetupCodeFolder(exportCodePath, 'ts');

    let classCnt = classes.Count;
    let classNamePrefix = settings.classNamePrefix;
    let memberNamePrefix = settings.memberNamePrefix;

    // 先收集“最终会生成的组件名”，后续用于把自定义组件类型映射成 Ixxx
    let filteredClassNames = new Set<string>();
    for (let i = 0; i < classCnt; i++) {
        let classInfo = classes.get_Item(i);
        if (isViewOrWidget(classInfo))
            filteredClassNames.add(stripClassNamePrefix(classInfo.className, classNamePrefix));
    }

    let writer = new CodeWriter({ blockFromNewLine: false, usingTabs: true });
    let generatedCount = 0;

    // 逐个组件生成 I组件名.ts
    for (let i = 0; i < classCnt; i++) {
        let classInfo = classes.get_Item(i);
        if (!isViewOrWidget(classInfo))
            continue;

        let componentClassName = stripClassNamePrefix(classInfo.className, classNamePrefix);
        let interfaceClassName = 'I' + componentClassName;
        let baseClassName = resolveBaseClass(componentClassName);
        let isViewComponent = isViewClass(classInfo);

        // importTable：内置类型的 named import
        // localTypeImports：同目录下自定义类型导入（Ixxx）
        let importTable: ImportTable = {};
        let localTypeImports = new Set<string>();
        // fields：最终输出的字段声明（仅名称和类型，不赋值）
        let fields: { varName: string; typeName: string }[] = [];

        let members = classInfo.members;
        let memberCnt = members.Count;
        for (let j = 0; j < memberCnt; j++) {
            let memberInfo = members.get_Item(j);
            let varName = resolveMemberName(memberInfo, memberNamePrefix);

            // 过滤 n 前缀字段
            if (varName.startsWith('n'))
                continue;

            let resolvedType = normalizeTypeName(memberInfo.type || '');
            resolvedType = stripClassNamePrefix(resolvedType, classNamePrefix);

            // 自定义组件类型：如果该类型也在本次生成列表中，则改为 I类型名
            if (filteredClassNames.has(resolvedType)) {
                resolvedType = 'I' + resolvedType;
                // 避免自己导入自己
                if (resolvedType !== interfaceClassName)
                    localTypeImports.add(resolvedType);
            }

            // 收集 FairyGUI 内置类型导入
            let builtinImportPath = BUILTIN_TYPE_IMPORTS[resolvedType];
            if (builtinImportPath)
                addNamedImport(importTable, builtinImportPath, resolvedType);

            fields.push({ varName, typeName: resolvedType });
        }

        writer.reset();

        // 写入继承基类导入
        writer.writeln('import %s from "../../../../base/ui/%s";', baseClassName, baseClassName);
        if (isViewComponent) {
            writer.writeln('import { UIPackage } from "../../../../fairyGUI/UIPackage";');
            writer.writeln('import { UIADAPT_TYPE } from "../../../../base/ui/XComponent";');
        }

        // 写入本地自定义类型导入
        let localImports = Array.from(localTypeImports).sort();
        for (let j = 0; j < localImports.length; j++) {
            let localType = localImports[j];
            writer.writeln('import %s from "./%s";', localType, localType);
        }

        // 写入 FairyGUI 类型导入
        writeNamedImports(writer, importTable);
        writer.writeln();

        // 写入类声明与字段声明
        writer.writeln('export default class %s extends %s', interfaceClassName, baseClassName);
        writer.startBlock();
        for (let j = 0; j < fields.length; j++) {
            let field = fields[j];
            writer.writeln('protected %s: %s;', field.varName, field.typeName);
        }
        writer.writeln();
        writer.writeln('public onCreate()');
        writer.startBlock();
        writer.writeln('super.onCreate();');
        if (isViewComponent)
            writer.writeln('this.uiAdaptType = UIADAPT_TYPE.FguiAlwaysFullScreen;');
        if (baseClassName === 'XButton' || baseClassName === 'XComponent') {
            writer.writeln('this.initComponentByView(this);');
            writer.writeln('this.initControllerByView(this);');
        } else {
            // writer.writeln('/** 列表子项皮肤映射对应的类 */');
            // writer.writeln('//UIObjectFactory.setExtension("ui://包名/组件名",组件类); ');
            writer.writeln('this.view = UIPackage.createObject("%s", "%s").asCom;', codePkgName, componentClassName);
            writer.writeln('this.addChild(this.view);');
            writer.writeln('this.initComponentByView(this.view);');
            writer.writeln('this.initControllerByView(this.view);');
        }
        writer.endBlock();
        writer.endBlock();

        writer.save(exportCodePath + '/I' + componentClassName + '.ts');
        generatedCount++;
    }

    console.log(`[export-ccc3] package=${handler.pkg.name}, classes=${classCnt}, matched=${filteredClassNames.size}, generated=${generatedCount}, out=${exportCodePath}`);
}

export { genCode };
