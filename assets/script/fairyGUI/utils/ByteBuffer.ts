import { Color } from "cc";

/**
 * 二进制读取器，负责按 FairyGUI 导出协议解析字节流内容。
 */
export class ByteBuffer {
    /**
     * FairyGUI 反序列化使用的字符串表。
     */
    public stringTable: Array<string>;
    /**
     * 版本号。
     */
    public version: number = 0;
    /**
     * 是否按小端字节序读取数值。
     */
    public littleEndian: boolean;

    /**
     * 内部数据视图。
     */
    protected _view: DataView;
    /**
     * 内部字节数组。
     */
    protected _bytes: Uint8Array;
    /**
     * 当前读取游标位置。
     */
    protected _pos: number;
    /**
     * 当前缓冲区可读取总长度。
     */
    protected _length: number;

    /**
     * 初始化字节读取器的缓冲区视图和游标状态。
     * @param buffer 原始二进制缓冲区。
     * @param offset 起始偏移位置。
     * @param length 可读取长度；未传或为 `-1` 时表示读取到缓冲区末尾。
     */
    public constructor(buffer: ArrayBuffer, offset?: number, length?: number) {
        offset = offset || 0;
        if (length == null || length == -1)
            length = buffer.byteLength - offset;

        this._bytes = new Uint8Array(buffer, offset, length);
        this._view = new DataView(this._bytes.buffer, offset, length);
        this._pos = 0;
        this._length = length;
    }

    /**
     * 获取当前数据缓冲区。
     */
    public get data(): Uint8Array {
        return this._bytes;
    }

    /**
     * 获取当前读取位置。
     */
    public get position(): number {
        return this._pos;
    }

    /**
     * 设置当前读取游标位置；后续读取都将从该偏移继续。
     * @param value 目标读取位置。
     */
    public set position(value: number) {
        if (value > this._length) throw new Error("Out of bounds");
        this._pos = value;
    }

    /**
     * 跳过指定字节数，并推进读取游标。
     * @param count 要跳过的字节数。
     */
    public skip(count: number): void {
        this._pos += count;
    }

    /**
     * 校验当前读取范围是否合法。
     * @param forward 即将向前读取的字节数。
     */
    private validate(forward: number): void {
        if (this._pos + forward > this._length) throw new Error("Out of bounds");
    }

    /**
     * 读取一个字节，并推进内部游标。
     */
    public readByte(): number {
        this.validate(1);
        return this._view.getUint8(this._pos++);
    }

    /**
     * 读取一个布尔值，并推进内部游标。
     */
    public readBool(): boolean {
        return this.readByte() == 1;
    }

    /**
     * 读取一个有符号 16 位整数，并推进内部游标。
     */
    public readShort(): number {
        this.validate(2);
        let ret: number = this._view.getInt16(this._pos, this.littleEndian);
        this._pos += 2;
        return ret;
    }

    /**
     * 读取一个无符号 16 位整数，并推进内部游标。
     */
    public readUshort(): number {
        this.validate(2);
        let ret: number = this._view.getUint16(this._pos, this.littleEndian);
        this._pos += 2;
        return ret;
    }

    /**
     * 读取一个有符号 32 位整数，并推进内部游标。
     */
    public readInt(): number {
        this.validate(4);
        let ret: number = this._view.getInt32(this._pos, this.littleEndian);
        this._pos += 4;
        return ret;
    }

    /**
     * 读取一个无符号 32 位整数，并推进内部游标。
     */
    public readUint(): number {
        this.validate(4);
        let ret: number = this._view.getUint32(this._pos, this.littleEndian);
        this._pos += 4;
        return ret;
    }

    /**
     * 读取一个 32 位浮点数，并推进内部游标。
     */
    public readFloat(): number {
        this.validate(4);
        let ret: number = this._view.getFloat32(this._pos, this.littleEndian);
        this._pos += 4;
        return ret;
    }

