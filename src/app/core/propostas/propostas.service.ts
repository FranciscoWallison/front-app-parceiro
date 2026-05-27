import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../http/api.config';
import {
  CriarPropostaInput,
  MetodoPagamento,
  PropostaDetalhe,
  PropostaResumo,
  StatusProposta,
  TipoDocumento,
  TipoProposta,
} from './propostas.types';

@Injectable({ providedIn: 'root' })
export class PropostasService {
  private readonly http = inject(HttpClient);

  readonly lista = signal<PropostaResumo[]>([]);

  async criar(input: CriarPropostaInput): Promise<PropostaDetalhe> {
    return firstValueFrom(
      this.http.post<PropostaDetalhe>(apiUrl('/propostas'), input),
    );
  }

  async listar(filtro?: {
    status?: StatusProposta;
    tipo?: TipoProposta;
  }): Promise<PropostaResumo[]> {
    const params: Record<string, string> = {};
    if (filtro?.status) params['status'] = filtro.status;
    if (filtro?.tipo) params['tipo'] = filtro.tipo;
    const items = await firstValueFrom(
      this.http.get<PropostaResumo[]>(apiUrl('/propostas'), { params }),
    );
    this.lista.set(items);
    return items;
  }

  async detalhe(id: string): Promise<PropostaDetalhe> {
    return firstValueFrom(
      this.http.get<PropostaDetalhe>(apiUrl(`/propostas/${id}`)),
    );
  }

  async deletar(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(apiUrl(`/propostas/${id}`)));
  }

  async simular(id: string): Promise<PropostaDetalhe> {
    return firstValueFrom(
      this.http.post<PropostaDetalhe>(apiUrl(`/propostas/${id}/simular`), {}),
    );
  }

  async anexarDoc(
    id: string,
    payload: { tipo: TipoDocumento; nomeArquivo: string; tamanhoBytes?: number },
  ): Promise<PropostaDetalhe> {
    return firstValueFrom(
      this.http.post<PropostaDetalhe>(
        apiUrl(`/propostas/${id}/documentos`),
        payload,
      ),
    );
  }

  async concluirDocs(id: string): Promise<PropostaDetalhe> {
    return firstValueFrom(
      this.http.post<PropostaDetalhe>(
        apiUrl(`/propostas/${id}/documentos/concluir`),
        {},
      ),
    );
  }

  async assinar(id: string, assinaturaPngBase64: string): Promise<PropostaDetalhe> {
    return firstValueFrom(
      this.http.post<PropostaDetalhe>(
        apiUrl(`/propostas/${id}/assinatura`),
        { assinaturaPngBase64 },
      ),
    );
  }

  async urlAssinatura(id: string): Promise<{ url: string }> {
    return firstValueFrom(
      this.http.get<{ url: string }>(
        apiUrl(`/propostas/${id}/assinatura/pdf-url`),
      ),
    );
  }

  async gerarPagamento(
    id: string,
    metodo: MetodoPagamento,
  ): Promise<PropostaDetalhe> {
    return firstValueFrom(
      this.http.post<PropostaDetalhe>(
        apiUrl(`/propostas/${id}/pagamento`),
        { metodo },
      ),
    );
  }

  async confirmarPagamento(id: string): Promise<PropostaDetalhe> {
    return firstValueFrom(
      this.http.post<PropostaDetalhe>(
        apiUrl(`/propostas/${id}/pagamento/confirmar`),
        {},
      ),
    );
  }

  async cancelar(id: string): Promise<PropostaDetalhe> {
    return firstValueFrom(
      this.http.post<PropostaDetalhe>(apiUrl(`/propostas/${id}/cancelar`), {}),
    );
  }

  async aprovar(id: string): Promise<PropostaDetalhe> {
    return firstValueFrom(
      this.http.post<PropostaDetalhe>(apiUrl(`/propostas/${id}/aprovar`), {}),
    );
  }

  async recusar(id: string, motivo?: string): Promise<PropostaDetalhe> {
    return firstValueFrom(
      this.http.post<PropostaDetalhe>(apiUrl(`/propostas/${id}/recusar`), {
        motivo,
      }),
    );
  }
}
