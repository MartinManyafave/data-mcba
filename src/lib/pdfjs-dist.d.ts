// Minimal type shim for pdfjs-dist v5 (ESM-only, no bundler-mode exports map)
declare module "pdfjs-dist" {
  export const GlobalWorkerOptions: { workerSrc: string };

  export interface TextItem {
    str: string;
    transform: number[]; // [a, b, c, d, x, y]
    width: number;
    height: number;
    hasEOL: boolean;
  }

  export interface TextContent {
    items: (TextItem | object)[];
  }

  export interface PDFPageProxy {
    getTextContent(): Promise<TextContent>;
  }

  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  export function getDocument(src: { data: ArrayBuffer }): PDFDocumentLoadingTask;
}
