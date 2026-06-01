import { Component, OnInit, inject, signal } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  documentOutline,
  downloadOutline,
  imagesOutline,
  linkOutline,
} from 'ionicons/icons';
import { MateriaisService } from '../../core/materiais/materiais.service';
import { MaterialPromocional } from '../../core/propostas/propostas.types';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-materiais',
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    IonSpinner,
    PageHeaderComponent,
  ],
  templateUrl: './materiais.page.html',
  styleUrls: ['./materiais.page.scss'],
})
export class MateriaisPage implements OnInit {
  private readonly service = inject(MateriaisService);

  loading = signal(true);
  error = signal<string | null>(null);
  notice = signal<string | null>(null);
  materiais = signal<MaterialPromocional[]>([]);

  constructor() {
    addIcons({ documentOutline, imagesOutline, linkOutline, downloadOutline });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.materiais.set(await this.service.listar());
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Falha.');
    } finally {
      this.loading.set(false);
    }
  }

  async download(m: MaterialPromocional): Promise<void> {
    try {
      const res = await this.service.download(m.id);
      this.notice.set(`Mock URL: ${res.url}`);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Falha.');
    }
  }

  iconePara(tipo: MaterialPromocional['tipo']): string {
    return tipo === 'PDF' ? 'document-outline'
         : tipo === 'IMAGEM' ? 'images-outline'
         : 'link-outline';
  }
}
