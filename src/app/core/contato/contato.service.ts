import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../http/api.config';

@Injectable({ providedIn: 'root' })
export class ContatoService {
  private readonly http = inject(HttpClient);

  enviar(assunto: string, mensagem: string): Promise<{ id: string }> {
    return firstValueFrom(
      this.http.post<{ id: string }>(apiUrl('/contato'), { assunto, mensagem }),
    );
  }
}
