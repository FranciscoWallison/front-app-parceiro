export interface UserProfile {
  id: string;
  cpf: string;
  nome: string;
  email: string;
  corretoraCnpj: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: UserProfile;
}

export interface BiometricCredential {
  credentialId: string;
  deviceId: string;
  deviceName: string | null;
  criadoEm: string;
  ultimoUso: string | null;
}

export interface EnrollResponse {
  credentialId: string;
  biometricToken: string;
}
