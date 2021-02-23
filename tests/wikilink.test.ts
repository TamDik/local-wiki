import {WikiLink, DEFAULT_NAMESPACE, DEFAULT_TYPE, DEFAULT_NAME, WikiLocation} from '../src/wikilink';


describe('test WikiLink', () => {
    function testParsing(href: string, ns: string, wikitype: string, name: string) {
        const wl: WikiLink = new WikiLink(href);
        test(`parse wikilink: '${href}'`, () => {
            expect(wl.namespace).toBe(ns);
            expect(wl.name).toBe(name);
            expect(wl.type).toBe(wikitype);
        });
    }
    testParsing(''          , DEFAULT_NAMESPACE, DEFAULT_TYPE, DEFAULT_NAME);
    testParsing('a'         , DEFAULT_NAMESPACE, DEFAULT_TYPE, 'a'         );
    testParsing('a:b'       , 'a'              , DEFAULT_TYPE, 'b'         );
    testParsing('File:b'    , DEFAULT_NAMESPACE, 'File'      , 'b'         );
    testParsing('a:File'    , 'a'              , 'File'      , DEFAULT_NAME);
    testParsing('a:b:c'     , 'a'              , DEFAULT_TYPE, 'b:c'       );
    testParsing('File:b:c'  , DEFAULT_NAMESPACE, 'File'      , 'b:c'       );
    testParsing('a:File:c'  , 'a'              , 'File'      , 'c'         );
    testParsing('a:b:File'  , 'a'              , DEFAULT_TYPE, 'b:File'    );
    testParsing('a:b:c:d'   , 'a'              , DEFAULT_TYPE, 'b:c:d'     );
    testParsing('File:b:c:d', DEFAULT_NAMESPACE, 'File'      , 'b:c:d'     );
    testParsing('a:File:c:d', 'a'              , 'File'      , 'c:d'       );
    testParsing('a:b:File:d', 'a'              , DEFAULT_TYPE, 'b:File:d'  );
    testParsing('a:b:c:File', 'a'              , DEFAULT_TYPE, 'b:c:File'  );
});


describe('test WikiLocation', () => {
    function testURI(path: string, params: [string, string][], expected: string) {
        const location: WikiLocation = new WikiLocation(new WikiLink(path));
        for (const [key, value] of params) {
            location.addParam(key, value);
        }
        const param: string = params.map(([key, value]) => `[${key}, ${value}]`).join(', ');
        test(`toURI: ${path} [${param}]`, () => {
            expect(location.toURI()).toBe(expected);
        });
    }
    testURI('a:File:b', []                           , '?path=a:File:b');
    testURI('a:File:b', [['k1', 'v1']]               , '?path=a:File:b&k1=v1');
    testURI('a:File:b', [['k1', 'v1'] , ['k2', 'v2']], '?path=a:File:b&k1=v1&k2=v2');
});
