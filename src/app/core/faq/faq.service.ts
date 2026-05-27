import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../http/api.config';
import { FaqItem } from '../propostas/propostas.types';

@Injectable({ providedIn: 'root' })
export class FaqService {
  private readonly http = inject(HttpClient);

  listar(): Promise<FaqItem[]> {
    return firstValueFrom(this.http.get<FaqItem[]>(apiUrl('/faq')));
  }
}
