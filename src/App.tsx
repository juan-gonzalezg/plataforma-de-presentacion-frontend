import React, { useEffect } from 'react';
import { usePresentationStore } from './store/usePresentationStore';
import { P01_Home } from './components/P01_Home';
import { P02_Presentacion } from './components/P02_Presentacion';
import { P03_NotebookLM } from './components/P03_NotebookLM';

export const App: React.FC = () => {
  const {
    currentView,
    nextSlide,
    prevSlide,
    toggleDrawer,
    setDrawerOpen,
    toggleSpotlight,
    setSpotlightOpen,
    isSpotlightOpen,
    isDrawerOpen,
    isSessionLogOpen,
    toggleSessionLog,
    contrastMode,
    fontSize
  } = usePresentationStore();

  // Atajos de teclado globales sin colisión con inputs de texto (HU-PRS-01)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTagName = document.activeElement?.tagName.toLowerCase();
      const isInputFocused = activeTagName === 'input' || activeTagName === 'textarea';

      // Tecla Escape siempre cierra paneles abiertos
      if (e.key === 'Escape') {
        if (isSpotlightOpen) setSpotlightOpen(false);
        if (isDrawerOpen) setDrawerOpen(false);
        if (isSessionLogOpen) toggleSessionLog();
        return;
      }

      // Ctrl + K para abrir Spotlight
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleSpotlight();
        return;
      }

      // Si el usuario está escribiendo dentro de un input, no interferir con las flechas o letras
      if (isInputFocused) return;

      // Navegación en modo presentación
      if (currentView === 'presentation') {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          nextSlide();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prevSlide();
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          toggleDrawer();
        } else if (e.key === 'q' || e.key === 'Q') {
          e.preventDefault();
          toggleSpotlight();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentView,
    nextSlide,
    prevSlide,
    toggleDrawer,
    setDrawerOpen,
    toggleSpotlight,
    setSpotlightOpen,
    isSpotlightOpen,
    isDrawerOpen,
    isSessionLogOpen,
    toggleSessionLog
  ]);

  return (
    <div className={`min-h-screen theme-${contrastMode} font-size-${fontSize} transition-colors duration-300`}>
      {currentView === 'home' && <P01_Home />}
      {currentView === 'presentation' && <P02_Presentacion />}
      {currentView === 'notebooklm' && <P03_NotebookLM />}
    </div>
  );
};

export default App;
