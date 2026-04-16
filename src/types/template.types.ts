export interface ITemplateEngine {
  name: string;
  fileExtension: string;
  compile(source: string): CompiledTemplate;
}

export type CompiledTemplate = (data: Record<string, unknown>) => string;
