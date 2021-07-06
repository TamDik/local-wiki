import {DEFAULT_NAMESPACE} from './wikilink';
import {WikiConfig} from './wikiconfig';

const config: WikiConfig = new WikiConfig();
if (config.getNamespaces().length === 0) {
    config.newNamespace(DEFAULT_NAMESPACE, 'internal', null);
    config.setSideMenu({
        main: [
            {type: 'link', text: 'Main', path: 'Main:Page:Main'},
            {type: 'link', text: 'Special pages', path: 'Special:SpecialPages'},
            {type: 'link', text: 'Upload file', path: 'Special:UploadFile'},
        ],
        sub: [],
    });
}