    /**
     * 读取一段 UTF 字符串，并推进内部游标。
     * @param len 字符串字节长度；未传时先读取一个 `ushort` 作为长度。
     * @returns 解析得到的字符串。
     */
    public readString(len?: number): string {
        if (len == undefined) len = this.readUshort();
        this.validate(len);

        let v: string = "", max: number = this._pos + len, c: number = 0, c2: number = 0, c3: number = 0, f: Function = String.fromCharCode;
        let u: Uint8Array = this._bytes, i: number = 0;
        let pos = this._pos;
        while (pos < max) {
            c = u[pos++];
            if (c < 0x80) {
                if (c != 0) {
                    v += f(c);
                }
            } else if (c < 0xE0) {
                v += f(((c & 0x3F) << 6) | (u[pos++] & 0x7F));
            } else if (c < 0xF0) {
                c2 = u[pos++];
                v += f(((c & 0x1F) << 12) | ((c2 & 0x7F) << 6) | (u[pos++] & 0x7F));
            } else {
                c2 = u[pos++];
                c3 = u[pos++];
                v += f(((c & 0x0F) << 18) | ((c2 & 0x7F) << 12) | ((c3 << 6) & 0x7F) | (u[pos++] & 0x7F));
            }
            i++;
        }
        this._pos += len;

        return v;
    }

    /**
     * 按 FairyGUI 字符串表协议读取一个字符串引用。
     * @returns 字符串表中的字符串；特殊值时返回空字符串或空值。
     */
    public readS(): string {
        var index: number = this.readUshort();
        if (index == 65534) //null
            return null;
        else if (index == 65533)
            return ""
        else
            return this.stringTable[index];
    }

    /**
     * 连续读取一组字符串引用。
     * @param cnt 要读取的字符串数量。
     * @returns 读取到的字符串数组。
     */
    public readSArray(cnt: number): Array<string> {
        var ret: Array<string> = new Array<string>(cnt);
        for (var i: number = 0; i < cnt; i++)
            ret[i] = this.readS();

        return ret;
    }

    /**
     * 将字符串写入字符串表缓存。
     * @param value 要写入的字符串值。
     */
    public writeS(value: string): void {
        var index: number = this.readUshort();
        if (index != 65534 && index != 65533)
            this.stringTable[index] = value;
    }

    /**
     * 读取一个颜色值，并推进内部游标。
     * @param hasAlpha 是否读取 Alpha 通道；未传时默认读取。
     * @returns 解析得到的颜色对象。
     */
    public readColor(hasAlpha?: boolean): Color {
        var r: number = this.readByte();
        var g: number = this.readByte();
        var b: number = this.readByte();
        var a: number = this.readByte();

        return new Color(r, g, b, (hasAlpha ? a : 255));
    }

    /**
     * 读取一个字符。
     * @returns 读取到的单字符字符串。
     */
    public readChar(): string {
        var i: number = this.readUshort();
        return String.fromCharCode(i);
    }

    /**
     * 读取一个子缓冲区视图。
     * @returns 新的子缓冲区读取器。
     */
    public readBuffer(): ByteBuffer {
        var count: number = this.readUint();
        this.validate(count);
        var ba: ByteBuffer = new ByteBuffer(this._bytes.buffer, this._bytes.byteOffset + this._pos, count);
        ba.stringTable = this.stringTable;
        ba.version = this.version;
        this._pos += count;
        return ba;
    }

    /**
     * 将读取游标定位到指定块和偏移位置。
     * @param indexTablePos 索引表起始位置。
     * @param blockIndex 目标块索引。
     * @returns 是否成功定位到目标块。
     */
    public seek(indexTablePos: number, blockIndex: number): boolean {
        var tmp: number = this._pos;
        this._pos = indexTablePos;
        var segCount: number = this.readByte();
        if (blockIndex < segCount) {
            var useShort: boolean = this.readByte() == 1;
            var newPos: number;
            if (useShort) {
                this._pos += 2 * blockIndex;
                newPos = this.readUshort();
            }
            else {
                this._pos += 4 * blockIndex;
                newPos = this.readUint();
            }

            if (newPos > 0) {
                this._pos = indexTablePos + newPos;
                return true;
            }
            else {
                this._pos = tmp;
                return false;
            }
        }
        else {
            this._pos = tmp;
            return false;
        }
    }
}
