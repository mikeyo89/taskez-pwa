export type Auth0Config = {
  domain: string;
  clientId: string;
  audience?: string;
  appUrl: string;
};

const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN ?? '';
const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID ?? '';
const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE ?? '';
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

if (!domain) {
  throw new Error('Missing Auth0 domain configuration');
}

if (!clientId) {
  throw new Error('Missing Auth0 client id configuration');
}

export const auth0Config: Auth0Config = {
  domain,
  clientId,
  audience: audience || undefined,
  appUrl
};
