// Type definitions for SimpleMDE v1.11.2
// Project: https://github.com/NextStepWebs/simplemde-markdown-editor
// Definitions by: Scalesoft <https://github.com/Scalesoft>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare namespace SimpleMDE {
    interface AutoSaveOptions {
        enabled?: boolean;
        delay?: number;
        uniqueId: string;
    }

    interface BlockStyleOptions {
        bold?: string;
        code?: string;
        italic?: string;
    }

    interface InsertTextOptions {
        horizontalRule?: string[];
        image?: string[];
        link?: string[];
        table?: string[];
    }

    interface ParsingOptions {
        allowAtxHeaderWithoutSpace?: boolean;
        strikethrough?: boolean;
        underscoresBreakWords?: boolean;
    }

    interface RenderingOptions {
        singleLineBreaks?: boolean;
        codeSyntaxHighlighting: boolean;
    }

    // NONE: Keyboard shortcuts で null (unbind) を追加
    interface ShortcutsArray {
        [action: string]: string|null;
        toggleBlockquote?: string|null;
        toggleBold?: string|null;
        cleanBlock?: string|null;
        toggleHeadingSmaller?: string|null;
        toggleItalic?: string|null;
        drawLink?: string|null;
        toggleUnorderedList?: string|null;
        togglePreview?: string|null;
        toggleCodeBlock?: string|null;
        drawImage?: string|null;
        toggleOrderedList?: string|null;
        toggleHeadingBigger?: string|null;
        toggleSideBySide?: string|null;
        toggleFullScreen?: string|null;
    }

    interface StatusBarItem {
        className: string;
        defaultValue: (element: HTMLElement) => void;
        onUpdate: (element: HTMLElement) => void;
    }

    interface ToolbarIcon {
        name: string;
        action: string|((editor: SimpleMDE) => void);
        className: string;
        title: string;
    }

    interface Options {
        autoDownloadFontAwesome?: boolean;
        autofocus?: boolean;
        autosave?: AutoSaveOptions;
        blockStyles?: BlockStyleOptions;
        element?: HTMLElement;
        forceSync?: boolean;
        hideIcons?: string[];
        indentWithTabs?: boolean;
        initialValue?: string;
        insertTexts?: InsertTextOptions;
        lineWrapping?: boolean;
        parsingConfig?: ParsingOptions;
        placeholder?: string;
        previewRender?: (markdownPlaintext: string, previewElement?: HTMLElement) => string;
        promptURLs?: boolean;
        renderingConfig?: RenderingOptions;
        shortcuts?: ShortcutsArray;
        showIcons?: string[];
        spellChecker?: boolean;
        status?: boolean|Array<string|StatusBarItem>;
        styleSelectedText?: boolean;
        tabSize?: number;
        toolbar?: boolean|Array<string|ToolbarIcon>;
        toolbarTips?: boolean;
    }
}

declare class SimpleMDE {
    constructor();
    constructor(options: SimpleMDE.Options);
    value(): string;
    value(val: string): void;
    codemirror: any;
    toTextArea(): void;
    isPreviewActive(): boolean;
    isSideBySideActive(): boolean;
    isFullscreenActive(): boolean;
    clearAutosavedValue(): void;

    static toggleBold: (editor: SimpleMDE) => void;
    static toggleItalic: (editor: SimpleMDE) => void;
    static toggleStrikethrough: (editor: SimpleMDE) => void;
    static toggleHeadingSmaller: (editor: SimpleMDE) => void;
    static toggleHeadingBigger: (editor: SimpleMDE) => void;
    static toggleHeading1: (editor: SimpleMDE) => void;
    static toggleHeading2: (editor: SimpleMDE) => void;
    static toggleHeading3: (editor: SimpleMDE) => void;
    static toggleCodeBlock: (editor: SimpleMDE) => void;
    static toggleBlockquote: (editor: SimpleMDE) => void;
    static toggleUnorderedList: (editor: SimpleMDE) => void;
    static toggleOrderedList: (editor: SimpleMDE) => void;
    static cleanBlock: (editor: SimpleMDE) => void;
    static drawLink: (editor: SimpleMDE) => void;
    static drawImage: (editor: SimpleMDE) => void;
    static drawTable: (editor: SimpleMDE) => void;
    static drawHorizontalRule: (editor: SimpleMDE) => void;
    static togglePreview: (editor: SimpleMDE) => void;
    static toggleSideBySide: (editor: SimpleMDE) => void;
    static toggleFullScreen: (editor: SimpleMDE) => void;
    static undo: (editor: SimpleMDE) => void;
    static redo: (editor: SimpleMDE) => void;
}

export = SimpleMDE;
export as namespace SimpleMDE;
