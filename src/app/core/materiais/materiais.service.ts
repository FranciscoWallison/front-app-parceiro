import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../http/api.config';
import { MaterialPromocional } from '../propostas/propostas.types';

@Injectable({ providedIn: 'root' })
export class MateriaisService {
  private readonly http = inject(HttpClient);

  listar(): Promise<MaterialPromocional[]> {
    return firstValueFrom(
      this.http.get<MaterialPromocional[]>(apiUrl('/materiais')),
    );
  }

  download(id: string): Promise<{ id: string; titulo: string; url: string }> {
    return firstValueFrom(
      this.http.get<{ id: string; titulo: string; url: string }>(
        apiUrl(`/materiais/${id}/download`),
      ),
    );
  }
}
