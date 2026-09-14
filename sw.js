const cachePrefix = `aftercredits:${self.registration.scope}:`;
const cacheName = `${cachePrefix}v5`;
const shellFiles = [
    "./",
    "index.html",
    "style.css",
    "movies.js",
    "script.js",
    "manifest.webmanifest",
    "icons/icon.svg",
    "icons/icon-192.png",
    "icons/icon-512.png",
];
const shellURLs = shellFiles.map((path) => new URL(path, self.registration.scope).href);

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const responses = await Promise.all(
                shellURLs.map(async (url) => {
                    const response = await fetch(url, {
                        cache: "reload",
                        credentials: "same-origin",
                    });
                    if (!response.ok || response.redirected || response.type === "opaque") {
                        throw new Error("The app could not be saved for offline use.");
                    }
                    const type = response.headers.get("content-type") || "";
                    if (
                        (url.endsWith(".js") && !/javascript/.test(type)) ||
                        (url.endsWith(".css") && !type.includes("text/css"))
                    ) {
                        throw new Error("An app file was unavailable.");
                    }
                    return response;
                }),
            );
            const cache = await caches.open(cacheName);
            await Promise.all(shellURLs.map((url, index) => cache.put(url, responses[index])));
        })(),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const names = await caches.keys();
            await Promise.all(
                names
                    .filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
                    .map((name) => caches.delete(name)),
            );
            await self.clients.claim();
        })(),
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== self.location.origin) return;
    const navigation = request.mode === "navigate" && url.href.startsWith(self.registration.scope);
    if (!navigation && !shellURLs.includes(url.href)) return;
    event.respondWith(
        (async () => {
            const cache = await caches.open(cacheName);
            const cached = await cache.match(
                navigation ? new URL("index.html", self.registration.scope).href : url.href,
            );
            return cached || fetch(request);
        })(),
    );
});
