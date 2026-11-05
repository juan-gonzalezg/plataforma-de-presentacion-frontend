import { create } from 'zustand';
import { apiUrl } from '../lib/apiBase';
import { 
  AppView, 
  ContrastMode, 
  FontSizeSetting, 
  RobotMood, 
  TopicMetadata, 
  TopicDetail, 
  StickyNote, 
  ChatMessage, 
  QueryResponse,
  DownloadResponse,
  HighlightBbox,
  ChatSource,
  LlmStatus,
  WebResult
} from '../types';

interface PresentationStore {
  // Navegación y Vistas
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Temas y Diapositivas
  topics: TopicMetadata[];
  selectedTopic: TopicDetail | null;
  currentSlideIndex: number;
  isLoadingTopics: boolean;
  isLoadingTopicDetail: boolean;

  // Paneles y Modales
  isDrawerOpen: boolean;
  isSpotlightOpen: boolean;
  isSessionLogOpen: boolean;

  // Asistente Robot
  robotMood: RobotMood;
  robotSpeechBubble: string | null;

  // Smart Highlight
  activeHighlightBlockId: string | null;
  // Smart Highlight sobre PDF (cuando el módulo no tiene notes_markdown)
  activeHighlightPage: number | null;
  activeHighlightBbox: HighlightBbox | null;

  // Sticky Notes y Chat
  stickyNotes: StickyNote[];
  chatMessages: ChatMessage[];
  sessionHistory: QueryResponse[];
  latestChatSources: ChatSource[];
  llmStatus: LlmStatus | null;

  // Resiliencia y Accesibilidad
  isSearching: boolean;
  searchErrorToast: string | null;
  contrastMode: ContrastMode;
  fontSize: FontSizeSetting;

  // Acciones
  loadTopics: () => Promise<void>;
  refreshTopics: () => Promise<void>;
  selectTopic: (topicId: string) => Promise<void>;
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (index: number) => void;
  toggleDrawer: () => void;
  setDrawerOpen: (open: boolean) => void;
  toggleSpotlight: () => void;
  setSpotlightOpen: (open: boolean) => void;
  toggleSessionLog: () => void;
  setRobotMood: (mood: RobotMood, durationMs?: number) => void;
  setRobotSpeech: (speech: string | null, durationMs?: number) => void;
  setActiveHighlightBlockId: (id: string | null) => void;
  setActiveHighlightPdfTarget: (page: number | null, bbox: HighlightBbox | null) => void;
  askQuestion: (query: string) => Promise<QueryResponse | null>;
  addStickyNote: (note: StickyNote) => void;
  removeStickyNote: (id: string) => void;
  sendChatMessage: (text: string) => Promise<void>;
  stopChatStream: () => void;
  loadLlmStatus: () => Promise<void>;
  setContrastMode: (mode: ContrastMode) => void;
  setFontSize: (size: FontSizeSetting) => void;
  clearSearchError: () => void;
  downloadTopicMaterial: (topicId: string, tipo?: 'pdf' | 'pptx') => Promise<DownloadResponse | null>;
  fetchPdfViewUrl: (topicId: string) => Promise<string | null>;
}

// Controlador del stream SSE activo (permite detener la generación del LLM).
let chatAbortController: AbortController | null = null;

type ChatStreamEvent =
  | { type: 'sources'; mode?: 'llm' | 'extractive'; sources?: ChatSource[] }
  | { type: 'delta'; text?: string }
  | { type: 'notice'; message?: string }
  | { type: 'error'; message?: string }
  | {
      type: 'done';
      mode?: 'llm' | 'extractive';
      citations?: string[];
      sources?: ChatSource[];
      confidence?: number;
      latency_ms?: number;
      web_results?: WebResult[];
      web_provider?: string;
      web_error?: string;
    };

