const ODD_VALUES: Record<string, number> = {
  '0': 1,
  '1': 0,
  '2': 5,
  '3': 7,
  '4': 9,
  '5': 13,
  '6': 15,
  '7': 17,
  '8': 19,
  '9': 21,
  A: 1,
  B: 0,
  C: 5,
  D: 7,
  E: 9,
  F: 13,
  G: 15,
  H: 17,
  I: 19,
  J: 21,
  K: 2,
  L: 4,
  M: 18,
  N: 20,
  O: 11,
  P: 3,
  Q: 6,
  R: 8,
  S: 12,
  T: 14,
  U: 16,
  V: 10,
  W: 22,
  X: 25,
  Y: 24,
  Z: 23,
}

const EVEN_VALUES: Record<string, number> = Object.fromEntries(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    .split('')
    .map((character, index) => [character, index < 10 ? index : index - 10])
)

const STRUCTURE = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/
const NUMERIC_STRUCTURE = /^[0-9]{6,20}$/
export const NO_CODICE_FISCALE = 'NON DISPONIBILE'

export function normalizeCodiceFiscale(value: string) {
  return value.replace(/\s+/g, '').toUpperCase()
}

export function isCodiceFiscaleFormallyValid(value: string) {
  const codice = normalizeCodiceFiscale(value)
  if (codice === NO_CODICE_FISCALE || NUMERIC_STRUCTURE.test(codice)) return true
  if (!STRUCTURE.test(codice)) return false

  let total = 0
  for (let index = 0; index < 15; index += 1) {
    const character = codice[index]
    total += index % 2 === 0 ? ODD_VALUES[character] : EVEN_VALUES[character]
  }
  return codice[15] === String.fromCharCode(65 + (total % 26))
}
