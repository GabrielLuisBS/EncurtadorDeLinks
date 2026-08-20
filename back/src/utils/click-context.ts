export type Dispositivo = "mobile" | "desktop" | "tablet" | "outro";

/**
 * Normaliza o User-Agent para um enum pequeno já na escrita do clique,
 * em vez de guardar o UA cru e reinterpretar depois — ver nota "Modelo
 * de Dados" no Obsidian. Classificação simples por regex; não é um
 * parser de UA exaustivo, só o suficiente para as 4 categorias do enum.
 */
export function classifyDevice(userAgent: string | undefined | null): Dispositivo {
  if (!userAgent) return "outro";
  const ua = userAgent.toLowerCase();

  // Checa tablet antes de mobile: Android tablet não inclui "mobile" no
  // UA, Android phone inclui — nessa ordem a distinção funciona.
  if (/ipad|tablet|(?:android(?!.*mobile))/.test(ua)) {
    return "tablet";
  }
  if (/mobile|iphone|ipod|android|blackberry|iemobile|windows phone/.test(ua)) {
    return "mobile";
  }
  if (/windows|macintosh|linux|cros|x11/.test(ua)) {
    return "desktop";
  }
  return "outro";
}

/**
 * País a partir de um header de geolocalização de borda, quando o
 * provedor injeta um. Render não injeta nenhum por padrão — por isso
 * "nem sempre disponível" (ver nota "Registro de Cliques"); os nomes
 * abaixo cobrem os provedores mais comuns caso um CDN entre na frente
 * mais adiante.
 */
export function getCountryFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const candidates = [
    headers["cf-ipcountry"], // Cloudflare
    headers["x-vercel-ip-country"], // Vercel
    headers["x-country-code"],
  ];

  for (const value of candidates) {
    const country = Array.isArray(value) ? value[0] : value;
    if (country && country !== "XX") {
      return country;
    }
  }
  return null;
}

/**
 * Reduz um referer (URL completa) ao hostname, pra usar como dimensão de
 * agregação sem explodir em cardinalidade — cada compartilhamento com um
 * parâmetro de tracking diferente teria uma URL única, mas o mesmo
 * hostname. Usado na agregação diária ([[Agregação Diária]]), não na
 * escrita do clique — `Clique.referer` continua guardando a URL crua.
 * `""` é o sentinela pra "sem referer" (acesso direto) ou referer
 * malformado.
 */
export function normalizeRefererHost(referer: string | null | undefined): string {
  if (!referer) return "";
  try {
    return new URL(referer).hostname;
  } catch {
    return "";
  }
}
