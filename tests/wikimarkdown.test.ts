import {MarkdownParser, WikiMarkdown} from '../src/wikimarkdown';
import {WikiLink} from '../src/wikilink';


describe('test WikiMarkdown', () => {
    const wl: WikiLink = new WikiLink();

    test('baseNamespace', () => {
        const markdown: string = '';
        const wikilink: WikiLink = new WikiLink({'namespace': 'foo'});
        expect(new WikiMarkdown(markdown, wikilink).baseNamespace).toBe('foo')
    });

    test('getMaxSection', () => {
        expect(new WikiMarkdown('', wl).getMaxSection()).toBe(0);
        expect(new WikiMarkdown('text', wl).getMaxSection()).toBe(0);
        expect(new WikiMarkdown('# heading', wl).getMaxSection()).toBe(0);
        expect(new WikiMarkdown([
            '',
            '# heading',
            '',
            'text',
        ].join('\n'), wl).getMaxSection()).toBe(1);
        expect(new WikiMarkdown([
            'text',
            '',
            '# heading',
        ].join('\n'), wl).getMaxSection()).toBe(1);
        expect(new WikiMarkdown([
            'text',
            '',
            '# heading 1',
            '',
            '# heading 2',
        ].join('\n'), wl).getMaxSection()).toBe(2);
        expect(new WikiMarkdown([
            '# heading',
            '```',
            '',
            '# not heading',
            '',
            '```',
        ].join('\n'), wl).getMaxSection()).toBe(0);
    });

    test('getRawText', () => {
        function testRawText(lines: string[]): void {
            expect(new WikiMarkdown(lines.join('\n'), wl).getRawText()).toBe(lines.join('\n'));
        }
        testRawText(['']);
        testRawText(['text'])
        testRawText(['# heading']);
        testRawText([
            '',
            '# heading',
            '',
            'text',
        ]);
        testRawText([
            'text',
            '',
            '# heading',
        ]);
        testRawText([
            'text',
            '',
            '# heading',
            '',
        ]);
    });

    test('getSection', () => {
        const wm: WikiMarkdown = new WikiMarkdown([
            '',
            '# heading 1',
            'text 1',
            '# heading 2',
            'text 2',
            '',
            '# heading 3',
            'text 3',
        ].join('\n'), wl);
        expect(wm.getSection(0)).toBe('');
        expect(wm.getSection(1)).toBe([
            '# heading 1',
            'text 1',
        ].join('\n'));
        expect(wm.getSection(2)).toBe([
            '# heading 2',
            'text 2',
            '',
        ].join('\n'));
        expect(wm.getSection(3)).toBe([
            '# heading 3',
            'text 3',
        ].join('\n'));
    });

    test('setSection', () => {
        function testSetSection(section: number, text: string[],
                                expanded: string[], expandedMaxSection: number|null=null): void {
            const wm: WikiMarkdown = new WikiMarkdown([
                '',
                '# heading 1',
                'text 1',
                '',
                '# heading 2',
                'text 2',
            ].join('\n'), wl);
            if (expandedMaxSection === null) {
                expandedMaxSection = wm.getMaxSection();
            }
            wm.setSection(section, text.join('\n'));
            expect(wm.getRawText()).toBe(expanded.join('\n'));
            expect(wm.getMaxSection()).toBe(expandedMaxSection);
        }
        testSetSection(0, ['# new heading'], [
            '# new heading',
            '# heading 1',
            'text 1',
            '',
            '# heading 2',
            'text 2',
        ]);
        testSetSection(1, ['# new heading'], [
            '',
            '# new heading',
            '# heading 2',
            'text 2',
        ]);
        testSetSection(2, ['# new heading'], [
            '',
            '# heading 1',
            'text 1',
            '',
            '# new heading',
        ]);
        testSetSection(1, ['# new heading 1', '', '# new heading 2'], [
            '',
            '# new heading 1',
            '',
            '# new heading 2',
            '# heading 2',
            'text 2',
        ], 3);
    });
});
