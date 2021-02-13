import {BufferPathGenerator, WikiHistory, CurrentVersionManager, PreviousVersionManager, VersionData} from '../src/wikihistory';
import * as fs from 'fs';
import * as path from 'path';


function initRootDir(): string {
    const rootDir: string = path.join(__dirname, '../data/test');
    const cFilepath: string = path.join(rootDir, CurrentVersionManager.FILENAME);
    const pFilepath: string = path.join(rootDir, PreviousVersionManager.FILENAME);
    if (fs.existsSync(cFilepath)) {
        fs.unlinkSync(cFilepath);
    }
    if (fs.existsSync(pFilepath)) {
        fs.unlinkSync(pFilepath);
    }
    if (!fs.existsSync(rootDir)) {
        fs.mkdirSync(rootDir);
    }
    return rootDir;
}


describe('test BufferPathGenerator', () => {
    const rootDir: string = initRootDir();
    const bpg: BufferPathGenerator = new BufferPathGenerator(rootDir);
    bpg.setBufferSetp(2);
    bpg.setBufferDepth(3);
    const filename: string = 'abcdefg';
    test(`filename: ${filename}`, () => {
        const expected: string = path.join(rootDir, 'ab', 'cd', 'ef', 'abcdefg')
        expect(bpg.execute(filename, false)).toBe(expected);
    });
});


describe('test CurrentVersionManager', () => {
    function testCurrentVersionManager(message: string, f: (cvm: CurrentVersionManager) => void): void {
        test(message, () => {
            const rootDir: string = initRootDir();
            const cvm: CurrentVersionManager = new CurrentVersionManager(rootDir);
            f(cvm);
        });
    }

    testCurrentVersionManager('empty', cvm => {
        expect(cvm.getNameList()).toEqual([]);
    });

    testCurrentVersionManager('hasName', cvm => {
        cvm.add({name: 'c1', id: '1'})
        cvm.add({name: 'c2', id: '2'});
        expect(cvm.hasName('c1')).toBe(true);
        expect(cvm.hasName('c2')).toBe(true);
        expect(cvm.hasName('c3')).toBe(false);
    });

    testCurrentVersionManager('add', cvm => {
        cvm.add({name: 'c1', id: '1'});
        cvm.add({name: 'c2', id: '2'});
        cvm.add({name: 'c1', id: '3'});
        expect(cvm.getId('c1')).toBe('3');
        expect(cvm.getId('c2')).toBe('2');
        expect(cvm.getNameList()).toEqual(['c1', 'c2']);
    });
});


describe('test PreviousVersionManager', () => {
    function testVersionManager(message: string, f: (pvm: PreviousVersionManager) => void): void {
        test(message, () => {
            const rootDir: string = initRootDir();
            const pvm: PreviousVersionManager = new PreviousVersionManager(rootDir);
            f(pvm);
        });
    }

    function createData(id: string, prev: string|null): [VersionData, VersionData] {
        const version: number = 1;
        const created: Date = new Date();
        const comment: string = 'comment';
        const filename: string = 'filename';
        const next: null = null;
        const name: string = `p${version}`;
        return [
            {id, name, next, prev, version, created, comment, filename},
            {id, name, next, prev, version, created, comment, filename}
        ];
    }

    testVersionManager('hasId', pvm => {
        const [data11, data12] = createData('1', null);
        const [data21, data22] = createData('2', '1' );
        pvm.add(data11);
        pvm.add(data21);
        expect(pvm.hasId(data22.id)).toBe(true);
        expect(pvm.hasId('9999')).toBe(false);
    });

    testVersionManager('prevOf', pvm => {
        const [data11, data12] = createData('1', null);
        const [data21, data22] = createData('2', '1' );
        const [data31, data32] = createData('3', '2' );
        const [data41, data42] = createData('4', '3' );
        const [data51, data52] = createData('5', '4' );
        pvm.add(data11);
        pvm.add(data21);
        pvm.add(data31);
        pvm.add(data41);
        pvm.add(data51);
        data12.next = data22.id;
        data22.next = data32.id;
        data32.next = data42.id;
        data42.next = data52.id;
        expect(pvm.prevOf(data31.id, 2)).toEqual([data32, data22]);
    });

    testVersionManager('nextOf', pvm => {
        const [data11, data12] = createData('1', null);
        const [data21, data22] = createData('2', '1' );
        const [data31, data32] = createData('3', '2' );
        const [data41, data42] = createData('4', '3' );
        const [data51, data52] = createData('5', '4' );
        pvm.add(data11);
        pvm.add(data21);
        pvm.add(data31);
        pvm.add(data41);
        pvm.add(data51);
        data12.next = data22.id;
        data22.next = data32.id;
        data32.next = data42.id;
        data42.next = data52.id;
        expect(pvm.nextOf(data31.id, 2)).toEqual([data32, data42]);
    });
});


describe('test WikiHistory', () => {
    const rootDir: string = initRootDir();
    const wh: WikiHistory = new WikiHistory(rootDir);

    const data1 = {name: 'h1', comment: '', filename: ''};
    const data2 = {name: 'h2', comment: '', filename: ''};
    const data3 = {name: 'h1', comment: '', filename: ''};
    const vData1 = {...wh.add(data1)};
    const vData2 = {...wh.add(data2)};
    const vData3 = {...wh.add(data3)};
    const vData4 = {...wh.revert(vData1.id)};
    const expected1 = {...vData1, prev: null,      next: vData3.id};
    const expected2 = {...vData2, prev: null,      next: null};
    const expected3 = {...vData3, prev: vData1.id, next: vData4.id};
    const expected4 = {...vData4, prev: vData3.id, next: null}
    test('hasId', () => {
        expect(wh.hasId(vData1.id)).toBe(true);
        expect(wh.hasId(vData2.id)).toBe(true);
        expect(wh.hasId(vData3.id)).toBe(true);
        expect(wh.hasId('dummy')).toBe(false);
    });

    test('hasName', () => {
        expect(wh.hasName(data1.name)).toBe(true);
        expect(wh.hasName(data2.name)).toBe(true);
        expect(wh.hasName('dummy')).toBe(false);
    });

    test('getById', () => {
        expect(wh.getById(vData1.id)).toEqual(expected1);
        expect(wh.getById(vData2.id)).toEqual(expected2);
        expect(wh.getById(vData3.id)).toEqual(expected3);
    });

    test('getByName', () => {
        expect(wh.getByName(data1.name)).toEqual(expected4);
        expect(wh.getByName(data2.name)).toEqual(expected2);
    });

    test('getByVersion', () => {
        expect(wh.getByVersion(data1.name, 1)).toEqual(expected1);
        expect(wh.getByVersion(data1.name, 2)).toEqual(expected3);
        expect(wh.getByVersion(data2.name, 1)).toEqual(expected2);
    })
});
