
export const getInitialPwaProject = (appName: string, packageName: string): Record<string, any> => {
  return {
    'index.html': {
      path: 'index.html',
      language: 'html',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>${appName}</title>
    <link rel="manifest" href="manifest.json">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root { --safe-area-top: 24px; --safe-area-bottom: 34px; }
        body { 
            margin: 0; 
            padding: 0; 
            background: #f8fafc; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            -webkit-tap-highlight-color: transparent; 
            overflow-x: hidden;
        }
        .android-header { padding-top: var(--safe-area-top); background: #3b82f6; color: white; }
        .safe-bottom { padding-bottom: var(--safe-area-bottom); }
    </style>
</head>
<body>
    <div id="app" class="min-h-screen flex flex-col">
        <header class="android-header p-4 shadow-md sticky top-0 z-10">
            <h1 class="text-xl font-bold">${appName}</h1>
        </header>
        <main class="flex-1 p-6 flex flex-col items-center justify-center gap-6">
            <div id="card-welcome" class="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 text-center max-w-sm">
                <div class="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span class="text-3xl">🚀</span>
                </div>
                <h2 class="text-2xl font-black text-slate-800 mb-2">Native Ready</h2>
                <p class="text-slate-500 text-sm leading-relaxed">Your app is powered by Capacitor. You can access the camera, GPS, and more natively.</p>
                <button id="main-btn" class="mt-8 w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all">
                    Explore Features
                </button>
            </div>
        </main>
        <nav class="bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 flex justify-around items-center safe-bottom">
            <button class="text-blue-600 flex flex-col items-center gap-1">
                <div class="w-6 h-6 bg-blue-600 rounded-lg"></div>
                <span class="text-[10px] font-bold">Home</span>
            </button>
            <button class="text-slate-300 flex flex-col items-center gap-1">
                <div class="w-6 h-6 bg-slate-200 rounded-lg"></div>
                <span class="text-[10px]">Vault</span>
            </button>
        </nav>
    </div>
    <script src="app.js"></script>
</body>
</html>`,
      lastModified: Date.now()
    },
    'app.js': {
      path: 'app.js',
      language: 'javascript',
      content: `// App Logic & Navigation
document.getElementById('main-btn')?.addEventListener('click', function() {
    var main = document.querySelector('main');
    if (!main) return;
    
    // Toggle between welcome view and features view
    var featuresView = document.getElementById('features-view');
    var welcomeCard = document.getElementById('card-welcome');
    
    if (featuresView) {
        featuresView.remove();
        if (welcomeCard) welcomeCard.style.display = '';
        return;
    }
    
    if (welcomeCard) welcomeCard.style.display = 'none';
    
    var features = document.createElement('div');
    features.id = 'features-view';
    features.className = 'w-full max-w-sm space-y-4 animate-in';
    features.innerHTML = '<h2 class="text-xl font-black text-slate-800 mb-4">App Features</h2>' +
        '<div class="bg-white p-4 rounded-2xl shadow border border-slate-100 flex items-center gap-4">' +
            '<div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">📷</div>' +
            '<div><p class="font-bold text-slate-800">Camera Access</p><p class="text-xs text-slate-500">Capture photos natively</p></div>' +
        '</div>' +
        '<div class="bg-white p-4 rounded-2xl shadow border border-slate-100 flex items-center gap-4">' +
            '<div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl">📍</div>' +
            '<div><p class="font-bold text-slate-800">GPS Location</p><p class="text-xs text-slate-500">Access device location</p></div>' +
        '</div>' +
        '<div class="bg-white p-4 rounded-2xl shadow border border-slate-100 flex items-center gap-4">' +
            '<div class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl">🔔</div>' +
            '<div><p class="font-bold text-slate-800">Push Notifications</p><p class="text-xs text-slate-500">Engage users with alerts</p></div>' +
        '</div>' +
        '<button id="back-btn" class="w-full bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold mt-4 active:scale-95 transition-all">← Back to Home</button>';
    
    main.appendChild(features);
    
    // Use event delegation on features container to avoid listener leaks
    features.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'back-btn') {
            features.remove();
            if (welcomeCard) welcomeCard.style.display = '';
        }
    });
});

console.log('DroidCraft App Loaded');`,
      lastModified: Date.now()
    },
    'capacitor.config.json': {
      path: 'capacitor.config.json',
      language: 'json',
      content: `{
  "appId": "${packageName}",
  "appName": "${appName}",
  "webDir": "www",
  "bundledWebRuntime": false,
  "server": {
    "androidScheme": "https"
  }
}`,
      lastModified: Date.now()
    },
    'manifest.json': {
      path: 'manifest.json',
      language: 'json',
      content: `{
  "name": "${appName}",
  "short_name": "${appName}",
  "start_url": "index.html",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6"
}`,
      lastModified: Date.now()
    }
  };
};
