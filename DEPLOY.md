# 🚀 Guía de Despliegue de Migui IA

## Resumen

Tu app ahora tiene:
- **Frontend**: HTML/CSS/JS (se despliega en Netlify GRATIS)
- **Backend**: Node.js/Express (se despliega en Render GRATIS)

---

## Paso 1: Crear cuenta en GitHub (si no tienes)

1. Ve a https://github.com
2. Crea una cuenta gratuita
3. Crea un nuevo repositorio llamado `migui-ia`

---

## Paso 2: Subir tu código a GitHub

Abre una terminal en la carpeta `ShadowIA` y ejecuta:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/migui-ia.git
git push -u origin main
```

⚠️ **IMPORTANTE**: El archivo `.env` NO se subirá porque está en `.gitignore`

---

## Paso 3: Desplegar Backend en Render (GRATIS)

1. Ve a https://render.com y crea cuenta con GitHub
2. Click en "New" → "Web Service"
3. Conecta tu repositorio `migui-ia`
4. Configura:
   - **Name**: `migui-ia-backend`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

5. En **Environment Variables**, añade:
   - `GROQ_API_KEY_1` = tu primera key
   - `GROQ_API_KEY_2` = tu segunda key
   - `CREATOR_IP` = tu IP (79.117.235.136)
   - `FRONTEND_URL` = (lo añadirás después)

6. Click "Create Web Service"

Tu backend estará en: `https://migui-ia-backend.onrender.com`

---

## Paso 4: Desplegar Frontend en Netlify (GRATIS)

1. Ve a https://netlify.com y crea cuenta con GitHub
2. Click en "Add new site" → "Import an existing project"
3. Conecta tu repositorio `migui-ia`
4. Configura:
   - **Base directory**: (dejar vacío)
   - **Publish directory**: (dejar vacío o `.`)
   - **Build command**: (dejar vacío)

5. Click "Deploy site"

Tu frontend estará en algo como: `https://migui-ia.netlify.app`

---

## Paso 5: Conectar Frontend con Backend

1. Abre `js/modules/AIEngine.js`
2. Busca la función `getBackendUrl()` 
3. Cambia la línea del else:
   ```javascript
   return window.BACKEND_URL || 'https://migui-ia-backend.onrender.com/api';
   ```

4. Guarda, commit y push:
   ```bash
   git add .
   git commit -m "Connect to production backend"
   git push
   ```

5. En Render, añade la variable:
   - `FRONTEND_URL` = `https://migui-ia.netlify.app`

---

## Paso 6: Configurar Google OAuth

1. Ve a https://console.cloud.google.com
2. Busca tu proyecto de OAuth
3. En "Authorized JavaScript origins" añade:
   - `https://migui-ia.netlify.app`
4. En "Authorized redirect URIs" añade:
   - `https://migui-ia.netlify.app`

---

## 🎉 ¡Listo!

Tu app estará disponible en: `https://migui-ia.netlify.app`

### Notas:
- El plan gratuito de Render "duerme" después de 15 min de inactividad
- La primera petición después de dormir tarda ~30 segundos
- Para evitar esto, puedes usar UptimeRobot (gratis) para hacer ping cada 14 min

---

## Dominio Personalizado (Opcional y Gratis)

Si quieres un dominio tipo `migui.ml`:
1. Los dominios `.ml`, `.tk` ya no son gratis (Freenom cerró)
2. Opciones gratuitas:
   - Usar el subdominio de Netlify: `tu-nombre.netlify.app`
   - https://freedns.afraid.org - subdominios gratis
   - https://noip.com - subdominios gratis

Para un dominio `.com` o `.es` necesitas pagar (~10€/año)
