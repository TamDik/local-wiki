import {ContentBody} from './content-body';
import {NewNamespaceBody} from './special-body';


class NotFoundNamespaceBody extends ContentBody {
    public get html(): string {
        const href: string = NewNamespaceBody.createURI(this.wikiLink.namespace);
        const lines: string[] = [
            '<div class="alert alert-warning" role="alert">',
              'The namespace you are looking for doesn\'t exist or an other error occurred.<br>',
              `Choose a new direction, or you can <a href="${href}">create this namespace.</a>`,
            '</div>',
        ];
        return lines.join('');
    }
}

export {NotFoundNamespaceBody};
