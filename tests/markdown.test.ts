import {WikiMD} from '../src/markdown';
import {FileHandler, ImageFileHandler, PDFFileHandler} from '../src/markdown-magic-handler';

describe('test code', () => {
    function testCode(value: string[], expected: string[]): void {
        const element: HTMLElement = document.createElement('div');
        const wmd: WikiMD = new WikiMD({toWikiURI: (href: string) => href});
        wmd.setValue(value.join('\n'));
        element.innerHTML = wmd.toHTML();
        test(`'${value.join('\\n')}'`, () => expect(element.innerHTML).toBe(expected.join('\n')));
    }

    testCode([
        '```',
        'class foo:',
        '    pass',
        '```',
    ], [
        '<pre><code>class foo:',
        '    pass</code></pre>',
    ]);

    testCode([
        '```python',
        'class foo:',
        '    pass',
        '```',
    ], [
        '<pre><code><span class="hljs-class"><span class="hljs-keyword">class</span> <span class="hljs-title">foo</span>:</span>',
        '    <span class="hljs-keyword">pass</span></code></pre>',
    ]);

    testCode([
        '```math',
        '\\sum_{i} class \\cdot n_i',
        '```',
    ], [
        '<p><math>\\sum_{i} class \\cdot n_i</math></p>'
    ]);
});

describe('test ImageFileHandler', () => {
    function testImage(value: string, expected: string): void {
        const element: HTMLElement = document.createElement('div');
        const wmd: WikiMD = new WikiMD({
            toWikiURI: (href: string) => href,
            isWikiLink: (href: string) => true
        });
        wmd.setValue(value);

        const fileHandler: FileHandler = new FileHandler(path => true);
        fileHandler.addHandler(new ImageFileHandler(path => true));
        wmd.addMagicHandler(fileHandler);
        element.innerHTML = wmd.toHTML();
        test(`'${value}'`, () => expect(element.innerHTML.replace(/(\n|<\/?p>)/g, '')).toBe(expected));
    }

    testImage(
        '{{File:example.jpg|border|caption}}',
        '<a href="File:example.jpg" class="image">' +
          '<img alt="caption" src="File:example.jpg" decoding="async" class="thumbborder">' +
        '</a>'
    );

    testImage(
        '{{File:example.jpg|frameless|caption}}',
        '<a href="File:example.jpg" class="image">' +
            '<img alt="caption" src="File:example.jpg" decoding="async">' +
        '</a>'
    );

    testImage(
        '{{File:example.jpg|frame|caption}}',
        '<div class="thumb tright">' +
          '<div class="thumbinner">' +
            '<a href="File:example.jpg" class="image">' +
              '<img alt="caption" src="File:example.jpg" decoding="async" class="thumbimage">' +
            '</a>' +
          '<div class="thumbcaption">caption</div>' +
          '</div>' +
        '</div>'
    );

    testImage(
        '{{File:example.jpg|thumb|caption}}',
        '<div class="thumb tright">' +
          '<div class="thumbinner">' +
            '<a href="File:example.jpg" class="image">' +
              '<img alt="caption" src="File:example.jpg" decoding="async" class="thumbimage">' +
            '</a>' +
          '<div class="thumbcaption">' +
          '<div class="magnify">' +
            '<a href="File:example.jpg" title="Enlarge">' +
            '</a>' +
          '</div>' +
          'caption</div>' +
          '</div>' +
        '</div>'
    );

    testImage(
        '{{File:example.jpg|50px}}',
        '<a href="File:example.jpg" class="image">' +
          '<img alt="File:example.jpg" src="File:example.jpg" decoding="async" width="50">' +
        '</a>'
    );

    testImage(
        '{{File:example.jpg|border|50px}}',
        '<a href="File:example.jpg" class="image">' +
          '<img alt="File:example.jpg" src="File:example.jpg" decoding="async" class="thumbborder" width="50">' +
        '</a>'
    );

    testImage(
        '{{File:example.jpg|frame|50px}}',
        '<div class="thumb tright">' +
          '<div class="thumbinner">' +
            '<a href="File:example.jpg" class="image">' +
              '<img alt="File:example.jpg" src="File:example.jpg" decoding="async" class="thumbimage">' +
            '</a>' +
            '<div class="thumbcaption">' +
            '</div>' +
          '</div>' +
        '</div>'
    );

    testImage(
        '{{File:example.jpg|thumb|50px}}',
        '<div class="thumb tright">' +
          '<div class="thumbinner">' +
            '<a href="File:example.jpg" class="image">' +
            '<img alt="File:example.jpg" src="File:example.jpg" decoding="async" class="thumbimage" width="50">' +
            '</a>' +
            '<div class="thumbcaption">' +
              '<div class="magnify">' +
                '<a href="File:example.jpg" title="Enlarge"></a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
    );

    testImage(
        '{{File:example.jpg|frameless|50px}}',
        '<a href="File:example.jpg" class="image">' +
          '<img alt="File:example.jpg" src="File:example.jpg" decoding="async" width="50">' +
        '</a>'
    );

    testImage(
        '{{File:example.jpg|none|100px|caption}}',
        '<div class="floatnone">' +
          '<a href="File:example.jpg" class="image">' +
            '<img alt="caption" src="File:example.jpg" decoding="async" width="100">' +
          '</a>' +
        '</div>'
    );

    testImage(
        '{{File:example.jpg|center|100px|caption}}',
        '<div class="center">' +
          '<div class="floatnone">' +
            '<a href="File:example.jpg" class="image">' +
              '<img alt="caption" src="File:example.jpg" decoding="async" width="100">' +
            '</a>' +
          '</div>' +
        '</div>'
    );

    testImage(
        '{{File:example.jpg|left|100px|caption}}',
        '<div class="floatleft">' +
          '<a href="File:example.jpg" class="image">' +
            '<img alt="caption" src="File:example.jpg" decoding="async" width="100">' +
          '</a>' +
        '</div>'
    );

    testImage(
        '{{File:example.jpg|right|100px|caption}}',
        '<div class="floatright">' +
          '<a href="File:example.jpg" class="image">' +
            '<img alt="caption" src="File:example.jpg" decoding="async" width="100">' +
          '</a>' +
        '</div>'
    );

    testImage(
        '{{File:example.jpg|link=MainPage|caption}}',
        '<a href="MainPage">' +
          '<img alt="caption" src="File:example.jpg" decoding="async">' +
        '</a>'
    );

    test.todo('external links (link=https://...) are improperly expanded by Marked.');
    /* testImage( */
    /*     '{{File:example.jpg|link=http:\/\/example.com|caption}}', */
    /*     '<a href="http:\/\/example.com">' + */
    /*       '<img alt="caption" src="File:example.jpg" decoding="async">' + */
    /*     '</a>' */
    /* ); */

    testImage(
        '{{File:example.jpg|link=|caption}}',
        '<img alt="caption" src="File:example.jpg" decoding="async">'
    );
});

