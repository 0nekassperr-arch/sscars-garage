# Marketing automático — Apps Script (coste 0 €)

Publica 1 figura al día en Instagram + Threads con caption generado por IA (opcional).

## Setup (una sola vez, ~30 min)

1. **Instagram**: convierte tu cuenta a **Profesional** (ajustes → tipo de cuenta).
   Enlázala a una **página de Facebook** (obligatorio para la API).
2. **App de Meta**: entra en https://developers.facebook.com → *Create app* → tipo **Business**.
   - Añade el producto **Instagram** y conecta tu cuenta.
   - Añade el producto **Threads** (o usa el endpoint de Threads con el mismo token).
   - Permisos: `instagram_basic`, `instagram_content_publish`, `threads` (publish).
3. **Token**: genera un **User Token** con esos permisos y conviértelo a **token largo**
   (o usa *Graph API Explorer*). Copia también el **IG User ID** y el **Threads User ID**.
4. **Pega los valores** en `autopost.gs` → `CONFIG` (IG_USER_ID, IG_ACCESS_TOKEN, THREADS_USER_ID).
5. **(Opcional) Gemini**: crea una API key en https://aistudio.google.com/apikey y pégala
   en `GEMINI_API_KEY` para captions generados por IA. Sin ella, usa captions de plantilla.

## Publicar

1. Ve a https://script.google.com → **Nuevo proyecto** → pega el contenido de `autopost.gs`.
2. Ejecuta `setupTrigger()` una vez (autoriza los permisos cuando los pida).
3. Prueba con `dailyPost()` manualmente antes de dejarlo solo.

## Costes y límites

- Apps Script, Instagram Graph API, Threads API y el tier gratuito de Gemini: **0 €**.
- El disparador diario publica 1 vez/día, ciclando los 15 coches (15 días = vuelta completa).
- Los captions reutilizan las historias que ya tienes en la web: no hay que escribir nada.

## Cuando escale

- Añade **TikTok** (Content Posting API) y **YouTube Shorts** (Data API) como canales extra.
- El vídeo corto (Reels/TikTok) convierte mejor que el post estático: cuando tengas la
  figura física del R34, graba 2-3 Reels y publícalos con el mismo contenido.
- Reinvirtiendo: pon ads solo a los posts que ya funcionan orgánicamente.
