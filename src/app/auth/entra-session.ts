import { Injectable, computed, signal } from '@angular/core';
import type { IPublicClientApplication } from '@azure/msal-browser';

export const entraRedirectPath = '/auth/redirect';

type EntraConfig = {
  tenantId: string;
  clientId: string;
  apiClientId: string;
};

type SessionStatus = 'disabled' | 'signedOut' | 'signedIn' | 'unavailable';

const guid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

@Injectable({ providedIn: 'root' })
export class EntraSession {
  private readonly sessionStatus = signal<SessionStatus>('disabled');
  private readonly pending = signal(false);
  private readonly notice = signal<string | null>(null);
  private client?: IPublicClientApplication;
  private scopes: string[] = [];

  readonly status = this.sessionStatus.asReadonly();
  readonly busy = this.pending.asReadonly();
  readonly message = this.notice.asReadonly();
  readonly canAccessRuns = computed(
    () => this.status() === 'disabled' || this.status() === 'signedIn',
  );

  async initialize(): Promise<void> {
    try {
      const response = await fetch('/entra-config.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Entra configuration is unavailable.');
      const {
        tenantId = '',
        clientId = '',
        apiClientId = '',
      } = (await response.json()) as Partial<EntraConfig>;
      if (!tenantId && !clientId && !apiClientId) return;
      if (![tenantId, clientId, apiClientId].every((id) => guid.test(id))) {
        throw new Error('Entra configuration requires three application IDs.');
      }

      const { PublicClientApplication } = await import('@azure/msal-browser');
      const client = new PublicClientApplication({
        auth: {
          clientId,
          authority: `https://login.microsoftonline.com/${tenantId}`,
          redirectUri: window.location.origin + entraRedirectPath,
          postLogoutRedirectUri: window.location.origin + '/',
        },
        cache: { cacheLocation: 'sessionStorage' },
      });
      await client.initialize();
      this.client = client;
      this.scopes = ['runs.read', 'runs.start', 'runs.review'].map(
        (scope) => `api://${apiClientId}/${scope}`,
      );
      const result = await client.handleRedirectPromise().catch(() => {
        this.notice.set(
          'Sign-in could not be completed. Try signing in again.',
        );
        return null;
      });
      if (result?.account) client.setActiveAccount(result.account);
      this.sessionStatus.set(
        client.getActiveAccount() ? 'signedIn' : 'signedOut',
      );
    } catch {
      this.sessionStatus.set('unavailable');
      this.notice.set(
        'Entra sign-in is unavailable. Reload the page to try again.',
      );
    }
  }

  async signIn(): Promise<void> {
    if (!this.client || this.busy()) return;
    this.pending.set(true);
    this.notice.set(null);
    try {
      await this.client.loginRedirect({ scopes: this.scopes });
    } catch {
      this.notice.set('Could not open Entra sign-in. Try again.');
    } finally {
      this.pending.set(false);
    }
  }

  async signOut(): Promise<void> {
    const account = this.client?.getActiveAccount();
    if (!this.client || !account || this.busy()) return;
    this.pending.set(true);
    this.notice.set(null);
    try {
      await this.client.logoutRedirect({ account });
      this.sessionStatus.set('signedOut');
    } catch {
      this.notice.set('Sign-out could not be completed. Try again.');
    } finally {
      this.pending.set(false);
    }
  }

  async accessToken(): Promise<string> {
    const client = this.client;
    const account = client?.getActiveAccount();
    if (!client || !account) throw new Error('Entra sign-in is required.');

    try {
      const result = await client.acquireTokenSilent({
        account,
        scopes: this.scopes,
      });
      return result.accessToken;
    } catch (error) {
      const { InteractionRequiredAuthError } =
        await import('@azure/msal-browser');
      if (error instanceof InteractionRequiredAuthError) {
        client.setActiveAccount(null);
        this.sessionStatus.set('signedOut');
        this.notice.set('Your session needs attention. Sign in again.');
      }
      throw error;
    }
  }
}
