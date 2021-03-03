import {setDataDir} from '../src/wikiconfig';
import {WikiLink} from '../src/wikilink';
import {WikiConfig, MergedNamespaceConfig} from '../src/wikiconfig';
import {Category, extractCategories, updateCategories} from '../src/wikicategory';
import {generateRandomString} from '../src/utils';
import * as fs from 'fs';
import * as path from 'path';


function testNamespace(): [string, MergedNamespaceConfig] {
    const testDataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir);
    }
    setDataDir(testDataDir);

    const config: WikiConfig = new WikiConfig();
    const nsConfig: MergedNamespaceConfig = config.newNamespace('category-test', 'internal', null);
    return [testDataDir, nsConfig];
}

function testWikiLinks(received: WikiLink[], expected: WikiLink[]): void {
    function wikiLinkToStr(wikiLink: WikiLink): string {
        return `${wikiLink.namespace}:${wikiLink.type}:${wikiLink.name}`;
    }
    const receivedStr: string[] = received.map(wikiLinkToStr)
    const expectedStr: string[] = expected.map(wikiLinkToStr)
    expect(receivedStr).toEqual(expect.arrayContaining(expectedStr));
    expect(receivedStr.length).toBe(expectedStr.length);
}

function testCategories(received: Category[], expected: Category[]): void {
    function categoryToStr(category: Category): string {
        const wikiLink: WikiLink = category.toWikiLink();
        return `${wikiLink.namespace}:${wikiLink.type}:${wikiLink.name}`;
    }
    const receivedStr: string[] = received.map(categoryToStr)
    const expectedStr: string[] = expected.map(categoryToStr)
    expect(receivedStr).toEqual(expect.arrayContaining(expectedStr));
    expect(receivedStr.length).toBe(expectedStr.length);
}

const [testDataDir, ns1] = testNamespace();


describe('test extractCategories()', () => {
    function testExtractCategoies(markdown: string, expected: WikiLink[]): void {
        const categories: WikiLink[] = extractCategories(ns1.id, markdown).map(c => c.toWikiLink());
        test(`${markdown}:`, () => {
            testWikiLinks(categories, expected)
        });
    }

    testExtractCategoies('{{Category:c1}}', [new WikiLink({namespace: ns1.id, type: 'Category', name: 'c1'})]);
    testExtractCategoies(
        '{{Category:c1}}{{Category:c1}}{{Category:c2}}',
        [
            new WikiLink({namespace: ns1.id, type: 'Category', name: 'c1'}),
            new WikiLink({namespace: ns1.id, type: 'Category', name: 'c2'})
        ]
    );
});


describe('test unknown category', () => {
    const category: Category = new Category(new WikiLink('unknown:Category:unknown'));
    test('refered', () => {
        testWikiLinks(category.refered, []);
    });
});


describe('test updateCategories()', () => {
    // カテゴリー
    const n1: WikiLink = new WikiLink('Category:n1', ns1.id);
    const n2: WikiLink = new WikiLink('Category:n2', ns1.id);
    const n3: WikiLink = new WikiLink('Category:n3', ns1.id);
    const unknown: WikiLink = new WikiLink(`${generateRandomString(5)}:Category:n1`);

    // 参照元
    const p1: WikiLink = new WikiLink({namespace: ns1.id, name: 'name1'});
    const p2: WikiLink = new WikiLink({namespace: ns1.id, name: 'name2'});
    const p3: WikiLink = new WikiLink({namespace: ns1.id, name: 'name3'});
    const p4: WikiLink = new WikiLink({namespace: ns1.id, name: 'name4'});

    updateCategories(p1, [new Category(n1), new Category(n2)]);
    updateCategories(p1, [new Category(n2), new Category(n3)]);  // 更新
    updateCategories(p2, [new Category(n1)]);
    updateCategories(p3, [new Category(n1)]);
    updateCategories(p4, [new Category(unknown)]);  // 不明な名前空間

    test('all categories under the namespace', () => {
        const c1: Category = new Category(n1);
        const c2: Category = new Category(n2);
        const c3: Category = new Category(n3);
        const cu: Category = new Category(unknown);

        testCategories(Category.allUnder(ns1.id), [c1, c2, c3]);
        testCategories(Category.allUnder(unknown.namespace), [cu]);
    });

    test('refered', () => {
        const c1: Category = new Category(n1);
        const c2: Category = new Category(n2);
        const cu: Category = new Category(unknown);

        testWikiLinks(c1.refered, [p2, p3]);
        testWikiLinks(c2.refered, [p1]);
        testWikiLinks(cu.refered, [p4]);
    });
});
