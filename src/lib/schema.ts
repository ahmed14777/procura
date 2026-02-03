import { z } from 'zod';

/**
 * Zod validation schema for the Procura form
 * Validates all client data before processing
 */

// Tipo richiesta enum
export const tipoRichiestaEnum = z.enum(['asilo', 'accesso']);
export type TipoRichiesta = z.infer<typeof tipoRichiestaEnum>;

// Main form schema
export const procuraFormSchema = z.object({
  // Client personal data
  nome: z
    .string()
    .min(1, 'Il nome è obbligatorio')
    .min(2, 'Il nome deve avere almeno 2 caratteri')
    .max(50, 'Il nome non può superare 50 caratteri')
    .regex(/^[a-zA-ZàèéìòùÀÈÉÌÒÙ\s'-]+$/, 'Il nome contiene caratteri non validi'),
  
  cognome: z
    .string()
    .min(1, 'Il cognome è obbligatorio')
    .min(2, 'Il cognome deve avere almeno 2 caratteri')
    .max(50, 'Il cognome non può superare 50 caratteri')
    .regex(/^[a-zA-ZàèéìòùÀÈÉÌÒÙ\s'-]+$/, 'Il cognome contiene caratteri non validi'),
  
  dataNascita: z
    .string()
    .min(1, 'La data di nascita è obbligatoria')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data non valido')
    .refine((date) => {
      const parsed = new Date(date);
      const now = new Date();
      return parsed < now;
    }, 'La data di nascita deve essere nel passato')
    .refine((date) => {
      const parsed = new Date(date);
      const minDate = new Date('1900-01-01');
      return parsed > minDate;
    }, 'La data di nascita non è valida'),
  
  luogoNascita: z
    .string()
    .min(1, 'Il luogo di nascita è obbligatorio')
    .min(2, 'Il luogo di nascita deve avere almeno 2 caratteri')
    .max(100, 'Il luogo di nascita non può superare 100 caratteri'),
  
  codiceFiscale: z
    .string()
    .min(1, 'Il codice fiscale è obbligatorio')
    .length(16, 'Il codice fiscale deve essere di 16 caratteri')
    .regex(
      /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i,
      'Il codice fiscale non è valido'
    )
    .transform((val) => val.toUpperCase()),
  
  // Optional Vestanet number
  numeroVestanet: z
    .string()
    .max(20, 'Il numero Vestanet non può superare 20 caratteri')
    .regex(/^[0-9]*$/, 'Il numero Vestanet deve contenere solo cifre')
    .optional()
    .or(z.literal('')),
  
  // Selected location (must be from official list)
  sedeSelezionata: z
    .string()
    .min(1, 'La sede è obbligatoria'),
  
  // Request type
  tipoRichiesta: tipoRichiestaEnum,
});

export type ProcuraFormData = z.infer<typeof procuraFormSchema>;

// Helper function to validate form data
export function validateProcuraForm(data: unknown): { 
  success: boolean; 
  data?: ProcuraFormData; 
  errors?: z.ZodError['errors'];
} {
  const result = procuraFormSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error.errors };
}

// Helper to get error message for a field
export function getFieldError(
  errors: z.ZodError['errors'] | undefined,
  fieldName: string
): string | undefined {
  if (!errors) return undefined;
  const error = errors.find((e) => e.path[0] === fieldName);
  return error?.message;
}
