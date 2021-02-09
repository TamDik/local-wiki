import {WikiLink, DEFAULT_NAMESPACE, DEFAULT_TYPE, DEFAULT_NAME} from '../src/wikilink';


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
    testParsing('file:b'    , DEFAULT_NAMESPACE, 'file'      , 'b'         );
    testParsing('a:file'    , 'a'              , 'file'      , DEFAULT_NAME);
    testParsing('a:b:c'     , 'a'              , DEFAULT_TYPE, 'b:c'       );
    testParsing('file:b:c'  , DEFAULT_NAMESPACE, 'file'      , 'b:c'       );
    testParsing('a:file:c'  , 'a'              , 'file'      , 'c'         );
    testParsing('a:b:file'  , 'a'              , DEFAULT_TYPE, 'b:file'    );
    testParsing('a:b:c:d'   , 'a'              , DEFAULT_TYPE, 'b:c:d'     );
    testParsing('file:b:c:d', DEFAULT_NAMESPACE, 'file'      , 'b:c:d'     );
    testParsing('a:file:c:d', 'a'              , 'file'      , 'c:d'       );
    testParsing('a:b:file:d', 'a'              , DEFAULT_TYPE, 'b:file:d'  );
    testParsing('a:b:c:file', 'a'              , DEFAULT_TYPE, 'b:c:file'  );
});
