import handlebars from 'handlebars';
import { ITemplateEngine, CompiledTemplate } from '../../types/template.types';

export class HandlebarsEngine implements ITemplateEngine {
  name = 'handlebars';
  fileExtension = '.hbs';

  compile(source: string): CompiledTemplate {
    const compiled = handlebars.compile(source);
    return (data: Record<string, unknown>) => compiled(data);
  }
}