export const usePresentationStore = create<PresentationStore>((set, get) => ({
  currentView: 'home',
  setCurrentView: (view) => set({ currentView: view }),

  topics: [],
  selectedTopic: null,
  currentSlideIndex: 0,
  isLoadingTopics: false,
  isLoadingTopicDetail: false,

  isDrawerOpen: false,
  isSpotlightOpen: false,
  isSessionLogOpen: false,

  robotMood: 'idle_atento',
  robotSpeechBubble: '¡Hola! Selecciona un módulo para comenzar la sesión.',

  activeHighlightBlockId: null,
  activeHighlightPage: null,
  activeHighlightBbox: null,

  stickyNotes: [],
  chatMessages: [],
  sessionHistory: [],
  latestChatSources: [],
  llmStatus: null,

  isSearching: false,
  searchErrorToast: null,
  contrastMode: 'cinema-dark',
  fontSize: 'normal',

  loadTopics: async () => {
    set({ isLoadingTopics: true });
    try {
      const res = await fetch(apiUrl('/api/topics'));
      if (res.ok) {
        const data = await res.json();
        set({ topics: data.topics || [] });
      }
    } catch (err) {
      console.error('Error cargando temas:', err);
    } finally {
      set({ isLoadingTopics: false });
    }
  },

  refreshTopics: async () => {
    set({ isLoadingTopics: true });
    try {
      const res = await fetch(apiUrl('/api/topics/refresh'), { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        set({ topics: data.topics || [] });
      }
    } catch (err) {
      console.error('Error refrescando temas desde Supabase:', err);
    } finally {
      set({ isLoadingTopics: false });
    }
  },

  selectTopic: async (topicId: string) => {
    set({ isLoadingTopicDetail: true, robotMood: 'buscar_antena', robotSpeechBubble: 'Precargando diapositivas y base RAG...' });
    try {
      const res = await fetch(apiUrl(`/api/topics/${topicId}`));
      if (res.ok) {
        const data = await res.json();
        set({ 
          selectedTopic: data.topic,
          currentSlideIndex: 0,
          currentView: 'presentation',
          isDrawerOpen: false,
          robotMood: 'idle_atento',
          robotSpeechBubble: `Módulo cargado. Usa las flechas para navegar o 'N' para ver notas.`,
          latestChatSources: [],
          chatMessages: [
            {
              id: 'init-msg',
              sender: 'assistant',
              text: `Bienvenido al módulo "${data.topic.title}". Puedes hacerme cualquier pregunta técnica: responderé citando las secciones oficiales del texto base.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        });
      }
    } catch (err) {
      console.error('Error cargando tema:', err);
      set({ 
        robotMood: 'sin_senal',
        robotSpeechBubble: 'Error al conectar con el servidor local.'
      });
    } finally {
      set({ isLoadingTopicDetail: false });
    }
  },

  nextSlide: () => {
    const { selectedTopic, currentSlideIndex, setRobotMood } = get();
    if (!selectedTopic) return;
    if (currentSlideIndex < selectedTopic.slides.length - 1) {
      setRobotMood('empujar_pantalla', 800);
      set({ currentSlideIndex: currentSlideIndex + 1 });
    }
  },

  prevSlide: () => {
    const { currentSlideIndex, setRobotMood } = get();
    if (currentSlideIndex > 0) {
      setRobotMood('empujar_pantalla', 800);
      set({ currentSlideIndex: currentSlideIndex - 1 });
    }
  },

  goToSlide: (index: number) => {
    const { selectedTopic, setRobotMood } = get();
    if (!selectedTopic) return;
    if (index >= 0 && index < selectedTopic.slides.length) {
      setRobotMood('empujar_pantalla', 700);
      set({ currentSlideIndex: index });
    }
  },

  toggleDrawer: () => {
    const { isDrawerOpen, setRobotMood } = get();
    const nextState = !isDrawerOpen;
    set({ isDrawerOpen: nextState });
    if (nextState) {
      setRobotMood('apuntar_puntero', 1200);
    } else {
      setRobotMood('idle_atento');
    }
  },

  setDrawerOpen: (open: boolean) => {
    set({ isDrawerOpen: open });
  },

  toggleSpotlight: () => {
    const { isSpotlightOpen, setRobotMood } = get();
    const nextState = !isSpotlightOpen;
    set({ isSpotlightOpen: nextState });
    if (nextState) {
      setRobotMood('buscar_antena');
    } else {
      setRobotMood('idle_atento');
    }
  },

  setSpotlightOpen: (open: boolean) => {
    set({ isSpotlightOpen: open });
    if (open) {
      get().setRobotMood('buscar_antena');
    }
  },

  toggleSessionLog: () => {
    set((state) => ({ isSessionLogOpen: !state.isSessionLogOpen }));
  },

  setRobotMood: (mood: RobotMood, durationMs?: number) => {
    set({ robotMood: mood });
    if (durationMs) {
      setTimeout(() => {
        // Volver a idle si no ha cambiado a otro estado
        if (get().robotMood === mood) {
          set({ robotMood: 'idle_atento' });
        }
      }, durationMs);
    }
  },

  setRobotSpeech: (speech: string | null, durationMs: number = 4000) => {
    set({ robotSpeechBubble: speech });
    if (speech && durationMs > 0) {
      setTimeout(() => {
        if (get().robotSpeechBubble === speech) {
          set({ robotSpeechBubble: null });
        }
      }, durationMs);
    }
  },

  setActiveHighlightBlockId: (id: string | null) => {
    set({ activeHighlightBlockId: id });
  },

  setActiveHighlightPdfTarget: (page: number | null, bbox: HighlightBbox | null) => {
    set({ activeHighlightPage: page, activeHighlightBbox: bbox });
  },

  // Consulta del Spotlight: búsqueda local rápida o web real resumida por el LLM.
  // El backend puede tardar hasta ~18 s cuando consulta un proveedor web.
  askQuestion: async (query: string): Promise<QueryResponse | null> => {
    const { selectedTopic, currentSlideIndex, setRobotMood, setRobotSpeech } = get();
    if (!selectedTopic || !query.trim()) return null;

    set({ isSearching: true, searchErrorToast: null });
    setRobotMood('buscar_antena');
    setRobotSpeech('Buscando en notas oficiales y fuentes web...');

    const currentSlide = selectedTopic.slides[currentSlideIndex];
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 20000); // 20 s: cubre búsqueda web + resumen del LLM

    try {
      const res = await fetch(apiUrl('/api/ask'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: selectedTopic.id,
          query: query.trim(),
          current_slide_id: currentSlide?.id
        }),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error('Respuesta inválida del servidor');
      }

      const data: QueryResponse = await res.json();

      // Guardar en bitácora de sesión
      set((state) => ({
        sessionHistory: [data, ...state.sessionHistory],
        isSearching: false
      }));

      if (data.source === 'local' && data.pagina && data.bbox) {
        // Módulo basado en PDF: recuadro precalculado sobre página + bbox
        set({
          activeHighlightPage: data.pagina,
          activeHighlightBbox: data.bbox,
          activeHighlightBlockId: data.target_block_id ?? null,
          isDrawerOpen: true,
        });
        setRobotMood('apuntar_puntero', 2000);
        setRobotSpeech(`¡Respuesta encontrada en la página ${data.pagina}!`, 5000);

      } else if (data.source === 'local' && data.target_block_id) {
        // Módulo basado en notas Markdown -> Smart Highlight de bloque
        set({
          activeHighlightBlockId: data.target_block_id,
          activeHighlightPage: null,
          activeHighlightBbox: null,
          isDrawerOpen: true, // Abrir drawer de notas
        });
        setRobotMood('apuntar_puntero', 2000);
        setRobotSpeech(`¡Respuesta en notas oficiales! (${data.block_title})`, 5000);

        // Desplazar el scroll hacia el bloque resaltado
        setTimeout(() => {
          const el = document.getElementById(data.target_block_id!);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);

      } else if (data.source === 'web') {
        // Encontrado en búsqueda web real -> Generar Sticky Note con enlaces
        const newSticky: StickyNote = {
          id: `sticky-${Date.now()}`,
          query: data.query,
          answer: data.answer_summary,
          source: 'web',
          external_url: data.external_url ?? data.web_results?.[0]?.url,
          web_results: data.web_results ?? [],
          provider: data.provider,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        set((state) => ({
          stickyNotes: [newSticky, ...state.stickyNotes.slice(0, 3)] // máximo 4 sticky notes en pantalla
        }));

        setRobotMood('celebrar', 2500);
        setRobotSpeech(
          data.web_results?.length
            ? `Respuesta externa sintetizada con ${data.web_results.length} fuentes web.`
            : 'No se encontraron resultados web para esa consulta.',
          4000
        );

      } else if (data.source === 'timeout') {
        const timeoutMsg =
          data.answer_summary || 'La búsqueda tardó demasiado. Inténtalo de nuevo.';
        set({ searchErrorToast: timeoutMsg });
        setRobotMood('sin_senal', 3000);
        setRobotSpeech(timeoutMsg, 4000);

        setTimeout(() => {
          if (get().searchErrorToast === timeoutMsg) {
            set({ searchErrorToast: null });
          }
        }, 4000);
      }

      return data;

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Error o Timeout de consulta RAG:', err);

      // HU-RES-01: Aviso no invasivo y postura sin_senal
      const errorMsg = 'Red lenta o sin conexión. Continúa con la presentación.';
      set({ 
        isSearching: false,
        searchErrorToast: errorMsg,
        isSpotlightOpen: false // Cierra modal y devuelve foco al expositor
      });
      setRobotMood('sin_senal', 3500);
      setRobotSpeech(errorMsg, 4000);

      // Auto ocultar toast después de 4 segundos
      setTimeout(() => {
        if (get().searchErrorToast === errorMsg) {
          set({ searchErrorToast: null });
        }
      }, 4000);

      return null;
    }
  },

  addStickyNote: (note: StickyNote) => {
    set((state) => ({
      stickyNotes: [note, ...state.stickyNotes.slice(0, 3)]
    }));
  },

  removeStickyNote: (id: string) => {
    set((state) => ({
      stickyNotes: state.stickyNotes.filter((n) => n.id !== id)
    }));
  },

  sendChatMessage: async (text: string) => {
    const {
      selectedTopic,
      currentSlideIndex,
      chatMessages,
      setRobotMood,
      setRobotSpeech
    } = get();

    const trimmed = text.trim();
    if (!selectedTopic || !trimmed || get().isSearching) return;

    const currentSlide = selectedTopic.slides[currentSlideIndex];
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const assistantId = `ast-${Date.now()}`;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: now
    };

    const assistantMsg: ChatMessage = {
      id: assistantId,
      sender: 'assistant',
      text: '',
      timestamp: now,
      isStreaming: true
    };

    // Turnos previos para que el LLM mantenga el hilo de la conversación.
    const history = chatMessages
      .filter((m) => m.text.trim() && !m.isStreaming)
      .slice(-8)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

    set((state) => ({
      chatMessages: [...state.chatMessages, userMsg, assistantMsg],
      isSearching: true,
      searchErrorToast: null,
      latestChatSources: []
    }));
    setRobotMood('buscar_antena');
    setRobotSpeech('Consultando las notas oficiales y redactando una respuesta...');

    const controller = new AbortController();
    chatAbortController = controller;

    const updateAssistant = (patch: Partial<ChatMessage>) => {
      set((state) => ({
        chatMessages: state.chatMessages.map((m) =>
          m.id === assistantId ? { ...m, ...patch } : m
        )
      }));
    };

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: selectedTopic.id,
          message: trimmed,
          history,
          current_slide_id: currentSlide?.id,
          top_k: 5
        }),
        signal: controller.signal
      });

      if (!res.ok || !res.body) {
        throw new Error(`El servidor respondió ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;

      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');

        let separatorIndex = buffer.indexOf('\n\n');
        while (separatorIndex !== -1) {
          const frame = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);

          for (const line of frame.split('\n')) {
            if (!line.startsWith('data:')) continue;

            const raw = line.slice(5).trim();
            if (!raw) continue;
            if (raw === '[DONE]') {
              finished = true;
              continue;
            }

            let event: ChatStreamEvent;
            try {
              event = JSON.parse(raw) as ChatStreamEvent;
            } catch {
              continue;
            }

            if (event.type === 'sources') {
              const sources = event.sources ?? [];
              updateAssistant({ sources, mode: event.mode ?? 'llm' });
              set({ latestChatSources: sources });

            } else if (event.type === 'delta') {
              const chunk = event.text ?? '';
              if (chunk) {
                set((state) => ({
                  chatMessages: state.chatMessages.map((m) =>
                    m.id === assistantId ? { ...m, text: m.text + chunk } : m
                  )
                }));
              }

            } else if (event.type === 'notice') {
              const notice = event.message ?? '';
              if (notice) updateAssistant({ notice });

            } else if (event.type === 'error') {
              updateAssistant({
                error: true,
                notice: event.message ?? 'Error al generar la respuesta.'
              });

            } else if (event.type === 'done') {
              const citations = event.citations ?? [];
              const sources = event.sources ?? [];
              const webResults = event.web_results ?? [];
              const finalAnswer =
                get().chatMessages.find((m) => m.id === assistantId)?.text ?? '';

              const localSources = sources.filter((s) => s.source !== 'web');
              const citedSource =
                citations.length > 0
                  ? sources.find((s) => s.id === citations[0])
                  : undefined;
              const topSource =
                citedSource && citedSource.source !== 'web'
                  ? citedSource
                  : localSources[0];

              const historySource: QueryResponse['source'] = localSources.length
                ? 'local'
                : webResults.length
                  ? 'web'
                  : 'timeout';

              const historyEntry: QueryResponse = {
                source: historySource,
                target_block_id: topSource?.id,
                block_title: topSource?.title,
                answer_summary: finalAnswer,
                excerpt: topSource?.excerpt,
                pagina: topSource?.pagina,
                bbox: topSource?.bbox,
                external_url: webResults[0]?.url,
                web_results: webResults,
                provider: event.web_provider,
                confidence: event.confidence ?? 0,
                query: trimmed,
                latency_ms: event.latency_ms ?? 0,
                timestamp: new Date().toISOString()
              };

              set((state) => ({
                chatMessages: state.chatMessages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        isStreaming: false,
                        citations,
                        sources,
                        webResults,
                        external_url: webResults[0]?.url,
                        notice:
                          webResults.length &&
                          (!m.notice ||
                            m.notice.startsWith('Buscando información externa') ||
                            m.notice.startsWith('No se encontraron resultados web'))
                            ? `Respuesta complementada con ${webResults.length} fuente(s) web externa(s)${event.web_provider ? ` (${event.web_provider})` : ''}.`
                            : m.notice,
                        mode: event.mode ?? m.mode,
                        confidence: event.confidence ?? m.confidence
                      }
                    : m
                ),
                latestChatSources: sources,
                sessionHistory: [historyEntry, ...state.sessionHistory]
              }));

              if (topSource) {
                set({ activeHighlightBlockId: topSource.id });
              }

              setRobotMood('apuntar_puntero', 2000);
              setRobotSpeech(
                webResults.length
                  ? 'Respuesta sintetizada con citas oficiales y fuentes web externas.'
                  : 'Respuesta sintetizada con citas del material oficial.',
                4000
              );
            }
          }

          if (finished) break;
          separatorIndex = buffer.indexOf('\n\n');
        }
      }

      updateAssistant({ isStreaming: false });
      set({ isSearching: false });

    } catch (err: any) {
      const aborted = err?.name === 'AbortError';

      if (aborted) {
        set((state) => ({
          chatMessages: state.chatMessages.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  isStreaming: false,
                  text: m.text || 'Generación detenida por el usuario.',
                  notice: 'Generación detenida por el usuario.'
                }
              : m
          ),
          isSearching: false
        }));
        setRobotSpeech('Generación detenida.', 2500);
      } else {
        const errorMsg = 'No se pudo obtener respuesta del asistente. Revisa la conexión con el backend.';
        set((state) => ({
          chatMessages: state.chatMessages.map((m) =>
            m.id === assistantId
              ? { ...m, isStreaming: false, error: true, text: m.text || errorMsg }
              : m
          ),
          isSearching: false,
          searchErrorToast: errorMsg
        }));
        setRobotMood('sin_senal', 3000);
        setRobotSpeech(errorMsg, 4000);
      }

    } finally {
      if (chatAbortController === controller) chatAbortController = null;
      set({ isSearching: false });
      updateAssistant({ isStreaming: false });
    }
  },

  stopChatStream: () => {
    chatAbortController?.abort();
    chatAbortController = null;
  },

  loadLlmStatus: async () => {
    try {
      const res = await fetch(apiUrl('/api/llm/status'));
      if (!res.ok) return;
      const data = await res.json();
      set({
        llmStatus: {
          configured: Boolean(data.configured),
          provider: data.provider,
          model: data.model ?? 'desconocido',
          mode: data.mode === 'llm' ? 'llm' : 'extractive'
        }
      });
    } catch (err) {
      console.error('Error consultando estado del LLM:', err);
      set({
        llmStatus: {
          configured: false,
          model: 'backend no disponible',
          mode: 'extractive'
        }
      });
    }
  },

  setContrastMode: (mode: ContrastMode) => {
    set({ contrastMode: mode });
  },

  setFontSize: (size: FontSizeSetting) => {
    set({ fontSize: size });
  },

  clearSearchError: () => {
    set({ searchErrorToast: null });
  },

  downloadTopicMaterial: async (topicId: string, tipo: 'pdf' | 'pptx' = 'pdf'): Promise<DownloadResponse | null> => {
    try {
      const res = await fetch(apiUrl(`/api/topics/${topicId}/download?tipo=${tipo}`));
      if (!res.ok) {
        throw new Error(`Error en la descarga: ${res.statusText}`);
      }
      const data: DownloadResponse = await res.json();
      if (data && data.download_url) {
        // Disparar la descarga en el navegador mediante elemento <a>
        const link = document.createElement('a');
        link.href = data.download_url;
        link.setAttribute('download', data.file_name || `${topicId}.${tipo}`);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return data;
      }
      return null;
    } catch (err) {
      console.error('Error al descargar material del módulo:', err);
      return null;
    }
  },

  // Obtiene la URL (pública o firmada) del PDF solo para RENDERIZARLO en
  // el visor de Smart Highlight, sin disparar una descarga en el navegador.
  fetchPdfViewUrl: async (topicId: string): Promise<string | null> => {
    try {
      const res = await fetch(apiUrl(`/api/topics/${topicId}/download?tipo=pdf`));
      if (!res.ok) return null;
      const data: DownloadResponse = await res.json();
      return data.download_url || null;
    } catch (err) {
      console.error('Error obteniendo URL de vista del PDF:', err);
      return null;
    }
  }
}));
