import * as fs from 'fs';
import * as path from 'path';
import {compareLowerCase} from './utils';
import {WikiLink} from './wikilink';
import {WikiMD, WikiLinkCollectable, ReferenceType} from './markdown';
import {CategoryHandler} from './markdown-magic-handler';
import {WikiConfig, MergedNamespaceConfig} from './wikiconfig';


interface CategoryData {
    category: WikiLink;
    refered: WikiLink[];
}

type CategoryJSON = {
    category: IWikiLink,
    refered: IWikiLink[],
}[];


// 名前空間上のページが参照しているカテゴリを管理する
class CategoriesUnderNamespace {
    public static readonly FILENAME: string = 'categories.json';
    private data: CategoryData[];
    private readonly filepath: string;

    public constructor(private readonly namespace: string) {
        const config: MergedNamespaceConfig = new WikiConfig().getNamespaceConfig(namespace);
        this.filepath = path.join(config.rootDir, CategoriesUnderNamespace.FILENAME);
        if (!fs.existsSync(this.filepath)) {
            this.data = [];
        } else {
            const jsonData: CategoryJSON = JSON.parse(fs.readFileSync(this.filepath, 'utf-8'));
            this.data = jsonData.map(categoryData => ({
                category: new WikiLink(categoryData.category),
                refered: categoryData.refered.map(wikiLink => new WikiLink(wikiLink))
            }));
        }
    }

    private save(): void {
        const jsonData:CategoryJSON = this.data.map(
            categoryData => ({
                category: {
                    namespace: categoryData.category.namespace,
                    type: categoryData.category.type,
                    name: categoryData.category.name
                },
                refered: categoryData.refered.map(
                    wikiLink => ({
                        namespace: wikiLink.namespace,
                        type: wikiLink.type,
                        name: wikiLink.name
                    })
                )
            })
        );
        fs.writeFileSync(this.filepath, JSON.stringify(jsonData, null, 2));
    }

    public refered(category: Category): WikiLink[] {
        const wikiLink: WikiLink = category.toWikiLink();
        const referedWikiLinks: WikiLink[] = [];
        for (const categoryData of this.data) {
            if (!categoryData.category.equals(wikiLink)) {
                continue;
            }
            referedWikiLinks.push(...categoryData.refered);
        }
        return referedWikiLinks;
    }

    public refering(wikiLink: WikiLink): Category[] {
        const referingCategories: Category[] = [];
        for (const categoryData of this.data) {
            let flag: boolean = false;
            for (const referedWikiLink of categoryData.refered) {
                if (!referedWikiLink.equals(wikiLink)) {
                    continue;
                }
                flag = true;
                break;
            }
            if (flag) {
                referingCategories.push(new Category(categoryData.category));
            }
        }
        return referingCategories;
    }

    public update(wikiLink: WikiLink, categories: Category[]): void {
        if (wikiLink.namespace !== this.namespace) {
            throw new Error(`invalid namespace. Expected: ${this.namespace} Received: ${wikiLink.namespace}`);
        }
        for (const categoryData of this.data) {
            categoryData.refered = categoryData.refered.filter(categoryWikiLink => !categoryWikiLink.equals(wikiLink));
        }
        this.data = this.data.filter(categoryData => categoryData.refered.length !== 0);

        for (const category of categories) {
            let exists: boolean = false;
            const categoryWikiLink: WikiLink = category.toWikiLink();
            for (const categoryData of this.data) {
                if (categoryData.category.equals(categoryWikiLink)) {
                    categoryData.refered.push(wikiLink);
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                this.data.push({category: categoryWikiLink, refered: [wikiLink]});
            }
        }
        this.save();
    }

    public getAllReferedCategories(): Category[] {
        const categories: Category[] = [];
        for (const categoryData of this.data) {
            categories.push(new Category(categoryData.category));
        }
        return categories;
    }
}


// カテゴリごとの情報を管理する
class Category {
    private readonly namespace: string;
    private readonly name: string;
    public constructor(link: WikiLink) {
        this.namespace = link.namespace;
        this.name = link.name;
    }

    public get refered(): WikiLink[] {
        const links: WikiLink[] = [];
        const config: WikiConfig = new WikiConfig();
        for (const namespace of config.getNamespaces()) {
            const cun: CategoriesUnderNamespace = new CategoriesUnderNamespace(namespace.id);
            links.push(...cun.refered(this));
        }
        return links;
    }

    public get parents(): Category[] {
        return this.refered.filter(wikiLink => wikiLink.type === 'Category').map(wikiLink => new Category(wikiLink));
    }

    public get children(): Category[] {
        const cun: CategoriesUnderNamespace = new CategoriesUnderNamespace(this.namespace);
        return cun.refering(this.toWikiLink());
    }

    public toWikiLink(): WikiLink {
        return new WikiLink({namespace: this.namespace, type: 'Category', name: this.name});
    }

    public static allUnder(namespace: string): Category[] {
        const categories: Category[] = [];
        const config: WikiConfig = new WikiConfig();
        for (const {id} of config.getNamespaces()) {
            const cun: CategoriesUnderNamespace = new CategoriesUnderNamespace(id);
            for (const category of cun.getAllReferedCategories()) {
                if (category.namespace !== namespace) {
                    continue;
                }

                const categoryWikiLink: WikiLink = category.toWikiLink();
                let flag: boolean = true;
                for (const c of categories) {
                    if (c.toWikiLink().equals(categoryWikiLink)) {
                        flag = false;
                        break;
                    }
                }
                if (!flag) {
                    continue;
                }
                categories.push(category);
            }
        }
        return categories.sort((a, b) => compareLowerCase(a.name, b.name));
    }
}


function extractCategories(baseNamespace: string, markdown: string): Category[] {
    // TODO: WikiMarkdownに書き換え
    const collector = new class implements WikiLinkCollectable {
        private categoryWikiLinks: WikiLink[] = [];

        public addWikiLink(href: string, type: ReferenceType): void {
            if (type !== 'category') {
                return;
            }
            const wikiLink: WikiLink = new WikiLink(href, baseNamespace);
            if (wikiLink.type !== 'Category') {
                return;
            }
            for (const wl of this.categoryWikiLinks) {
                if (wl.equals(wikiLink)) {
                    return;
                }
            }
            this.categoryWikiLinks.push(wikiLink);
        }

        public getCategories(): Category[] {
            return this.categoryWikiLinks.map(wikiLink => new Category(wikiLink));
        }
    }

    const handler: CategoryHandler = new CategoryHandler(
        (path: string) => new WikiLink(path, baseNamespace).type === 'Category'
    );
    handler.setCollector(collector);

    const wikiMD = new WikiMD ({isWikiLink: WikiLink.isWikiLink, toWikiURI: (href: string) => href});
    wikiMD.addMagicHandler(handler);
    wikiMD.setValue(markdown);
    wikiMD.toHTML();
    return collector.getCategories();
}


function updateCategories(wikiLink: WikiLink, categories: Category[]): void {
    const cun: CategoriesUnderNamespace = new CategoriesUnderNamespace(wikiLink.namespace);
    cun.update(wikiLink, categories);
}


export {Category, extractCategories, updateCategories};
