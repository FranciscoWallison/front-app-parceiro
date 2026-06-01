import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // Auth
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'esqueci-senha',
    loadComponent: () =>
      import('./features/auth/esqueci-senha/esqueci-senha.page').then(
        (m) => m.EsqueciSenhaPage,
      ),
  },

  // Home / Dashboard
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },

  // Propostas
  {
    path: 'propostas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/propostas/lista/lista.page').then(
        (m) => m.PropostasListaPage,
      ),
  },
  {
    path: 'propostas/nova-pf',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/propostas/nova-pf/nova-pf.page').then(
        (m) => m.NovaPfPage,
      ),
  },
  {
    path: 'propostas/nova-pme',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/propostas/nova-pme/nova-pme.page').then(
        (m) => m.NovaPmePage,
      ),
  },
  {
    path: 'propostas/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/propostas/detalhe/detalhe.page').then(
        (m) => m.PropostaDetalhePage,
      ),
  },

  // Secundárias
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/perfil/perfil.page').then((m) => m.PerfilPage),
  },
  {
    path: 'materiais',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/materiais/materiais.page').then((m) => m.MateriaisPage),
  },
  {
    path: 'contato',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/contato/contato.page').then((m) => m.ContatoPage),
  },
  {
    path: 'faq',
    canActivate: [authGuard],
    loadComponent: () => import('./features/faq/faq.page').then((m) => m.FaqPage),
  },

  // Chat com IA
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/chat/chat.page').then((m) => m.ChatPage),
  },

  // Admin (operadora simulada)
  {
    path: 'admin/propostas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/propostas-admin.page').then(
        (m) => m.PropostasAdminPage,
      ),
  },

  // Default
  { path: '', redirectTo: 'home', pathMatch: 'full' },
];
