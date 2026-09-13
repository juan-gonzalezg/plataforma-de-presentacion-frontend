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
  HighlightBbox 
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
  setContrastMode: (mode: ContrastMode) => void;
  setFontSize: (size: FontSizeSetting) => void;
  clearSearchError: () => void;
  downloadTopicMaterial: (topicId: string, tipo?: 'pdf' | 'pptx') => Promise<DownloadResponse | null>;
  fetchPdfViewUrl: (topicId: string) => Promise<string | null>;
}

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
          chatMessages: [
            {
              id: 'init-msg',
              sender: 'assistant',
              text: `Bienvenido al módulo "${data.topic.title}". Puedes hacerme cualquier pregunta técnica sobre los conceptos expuestos.`,
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

  // HU-RES-01: Tolerancia a Fallos y Timeout Estricto de 4000ms
  askQuestion: async (query: string): Promise<QueryResponse | null> => {
    const { selectedTopic, currentSlideIndex, setRobotMood, setRobotSpeech } = get();
    if (!selectedTopic || !query.trim()) return null;

    set({ isSearching: true, searchErrorToast: null });
    setRobotMood('buscar_antena');
    setRobotSpeech('Buscando en notas oficiales y fuentes semánticas...');

    const currentSlide = selectedTopic.slides[currentSlideIndex];
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 4000); // 4000ms strict timeout

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
        // Encontrado en búsqueda web -> Generar Sticky Note
        const newSticky: StickyNote = {
          id: `sticky-${Date.now()}`,
          query: data.query,
          answer: data.answer_summary,
          source: 'web',
          external_url: data.external_url,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        set((state) => ({
          stickyNotes: [newSticky, ...state.stickyNotes.slice(0, 3)] // máximo 4 sticky notes en pantalla
        }));

        setRobotMood('celebrar', 2500);
        setRobotSpeech('Respuesta localizada mediante búsqueda web externa.', 4000);
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
    const { askQuestion } = get();
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, userMsg]
    }));

    const result = await askQuestion(text.trim());
    if (result) {
      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: result.answer_summary,
        source: result.source,
        target_block_id: result.target_block_id,
        external_url: result.external_url,
        confidence: result.confidence,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      set((state) => ({
        chatMessages: [...state.chatMessages, assistantMsg]
      }));
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
