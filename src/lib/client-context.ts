export type ClientContext = {
  location: string; // e.g. "Manila, Philippines"
  browser: string;  // e.g. "Chrome on macOS"
};

function parseBrowser(ua: string): string {
  const browser =
    /Edg\//.test(ua)     ? "Edge" :
    /OPR\//.test(ua)     ? "Opera" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Chrome\//.test(ua)  ? "Chrome" :
    /Safari\//.test(ua)  ? "Safari" :
                           "Browser";

  const os =
    /iPhone|iPad|iPod/.test(ua) ? "iOS" :
    /Android/.test(ua)          ? "Android" :
    /Windows NT/.test(ua)       ? "Windows" :
    /Mac OS X/.test(ua)         ? "macOS" :
    /Linux/.test(ua)            ? "Linux" :
                                  "Unknown OS";

  return `${browser} on ${os}`;
}

async function fetchLocation(): Promise<string> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error("geo fetch failed");
    const data = await res.json() as { city?: string; country_name?: string };
    const parts = [data.city, data.country_name].filter(Boolean);
    return parts.length ? parts.join(", ") : "Unknown location";
  } catch {
    return "Unknown location";
  }
}

// Resolves both in parallel; always returns within ~4 s even if geo times out.
export async function getClientContext(): Promise<ClientContext> {
  const [location, browser] = await Promise.all([
    fetchLocation(),
    Promise.resolve(parseBrowser(navigator.userAgent)),
  ]);
  return { location, browser };
}
