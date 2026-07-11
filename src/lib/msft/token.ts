// Client-credentials token acquisition for Microsoft services (service principal).

export async function getServiceToken(opts: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  scope: string; // e.g. "https://analysis.windows.net/powerbi/api/.default" or "https://graph.microsoft.com/.default"
}): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${opts.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
        scope: opts.scope,
      }),
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}
