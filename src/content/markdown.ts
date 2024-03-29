import {WikiMarkdown} from '../markdown/markdown';
import {WikiLink, WikiLocation} from '../wikilink';
import {toFullPath} from '../wikihistory-builder';
import {CategoriesBody} from './special-body';


const js: string[] = [...WikiMarkdown.js];
const css: string[] = [...WikiMarkdown.css];


function parse(markdown: string, wikiLink: WikiLink, category: boolean=true): string {
    const wikiMarkdown: WikiMarkdown = new WikiMarkdown(markdown, wikiLink);
    const baseNamespace: string = wikiLink.namespace;
    let {html, categories} = wikiMarkdown.parse({toFullPath, edit: true});
    if (category) {
        html += categoryList(categories, baseNamespace);
    }
    return html;
}


function categoryList(categories: string[], baseNamespace: string): string {
    if (categories.length === 0) {
        return '';
    }
    const categoriesLocation: WikiLocation = new WikiLocation(new WikiLink({namespace: baseNamespace, type: 'Special', name: CategoriesBody.wikiName}));
    const lines: string[] = [
        '<div class="category-links">',
          `<a href="${categoriesLocation.toURI()}">Categories</a>: `,
          '<ul>',
    ];
    for (const category of categories) {
        const wikiLink: WikiLink = new WikiLink(category, baseNamespace);
        const location: WikiLocation = new WikiLocation(wikiLink);
        let text: string = wikiLink.name;
        if (wikiLink.namespace !== baseNamespace) {
            text += ` (${wikiLink.namespace})`;
        }
        lines.push(`<li><a href="${location.toURI()}">${text}</a></li>`);
    }
    lines.push(
          '</ul>',
        '</div>'
    );
    return lines.join('');
}


export {js, css, parse};
