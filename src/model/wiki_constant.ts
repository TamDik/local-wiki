type EditableTextType = 'Main' | 'Template';
type EditableFileType = 'File';
type EditableType = EditableTextType | EditableFileType;
type WikiType = EditableType | 'Special';

const DEFAULT_NS: string = 'Wiki';


export {EditableType, EditableTextType, EditableFileType, WikiType, DEFAULT_NS} 
