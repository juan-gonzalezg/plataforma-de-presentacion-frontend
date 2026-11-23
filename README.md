# 🎭 Plataforma de Presentaciones Interactivas — Frontend

Interfaz web para la plataforma de presentaciones interactivas con asistente IA integrado, notas vivas y modo de estudio con recuperación aumentada (RAG).

🌐 **Demo en producción:** [plataforma-de-presentaciones.vercel.app](https://plataforma-de-presentaciones.vercel.app/)  
🔗 **Repositorio Backend:** [plataforma-de-presentacion-backend](https://github.com/juan-gonzalezg/plataforma-de-presentacion-backend)

---

## ✨ Características Principales

- **🎬 Modo Presentación Cinematográfico:** Diapositivas interactivas con navegación por teclado (`←`/`→`, `Espacio`), carrusel de miniaturas y foco dinámico.
- **🤖 Asistente IA ("Duda al Vuelo" y Robot):** Respuestas técnicas en tiempo real citando secciones oficiales del documento base.
- **📖 Modo Estudio / Notebook:** Panel dividido con texto base, notas vivas, visor PDF con resaltado inteligente (*Smart Highlight*) y chat RAG.
- **💾 Persistencia Inteligente:** Autoguardado local en `localStorage` con botón de *"Reanudar sesión guardada"* para continuar en la lámina exacta desde el Home.
- **📶 Modo Offline / PWA:** Service Worker y Cache API (`presentacion-api-v1`) para preparar y consultar módulos sin conexión a internet.
- **♿ Accesibilidad y Contraste:** Modos Cinema Dark, Proyector Alto Contraste y Clean Light, con ajuste tipográfico global.
- **🧭 Tutoriales Guiados:** Recorridos interactivos paso a paso (`?` o botón Tutorial) en cada vista.

---

## 🛠️ Stack Tecnológico

- **Framework:** React 19 + TypeScript
- **Bundler:** Vite
- **Estilos:** Tailwind CSS
- **Estado Global:** Zustand con middleware `persist` seguro
- **Visor PDF:** `react-pdf`
- **Iconografía:** Lucide React

---

## 🚀 Instalación y Desarrollo Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/juan-gonzalezg/plataforma-de-presentacion-frontend.git
   cd plataforma-de-presentacion-frontend
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Variables de entorno:**
   Copia el archivo `.env.example` a `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```

5. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## 📦 Repositorios del Proyecto

| Componente | Repositorio | Despliegue |
| :--- | :--- | :--- |
| **Frontend** | [plataforma-de-presentacion-frontend](https://github.com/juan-gonzalezg/plataforma-de-presentacion-frontend) | Vercel |
| **Backend** | [plataforma-de-presentacion-backend](https://github.com/juan-gonzalezg/plataforma-de-presentacion-backend) | FastAPI / Local / Cloud |
