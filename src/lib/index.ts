export { procuraFormSchema, validateProcuraForm, getFieldError, tipoRichiestaEnum } from './schema';
export type { ProcuraFormData, TipoRichiesta } from './schema';

export { resolvePec, isValidSede } from './pecResolver';
export type { PecResolution, PecResolutionResult, PecResolutionError } from './pecResolver';

export { generateSubject, generateBody, generateEmail } from './emailGenerator';
export type { GeneratedEmail } from './emailGenerator';

export { generateProcuraPdf, downloadProcuraPdf, ProcuraDocument } from './pdfGenerator';
