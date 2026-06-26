// Spustí promise na pozadí tak, aby serverless funkcia neukončila request, kým dobehne.
// Na Verceli použije waitUntil (drží funkciu nažive až do maxDuration). Mimo Vercelu
// (lokálny dev) iba fire-and-forget so zachytením chyby.
export function scheduleBackground(promise: Promise<unknown>): void {
  try {
    // Dynamický require, aby build nepadal, keď balík nie je k dispozícii.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { waitUntil } = require("@vercel/functions");
    waitUntil(promise);
  } catch {
    void promise.catch((e) => console.error("background task failed", e));
  }
}
