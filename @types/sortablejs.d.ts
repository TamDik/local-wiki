declare class Sortable {
    public options: Sortable.Options;
    public el: HTMLElement;

    static create(element: HTMLElement, options?: Sortable.Options): Sortable;

    toArray(): string[];
}


declare namespace Sortable {
    export interface Options {
        group?: string|GroupOptions;
        ghostClass?: string;
        handle?: string;
        animation?: number;
        fallbackOnBody?: boolean;
        sort?: boolean;
        swapThreshold?: number;
        onAdd?: (event: SortableEvent) => void;
        onClone?: (event: SortableEvent) => void;
        filter?:
           | string
           | ((this: Sortable, event: Event | TouchEvent, target: HTMLElement, sortable: Sortable) => boolean);
    }

    export interface SortableEvent extends Event {
        clone: HTMLElement;
        item: HTMLElement;
    }

    type PullResult = ReadonlyArray<string> | boolean | 'clone';
    type PutResult = ReadonlyArray<string> | boolean;
    export interface GroupOptions {
        name: string;
        pull?: PullResult | ((to: Sortable, from: Sortable, dragEl: HTMLElement, event: SortableEvent) => PullResult);
        put?: PutResult | ((to: Sortable, from: Sortable, dragEl: HTMLElement, event: SortableEvent) => PutResult);
    }
}
