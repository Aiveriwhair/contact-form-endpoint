import ejs from 'ejs';
import { ITemplateEngine, CompiledTemplate } from '../../types/template.types';

export class EjsEngine implements ITemplateEngine {
  name = 'ejs';
  fileExtension = '.ejs';

  compile(source: string): CompiledTemplate {
    const compiled = ejs.compile(source);
    return (data: Record<string, unknown>) => compiled(data);
  }
}
