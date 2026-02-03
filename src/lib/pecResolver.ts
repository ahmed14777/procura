import { getSedeById, type SedeSelezionabile } from '@/data/commissioni';

/**
 * PEC Resolver Module
 * 
 * Resolves the correct PEC address and competent commission
 * based on the selected official location.
 * 
 * This module only uses the official dataset and does not
 * attempt to guess or infer information beyond what is provided.
 */

export interface PecResolutionResult {
  success: true;
  pec: string;
  commissione: string;
  motivoSelezione: string;
  sede: SedeSelezionabile;
}

export interface PecResolutionError {
  success: false;
  error: string;
}

export type PecResolution = PecResolutionResult | PecResolutionError;

/**
 * Resolves the PEC address for a given sede ID
 * 
 * @param sedeId - The ID of the selected sede from the official list
 * @returns PecResolution with either the resolved PEC data or an error
 */
export function resolvePec(sedeId: string): PecResolution {
  // Validate input
  if (!sedeId || sedeId.trim() === '') {
    return {
      success: false,
      error: 'Nessuna sede selezionata.',
    };
  }

  // Look up the sede in the official dataset
  const sede = getSedeById(sedeId);

  if (!sede) {
    return {
      success: false,
      error: 'Non è disponibile un indirizzo PEC per questo luogo. Verifica manualmente.',
    };
  }

  // Generate the reason for selection
  const motivoSelezione = generateMotivoSelezione(sede);

  return {
    success: true,
    pec: sede.pec,
    commissione: sede.commissioneCompetente,
    motivoSelezione,
    sede,
  };
}

/**
 * Generates the appropriate reason text for PEC selection
 * 
 * @param sede - The resolved sede
 * @returns The formatted reason string
 */
function generateMotivoSelezione(sede: SedeSelezionabile): string {
  if (sede.motivoSelezione === 'coincidenza') {
    return 'PEC selezionata perché la sede coincide con la città indicata.';
  }
  
  return `PEC selezionata perché la sede indicata è di competenza della Commissione territoriale di ${sede.commissioneCompetente}.`;
}

/**
 * Checks if a sede ID exists in the official dataset
 * 
 * @param sedeId - The ID to check
 * @returns true if the sede exists
 */
export function isValidSede(sedeId: string): boolean {
  return getSedeById(sedeId) !== undefined;
}
