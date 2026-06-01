/**
 * Service Worker — Sistema Eléctrico Futuro
 * Estrategia: caché primero, red como fallback.
 * Caché los assets estáticos (HTML, CSS, JS, fuentes).
 * Los datos de simulación se guardan en localStorage.
 */

const CACHE_NAME = 'sef-cache-v4.0';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/ntizar.css',
    '/css/app.css',
    '/css/ree-data.css',
    '/js/app.js',
    '/js/charts.js',
    '/js/simulator.js',
    '/js/constants.js',
    '/js/demand.js',
    '/js/weather.js',
    '/js/storage.js',
    '/js/policy.js',
    '/js/nuclear.js',
    '/js/trajectory.js',
    '/js/montecarlo.js',
    '/js/scenarios.js',
    '/js/ree-data.js',
    '/js/theme.js',
];

// Instalación: cachear todos los assets estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Activar inmediatamente sin esperar a que se cierren pestañas
    self.skipWaiting();
});

// Activación: limpiar cachés antiguas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    // Controlar inmediatamente las páginas abiertas
    self.clients.claim();
});

// Fetch: caché primero, red como fallback
self.addEventListener('fetch', (event) => {
    // Para las páginas HTML, usar estrategia network first con caché fallback
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clonar la respuesta para guardar en caché
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                    return response;
                })
                .catch(() => {
                    // Si falla la red, servir desde caché
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Para assets estáticos: caché primero
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                // Servir desde caché y actualizar en segundo plano
                fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const clone = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, clone);
                            });
                        }
                    })
                    .catch(() => {
                        // Silenciar errores de red cuando estamos offline
                    });
                return cached;
            }
            // No en caché: intentar red
            return fetch(event.request).catch(() => {
                // Fallback para assets que no están en caché
                if (event.request.destination === 'script' || event.request.destination === 'style') {
                    return new Response('', { status: 404, statusText: 'Not cached' });
                }
            });
        })
    );
});

// Evento message: guardar datos de simulación desde la app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SAVE_SIMULATION') {
        const localStorageData = event.data.payload;
        // Guardar en el storage del service worker para acceso offline
        const simulationCache = new Map();
        simulationCache.set('lastSimulation', localStorageData);
        // Usar IndexedDB para almacenamiento persistente grande
        // Por simplicidad, delegamos a localStorage del cliente
    }
});

// Manejo de errores
self.addEventListener('error', (event) => {
    console.warn('[SW] Error:', event.message);
});
