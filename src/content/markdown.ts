import {WikiMarkdown} from '../wikimarkdown';
import {WikiLink, WikiLocation} from '../wikilink';
import {toFullPath} from '../wikihistory-builder';


const js: string[] = [...WikiMarkdown.js];


function parse(markdown: string, wikiLink: WikiLink, categoriesLocation?: WikiLocation): string {
    const wikiMarkdown: WikiMarkdown = new WikiMarkdown(markdown, wikiLink);
    const baseNamespace: string = wikiLink.namespace;
    let {html, categories} = wikiMarkdown.parse({baseNamespace, toFullPath, edit: true});
    if (categoriesLocation) {
        html += categoryList(categories, baseNamespace, categoriesLocation);
    }
    return html;
}


function categoryList(categories: string[], baseNamespace: string, categoriesLocation: WikiLocation): string {
    if (categories.length === 0) {
        return '';
    }
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


export {js, parse};
