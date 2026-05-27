import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { apiUrl } from '../http/api.config';
import {
  PropostaDetalhe,
  TipoDocumento,
} from '../propostas/propostas.types';

const MAX_BYTES = 500_000; // 500 KB
const MAX_DIMENSION = 1600;

@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private readonly http = inject(HttpClient);

  /**
   * Abre câmera/galeria, retorna data URI da foto.
   * Em browser web fallback para input file.
   */
  async capturar(): Promise<{ dataUrl: string; format: string }> {
    if (Capacitor.isNativePlatform()) {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        promptLabelHeader: 'Anexar documento',
        promptLabelPhoto: 'Da galeria',
        promptLabelPicture: 'Tirar foto',
      });
      return { dataUrl: photo.dataUrl ?? '', format: photo.format ?? 'jpeg' };
    }
    return this.fallbackPickFile();
  }

  /**
   * Comprime imagem até ficar abaixo de MAX_BYTES usando Canvas API.
   * Estratégia: redimensiona para até MAX_DIMENSION e diminui qualidade.
   */
  async comprimir(dataUrl: string): Promise<Blob> {
    const img = await this.loadImage(dataUrl);
    const { canvas, ctx } = this.scaleToCanvas(img);
    if (!ctx) throw new Error('Canvas 2D não suportado.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = 0.85;
    let blob = await this.canvasToBlob(canvas, quality);
    while (blob.size > MAX_BYTES && quality > 0.3) {
      quality -= 0.15;
      blob = await this.canvasToBlob(canvas, quality);
    }
    return blob;
  }

  async upload(
    propostaId: string,
    tipo: TipoDocumento,
    blob: Blob,
    nomeArquivo: string,
  ): Promise<PropostaDetalhe> {
    const form = new FormData();
    form.append('tipo', tipo);
    form.append('arquivo', blob, nomeArquivo);
    return firstValueFrom(
      this.http.post<PropostaDetalhe>(
        apiUrl(`/propostas/${propostaId}/documentos`),
        form,
      ),
    );
  }

  async urlPresigned(
    propostaId: string,
    docId: string,
  ): Promise<{ url: string }> {
    return firstValueFrom(
      this.http.get<{ url: string }>(
        apiUrl(`/propostas/${propostaId}/documentos/${docId}/url`),
      ),
    );
  }

  // ---- helpers ----

  private fallbackPickFile(): Promise<{ dataUrl: string; format: string }> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f) return reject(new Error('Nenhum arquivo escolhido.'));
        const reader = new FileReader();
        reader.onload = () =>
          resolve({
            dataUrl: reader.result as string,
            format: f.type.replace('image/', '') || 'jpeg',
          });
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(f);
      };
      input.click();
    });
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = dataUrl;
    });
  }

  private scaleToCanvas(img: HTMLImageElement): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;
  } {
    let { width, height } = img;
    if (Math.max(width, height) > MAX_DIMENSION) {
      const ratio = MAX_DIMENSION / Math.max(width, height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return { canvas, ctx: canvas.getContext('2d') };
  }

  private canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar blob.'))),
        'image/jpeg',
        quality,
      );
    });
  }
}
