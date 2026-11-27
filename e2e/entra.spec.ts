import { expect, test } from '@playwright/test';
import { reviewRun } from './runs.fixture';

const tenantId = '10000000-0000-4000-8000-000000000001';
const clientId = '10000000-0000-4000-8000-000000000002';
const apiClientId = '10000000-0000-4000-8000-000000000003';
const userId = '10000000-0000-4000-8000-000000000004';
const identityOrigin = 'https://login.microsoftonline.com';
const authority = `${identityOrigin}/${tenantId}`;
const oauth = `${authority}/oauth2/v2.0`;
const scopes = ['read', 'start', 'review'].map(
  (scope) => `api://${apiClientId}/runs.${scope}`,
);
const accessToken = 'synthetic-orchestrator-access-token';

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

test('requires sign-in, returns to the requested run and forwards its bearer token', async ({
  page,
}) => {
  await page.route('**/entra-config.json', (route) =>
    route.fulfill({ json: { tenantId, clientId, apiClientId } }),
  );

  let nonce = '';
  await page.route(`${identityOrigin}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/openid-configuration')) {
      await route.fulfill({
        json: {
          issuer: `${authority}/v2.0`,
          authorization_endpoint: `${oauth}/authorize`,
          token_endpoint: `${oauth}/token`,
          end_session_endpoint: `${oauth}/logout`,
        },
        headers: { 'access-control-allow-origin': '*' },
      });
    } else if (url.pathname.endsWith('/authorize')) {
      const params = url.searchParams;
      expect(params.get('client_id')).toBe(clientId);
      expect(params.get('code_challenge_method')).toBe('S256');
      expect(params.get('scope')?.split(' ')).toEqual(
        expect.arrayContaining(scopes),
      );
      nonce = params.get('nonce') ?? '';
      const callback = new URL(params.get('redirect_uri')!);
      expect(callback.pathname).toBe('/auth/redirect');
      callback.hash = new URLSearchParams({
        code: 'synthetic-code',
        state: params.get('state')!,
      }).toString();
      await route.fulfill({
        status: 302,
        headers: { location: callback.href },
      });
    } else if (url.pathname.endsWith('/token')) {
      const now = Math.floor(Date.now() / 1000);
      await route.fulfill({
        json: {
          token_type: 'Bearer',
          scope: scopes.join(' '),
          expires_in: 3600,
          ext_expires_in: 3600,
          access_token: accessToken,
          id_token: [
            encode({ alg: 'RS256', typ: 'JWT' }),
            encode({
              aud: clientId,
              iss: `${authority}/v2.0`,
              oid: userId,
              sub: userId,
              tid: tenantId,
              iat: now,
              exp: now + 3600,
              nonce,
              preferred_username: 'reviewer@example.test',
            }),
            'synthetic-signature',
          ].join('.'),
          client_info: encode({ uid: userId, utid: tenantId }),
        },
        headers: { 'access-control-allow-origin': '*' },
      });
    } else if (url.pathname.endsWith('/logout')) {
      await route.fulfill({
        status: 302,
        headers: {
          location: url.searchParams.get('post_logout_redirect_uri')!,
        },
      });
    } else {
      await route.abort();
    }
  });

  const received: string[] = [];
  await page.route('**/api/v1/runs/**', (route) => {
    received.push(route.request().headers()['authorization'] ?? '');
    return route.fulfill({ json: reviewRun });
  });

  const path = `/runs/${reviewRun.runId}`;
  await page.goto(path);
  const signIn = page.getByRole('button', { name: 'Sign in', exact: true });
  await expect(signIn).toBeVisible();
  expect(received).toEqual([]);

  await signIn.click();
  await expect(page).toHaveURL(new RegExp(path + '$'));
  await expect(page.getByRole('heading', { name: 'DEMO-101' })).toBeVisible();
  expect(received).toEqual([`Bearer ${accessToken}`]);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(signIn).toBeVisible();
  expect(received).toEqual([`Bearer ${accessToken}`]);
});
