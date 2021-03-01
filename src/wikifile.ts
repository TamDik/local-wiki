import {extensionOf} from './utils';

const supportedImage: string[] = ['png', 'jpg', 'jpeg', 'gif'];
const supportedPDF: string[] = ['pdf'];

function fileTypeOf(filename: string): FileType {
    const extension: string = extensionOf(filename).toLowerCase();
    if (supportedImage.includes(extension)) {
        return 'image';
    }
    if (supportedPDF.includes(extension)) {
        return 'pdf';
    }
    return 'other';
}

export {supportedImage, supportedPDF, fileTypeOf};
