/** Mantém só dígitos. */
export function digits(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

/** 12345678909 → 123.456.789-09 */
export function maskCpf(value: string): string {
  const d = digits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** 11222333000181 → 11.222.333/0001-81 */
export function maskCnpj(value: string): string {
  const d = digits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** 01310100 → 01310-100 */
export function maskCep(value: string): string {
  const d = digits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** 11987654321 → (11) 98765-4321 / 1133334444 → (11) 3333-4444 */
export function maskTelefone(value: string): string {
  const d = digits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Valida CPF (algoritmo de dígitos verificadores).
 * Aceita CPF formatado ou só dígitos. Retorna true se válido.
 */
export function isValidCpf(value: string): boolean {
  const d = digits(value);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // todos iguais
  const calcDV = (slice: string, factor: number): number => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
      sum += parseInt(slice[i]!, 10) * (factor - i);
    }
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const dv1 = calcDV(d.slice(0, 9), 10);
  const dv2 = calcDV(d.slice(0, 10), 11);
  return dv1 === parseInt(d[9]!, 10) && dv2 === parseInt(d[10]!, 10);
}

/** Valida CNPJ (algoritmo de dígitos verificadores). */
export function isValidCnpj(value: string): boolean {
  const d = digits(value);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const calcDV = (slice: string, weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
      sum += parseInt(slice[i]!, 10) * weights[i]!;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const dv1 = calcDV(d.slice(0, 12), w1);
  const dv2 = calcDV(d.slice(0, 13), w2);
  return dv1 === parseInt(d[12]!, 10) && dv2 === parseInt(d[13]!, 10);
}

/** Valida CEP (8 dígitos, qualquer combinação numérica). */
export function isValidCep(value: string): boolean {
  return digits(value).length === 8;
}
