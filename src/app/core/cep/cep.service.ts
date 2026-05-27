import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { digits } from '../../shared/masks/format.utils';

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean | string;
}

export interface CepResolvido {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento?: string;
}

@Injectable({ providedIn: 'root' })
export class CepService {
  private readonly http = inject(HttpClient);

  /**
   * Busca dados de endereço na API pública do ViaCEP.
   * Retorna null se CEP não tiver 8 dígitos ou não for encontrado.
   */
  async buscar(cep: string): Promise<CepResolvido | null> {
    const d = digits(cep);
    if (d.length !== 8) return null;
    try {
      const res = await firstValueFrom(
        this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${d}/json/`),
      );
      if (!res || res.erro) return null;
      return {
        cep: d,
        logradouro: res.logradouro,
        bairro: res.bairro,
        cidade: res.localidade,
        uf: res.uf,
        complemento: res.complemento || undefined,
      };
    } catch {
      return null;
    }
  }
}