describe('test PDFFileHandler', () => {
    function testPDF(value: string, expected: string): void {
        const element: HTMLElement = document.createElement('div');
        const wmd: WikiMD = new WikiMD({
            toWikiURI: (href: string) => href,
            isWikiLink: (href: string) => true
        });
        wmd.setValue(value);

        const fileHandler: FileHandler = new FileHandler(path => true);
        fileHandler.addHandler(new PDFFileHandler(path => true));
        wmd.addMagicHandler(fileHandler);
        element.innerHTML = wmd.toHTML();
        test(`'${value}'`, () => expect(element.innerHTML.replace(/(\n|<\/?p>)/g, '')).toBe(expected));
    }

    testPDF(
        '{{File:example.pdf}}',
        '<object style="width: 100%; height: calc(100vh - 300px);" type="application/pdf" data="File:example.pdf">' +
            '<div class="alert alert-warning">File:example.pdf could not be displayed. </div>' +
        '</object>'
    );

    testPDF(
        '{{File:example.pdf|x100px}}',
        '<object style="width: 100%; height: 100px;" type="application/pdf" data="File:example.pdf">' +
            '<div class="alert alert-warning">File:example.pdf could not be displayed. </div>' +
        '</object>'
    );

    testPDF(
        '{{File:example.pdf|100x100px}}',
        '<object style="width: 100px; height: 100px;" type="application/pdf" data="File:example.pdf">' +
            '<div class="alert alert-warning">File:example.pdf could not be displayed. </div>' +
        '</object>'
    );

    testPDF(
        '{{File:example.pdf|preview}}',
        '<object style="width: 100%; height: calc(100vh - 300px);" type="application/pdf" data="File:example.pdf">' +
            '<div class="alert alert-warning">File:example.pdf could not be displayed. </div>' +
        '</object>'
    );

    testPDF(
        '{{File:example.pdf|link}}',
        '<a href="File:example.pdf">File:example.pdf</a>'
    );

    testPDF(
        '{{File:example.pdf|link|title}}',
        '<a href="File:example.pdf">title</a>'
    );
});
