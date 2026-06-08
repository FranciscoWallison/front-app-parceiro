import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import {
  AudioConfig,
  ResultReason,
  SpeechConfig,
  SpeechRecognitionCanceledEventArgs,
  SpeechRecognitionEventArgs,
  SpeechRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import { Subject, firstValueFrom } from 'rxjs';
import { apiUrl } from '../http/api.config';

interface SpeechTokenResponse {
  token: string;
  region: string;
  endpoint: string | null;
  expiresAt: string;
}

/**
 * STT (Speech-to-Text) via Azure Cognitive Services.
 *
 * Adaptado do projeto chat_IA_audio com 2 mudanças críticas:
 *
 * 1. SEGURANÇA: usa `SpeechConfig.fromAuthorizationToken(token, region)`
 *    em vez de `fromSubscription(key, region)`. O backend NestJS gera um
 *    token Azure efêmero (10min) — a chave nunca toca o cliente. Se o
 *    token vazar, expira sozinho.
 *
 * 2. CACHE: o token recebido é guardado em memória até ~1min antes de
 *    expirar; o próximo `startListening()` reutiliza sem pedir token novo.
 *
 * UX: continuous recognition. O usuário toca para começar e toca de novo
 * para parar. O Azure emite `recognized` quando detecta pausa final — a
 * UI pode usar isso para auto-enviar a mensagem.
 */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly http = inject(HttpClient);
  private recognizer: SpeechRecognizer | null = null;
  private cached: { token: string; region: string; endpoint: string | null; expiresAt: number } | null = null;

  readonly isListening = signal(false);
  readonly partialText = signal('');

  /** Emite texto final reconhecido (cada vez que o usuário fala um trecho completo). */
  readonly transcription$ = new Subject<string>();
  readonly error$ = new Subject<string>();

  async startListening(language = 'pt-BR'): Promise<void> {
    if (this.recognizer) return;

    let config: { token: string; region: string; endpoint: string | null };
    try {
      config = await this.obterToken();
    } catch (err: unknown) {
      this.error$.next(this.amigavel(err, 'Não foi possível autorizar o microfone com o servidor.'));
      return;
    }

    try {
      const speechConfig = config.endpoint
        ? SpeechConfig.fromEndpoint(new URL(config.endpoint))
        : SpeechConfig.fromAuthorizationToken(config.token, config.region);
      // Quando usamos fromEndpoint, a auth ainda usa token:
      speechConfig.authorizationToken = config.token;
      speechConfig.speechRecognitionLanguage = language;

      const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
      this.recognizer = new SpeechRecognizer(speechConfig, audioConfig);

      this.recognizer.recognizing = (_s: unknown, e: SpeechRecognitionEventArgs) => {
        if (e.result.reason === ResultReason.RecognizingSpeech) {
          this.partialText.set(e.result.text);
        }
      };

      this.recognizer.recognized = (_s: unknown, e: SpeechRecognitionEventArgs) => {
        if (e.result.reason === ResultReason.RecognizedSpeech && e.result.text.trim()) {
          this.partialText.set('');
          this.transcription$.next(e.result.text);
        }
      };

      this.recognizer.canceled = (_s: unknown, e: SpeechRecognitionCanceledEventArgs) => {
        const motivo = e.errorDetails || 'cancelado';
        this.error$.next(`Reconhecimento interrompido: ${motivo}`);
        this.stopListening();
      };

      this.recognizer.startContinuousRecognitionAsync(
        () => this.isListening.set(true),
        (err: string) => {
          this.error$.next(`Não foi possível iniciar gravação: ${err}`);
          this.recognizer = null;
        },
      );
    } catch (err: unknown) {
      this.error$.next(this.amigavel(err, 'Falha ao iniciar gravação.'));
      this.recognizer = null;
    }
  }

  stopListening(): void {
    if (!this.recognizer) return;
    const r = this.recognizer;
    this.recognizer = null;
    r.stopContinuousRecognitionAsync(
      () => {
        r.close();
        this.isListening.set(false);
        this.partialText.set('');
      },
      (err: string) => {
        this.error$.next(`Erro ao parar: ${err}`);
        this.isListening.set(false);
        this.partialText.set('');
      },
    );
  }

  private async obterToken(): Promise<{ token: string; region: string; endpoint: string | null }> {
    const now = Date.now();
    if (this.cached && this.cached.expiresAt > now + 60_000) {
      return { token: this.cached.token, region: this.cached.region, endpoint: this.cached.endpoint };
    }
    const resp = await firstValueFrom(
      this.http.post<SpeechTokenResponse>(apiUrl('/ai/speech/token'), {}),
    );
    this.cached = {
      token: resp.token,
      region: resp.region,
      endpoint: resp.endpoint,
      expiresAt: new Date(resp.expiresAt).getTime(),
    };
    return { token: resp.token, region: resp.region, endpoint: resp.endpoint };
  }

  private amigavel(err: unknown, fallback: string): string {
    const e = err as { status?: number; error?: { message?: string }; message?: string };
    if (e?.status === 503) return 'Voz indisponível: configure AZURE_SPEECH_KEY no servidor.';
    if (e?.status === 401 || e?.status === 403) return 'Sessão expirada. Faça login novamente.';
    if (e?.status === 429) return 'Muitas tentativas. Aguarde alguns segundos.';
    return e?.error?.message ?? e?.message ?? fallback;
  }
}
