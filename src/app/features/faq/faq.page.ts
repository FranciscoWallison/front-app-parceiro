import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonAccordion,
  IonAccordionGroup,
  IonContent,
  IonItem,
  IonLabel,
  IonSpinner,
} from '@ionic/angular/standalone';
import { FaqService } from '../../core/faq/faq.service';
import { FaqItem } from '../../core/propostas/propostas.types';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [
    IonContent,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel,
    IonSpinner,
    PageHeaderComponent,
  ],
  templateUrl: './faq.page.html',
  styleUrls: ['./faq.page.scss'],
})
export class FaqPage implements OnInit {
  private readonly service = inject(FaqService);

  loading = signal(true);
  error = signal<string | null>(null);
  items = signal<FaqItem[]>([]);

  categorias = computed(() => {
    const map = new Map<string, FaqItem[]>();
    for (const it of this.items()) {
      if (!map.has(it.categoria)) map.set(it.categoria, []);
      map.get(it.categoria)!.push(it);
    }
    return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
  });

  async ngOnInit(): Promise<void> {
    try {
      this.items.set(await this.service.listar());
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Falha.');
    } finally {
      this.loading.set(false);
    }
  }
}
