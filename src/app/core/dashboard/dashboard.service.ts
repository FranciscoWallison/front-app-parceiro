import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../http/api.config';
import { DashboardData } from '../propostas/propostas.types';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  get(): Promise<DashboardData> {
    return firstValueFrom(this.http.get<DashboardData>(apiUrl('/dashboard')));
  }
}
