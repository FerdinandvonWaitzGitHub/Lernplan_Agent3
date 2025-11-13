export interface TemplateEntry {
    legal_area?: string;
    sub_area?: string;
    topic_description?: string;
    path?: string[];
    [key: string]: unknown;
}
export interface TemplateList {
    id: string;
    fileName: string;
    absolutePath: string;
    description?: string;
    entries: TemplateEntry[];
    raw: unknown;
}
export interface TemplateSummary {
    id: string;
    fileName: string;
    description?: string;
    entryCount: number;
    preview: TemplateEntry[];
}
export declare class TemplateRegistry {
    private readonly templateDir;
    private readonly templates;
    constructor(templateDir: string);
    hydrate(): Promise<void>;
    private tryHydrateFromDisk;
    private useEmbeddedTemplates;
    private buildTemplateList;
    isEmpty(): boolean;
    getAll(): TemplateList[];
    getById(id: string): TemplateList | undefined;
    getSummaries(previewSize?: number): TemplateSummary[];
}
//# sourceMappingURL=templateRegistry.d.ts.map