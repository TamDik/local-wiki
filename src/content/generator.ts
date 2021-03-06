import {WikiConfig, MergedNamespaceConfig} from '../wikiconfig';
import {WikiLink, WikiLocation} from '../wikilink';
import {ContentBody} from './content-body';
import {PageContentBodyDispatcher} from './page-body';
import {FileContentBodyDispatcher} from './file-body';
import {TemplateContentBodyDispatcher} from './template-body';
import {SpecialContentBody, SpecialContentBodyDispatcher, NewNamespaceBody} from './special-body';
import {CategoryContentBodyDispatcher} from './category-body';
import {NotFoundNamespaceBody} from './not-found-namespace-body';


class ContentGenerator {
    public static sideMenu(wikiLink: WikiLink): string {
        return SideMenuGenerator.html(wikiLink);
    }

    public static title(mode: PageMode, wikiLink: WikiLink): string {
        const path: string = wikiLink.toPath();
        switch (mode) {
            case 'read':
                return path;
            case 'edit':
                return `editing ${path}`
            case 'history':
                return `Revision history of "${path}"`;
        }
    }

    public static menuTabs(mode: PageMode, wikiLink: WikiLink): TopNavTabData[] {
        switch (wikiLink.type) {
            case 'Page':
            case 'File':
            case 'Category':
            case 'Template':
                const readLoc: WikiLocation = new WikiLocation(wikiLink);
                const editLoc: WikiLocation = new WikiLocation(wikiLink);
                const histLoc: WikiLocation = new WikiLocation(wikiLink);
                readLoc.addParam('mode', 'read');
                editLoc.addParam('mode', 'edit');
                histLoc.addParam('mode', 'history');
                return [
                    {title: 'Read'   , href: readLoc.toURI(), selected: mode === 'read'},
                    {title: 'Edit'   , href: editLoc.toURI(), selected: mode === 'edit'},
                    {title: 'History', href: histLoc.toURI(), selected: mode === 'history'},
                ];
            case 'Special':
                return [];
        }
    }

    public static mainContent(mode: PageMode, wikiLink: WikiLink, version?: number, params: {[key: string]: string}={}): ContentBody {
        const config: WikiConfig = new WikiConfig();

        // 名前空間なし
        if (!config.hasNamespace(wikiLink.namespace)
            && !(wikiLink.type === 'Special' && wikiLink.name === NewNamespaceBody.wikiName)) {
            return new NotFoundNamespaceBody(wikiLink);
        }

        // typeごと
        switch (wikiLink.type) {
            case 'Page':
                return new PageContentBodyDispatcher(wikiLink, mode, version).execute();
            case 'File':
                return new FileContentBodyDispatcher(wikiLink, mode, version).execute();
            case 'Category':
                return new CategoryContentBodyDispatcher(wikiLink, mode, version).execute();
            case 'Template':
                return new TemplateContentBodyDispatcher(wikiLink, mode, version).execute();
            case 'Special':
                return new SpecialContentBodyDispatcher(wikiLink).execute();
        }
    }

    public static specialContentBodies(wikiLink: WikiLink): SpecialContentBody[] {
        return SpecialContentBodyDispatcher.specialContentBodies(wikiLink);
    }
}


// -----------------------------------------------------------------------------
// SideMenuGenerator
// -----------------------------------------------------------------------------
class SideMenuGenerator {
    public static html(wikiLink: WikiLink): string {
        const config: WikiConfig = new WikiConfig();
        const {main, sub} = config.getSideMenu();
        const lines: string[] = [];
        const baseNamespace: string = wikiLink.namespace;
        lines.push(SideMenuGenerator.mainSection(main, baseNamespace));
        for (const {title, data} of sub) {
            lines.push(SideMenuGenerator.subSection(title, data, baseNamespace));
        }
        return lines.join('');
    }

    private static mainSection(data: SideMenuSectionData, baseNamespace: string): string {
        return [
        '<nav id="wiki-side-main">',
          '<ul class="menu-contents">',
            SideMenuGenerator.menuContents(data, baseNamespace),
          '</ul>',
        '</nav>'
        ].join('');
    }

    private static subSection(title: string, data: SideMenuSectionData, baseNamespace: string): string {
         return [
            '<nav class="wiki-side-sub">',
              `<h3 class="wiki-side-label">${title}</h3>`,
              '<ul class="menu-contents">',
                SideMenuGenerator.menuContents(data, baseNamespace),
              '</ul>',
            '</nav>',
        ].join('');
    }

    private static menuContents(data: SideMenuSectionData, baseNamespace: string): string {
        const lines: string[] = [];
        lines.push('<ul class="menu-contents">');
        for (const content of data) {
            lines.push('<li>');
            if (content.type === 'text') {
                lines.push(SideMenuGenerator.text(content.value));
            } else if (content.type === 'link') {
                lines.push(SideMenuGenerator.link(content.text, content.path, baseNamespace));
            }
            lines.push('</li>');
        }
        lines.push('</ul>');
        return lines.join('');
    }

    private static text(value: string): string {
        return value;
    }

    private static link(text: string, path: string, baseNamespace: string): string {
        let href: string = path;
        if (WikiLink.isWikiLink(path)) {
            href = new WikiLocation(new WikiLink(path, baseNamespace)).toURI();
        }
        return `<a href="${href}">${text}</a>`;
    }
}


export {ContentGenerator, ContentBody};
