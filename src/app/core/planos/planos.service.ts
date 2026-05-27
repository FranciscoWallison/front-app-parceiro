import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../http/api.config';
import { Plano } from '../propostas/propostas.types';

@Injectable({ providedIn: 'root' })
export class PlanosService {
  private readonly http = inject(HttpClient);

  listar(): Promise<Plano[]> {
    return firstValueFrom(this.http.get<Plano[]>(apiUrl('/planos')));
  }
}
