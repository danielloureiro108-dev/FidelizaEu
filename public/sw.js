const CACHE_NAME = "fidelizaeu-v1";
const OFFLINE_URL = "/login";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Network-first: sempre busca a versão mais recente; cai para o cache
// (e por fim para a página de login) só quando o dispositivo está offline.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // /auth/* é sempre o alvo de um redirect vindo de outra origem (o
  // /verify do Supabase, no fluxo de recuperação de senha/confirmação de
  // cadastro). Interceptar essa navegação e refazer o fetch por dentro do
  // service worker é uma combinação conhecida por quebrar silenciosamente
  // em navegadores baseados em WebKit — deixa passar direto pra rede.
  if (url.pathname.startsWith("/auth/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached ?? caches.match(OFFLINE_URL);
      })
  );
});
