import { create } from 'zustand';

export const usePdfStore = create((set, get) => ({
  // Document state
  filename: 'document.pdf',
  pageCount: 1,
  currentPage: 0,
  properties: null,
  pageOrder: [],
  pageRotations: {},

  // View & UI state
  zoom: 1.25,
  theme: 'dark', // 'dark' (obsidian) | 'light' (clean slate)
  editMode: 'select', // 'select' | 'text' | 'image' | 'addText'
  isSidebarOpen: true,
  isPropertiesOpen: true,
  isSearchOpen: false,
  isPropertiesModalOpen: false,
  isHelpModalOpen: false,
  confirmModal: null, // { title, message, onConfirm }
  toast: null, // { message, type: 'info' | 'success' | 'error' }

  // Current page cache
  pageData: null,
  loadingPage: false,
  pageCache: {},

  // Selections
  activeTextBlock: null,
  selectedImageId: null,
  hoveredElement: null,

  // Search state
  searchQuery: '',
  searchMatches: [],
  currentMatchIndex: 0,

  // Staged modifications & Undo/Redo history
  stagedEdits: {},
  undoStack: [],
  redoStack: [],

  // --- ACTIONS ---

  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(3.5, zoom)) }),
  zoomIn: () => set((state) => ({ zoom: Math.min(3.5, state.zoom + 0.25) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(0.5, state.zoom - 0.25) })),
  resetZoom: () => set({ zoom: 1.0 }),

  setEditMode: (editMode) => set({ editMode, activeTextBlock: null, selectedImageId: null }),

  setCurrentPage: (currentPage) => {
    const { pageCount } = get();
    if (currentPage >= 0 && currentPage < pageCount) {
      set({ currentPage, activeTextBlock: null, selectedImageId: null });
    }
  },

  setPageData: (pageData) => {
    if (!pageData) return;
    set((state) => {
      const cacheKey = `p_${pageData.pageNumber}_z_${Math.round(state.zoom * 100)}`;
      return {
        pageData,
        pageCache: { ...state.pageCache, [cacheKey]: pageData },
      };
    });
  },

  setLoadingPage: (loadingPage) => set({ loadingPage }),

  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => {
      if (get().toast?.message === message) {
        set({ toast: null });
      }
    }, 3500);
  },

  // Document init
  setDocument: ({ filename, pageCount, firstPage, properties }) => {
    const pageOrder = Array.from({ length: pageCount }, (_, i) => i);
    set({
      filename,
      pageCount,
      currentPage: 0,
      pageData: firstPage,
      properties: properties || null,
      pageOrder,
      pageRotations: {},
      stagedEdits: {},
      undoStack: [],
      redoStack: [],
      activeTextBlock: null,
      selectedImageId: null,
      searchMatches: [],
      pageCache: {},
    });
  },

  // Selection actions
  setActiveTextBlock: (activeTextBlock) => set({ activeTextBlock, selectedImageId: null }),
  setSelectedImageId: (selectedImageId) => set({ selectedImageId, activeTextBlock: null }),
  setHoveredElement: (hoveredElement) => set({ hoveredElement }),

  // History & Undo/Redo
  pushUndo: () => {
    const { stagedEdits, undoStack } = get();
    const snapshot = JSON.parse(JSON.stringify(stagedEdits));
    set({
      undoStack: [...undoStack.slice(-25), snapshot], // keep last 25 states
      redoStack: [],
    });
  },

  undo: () => {
    const { undoStack, stagedEdits, redoStack } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, JSON.parse(JSON.stringify(stagedEdits))],
      stagedEdits: previous,
    });
  },

  redo: () => {
    const { redoStack, stagedEdits, undoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, JSON.parse(JSON.stringify(stagedEdits))],
      stagedEdits: next,
    });
  },

  // Stage Text Edit
  commitTextEdit: (pageNumber, editPayload) => {
    get().pushUndo();
    set((state) => {
      const pageMods = state.stagedEdits[pageNumber] || {
        textEdits: [],
        imageEdits: [],
        newTexts: [],
        newImages: [],
      };
      const textEdits = [
        ...pageMods.textEdits.filter((e) => e.id !== editPayload.id),
        editPayload,
      ];
      return {
        activeTextBlock: null,
        stagedEdits: {
          ...state.stagedEdits,
          [pageNumber]: { ...pageMods, textEdits },
        },
      };
    });
  },

  // Stage New Text block
  addNewText: (pageNumber, textPayload) => {
    get().pushUndo();
    set((state) => {
      const pageMods = state.stagedEdits[pageNumber] || {
        textEdits: [],
        imageEdits: [],
        newTexts: [],
        newImages: [],
      };
      return {
        stagedEdits: {
          ...state.stagedEdits,
          [pageNumber]: {
            ...pageMods,
            newTexts: [...pageMods.newTexts, textPayload],
          },
        },
      };
    });
  },

  // Stage Image Edit
  commitImageEdit: (pageNumber, imagePayload) => {
    get().pushUndo();
    set((state) => {
      const pageMods = state.stagedEdits[pageNumber] || {
        textEdits: [],
        imageEdits: [],
        newTexts: [],
        newImages: [],
      };
      const imageEdits = [
        ...pageMods.imageEdits.filter((ie) => ie.id !== imagePayload.id),
        imagePayload,
      ];
      return {
        stagedEdits: {
          ...state.stagedEdits,
          [pageNumber]: { ...pageMods, imageEdits },
        },
      };
    });
  },

  // Revert single edit
  revertEdit: (pageNumber, type, editId) => {
    get().pushUndo();
    set((state) => {
      const p = state.stagedEdits[pageNumber];
      if (!p) return state;
      if (type === 'text') {
        return {
          stagedEdits: {
            ...state.stagedEdits,
            [pageNumber]: {
              ...p,
              textEdits: p.textEdits.filter((e) => e.id !== editId),
              newTexts: (p.newTexts || []).filter((e) => e.id !== editId),
            },
          },
        };
      } else {
        return {
          stagedEdits: {
            ...state.stagedEdits,
            [pageNumber]: {
              ...p,
              imageEdits: p.imageEdits.filter((e) => e.id !== editId),
            },
          },
        };
      }
    });
  },

  // Page reordering and rotation
  rotatePageLocal: (pageNumber, delta = 90) => {
    set((state) => {
      const current = state.pageRotations[pageNumber] || 0;
      return {
        pageRotations: {
          ...state.pageRotations,
          [pageNumber]: (current + delta) % 360,
        },
      };
    });
  },

  movePage: (fromIndex, toIndex) => {
    set((state) => {
      const newOrder = [...state.pageOrder];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      return { pageOrder: newOrder };
    });
  },

  // Search actions
  setSearch: ({ query, matches }) => {
    set({
      searchQuery: query,
      searchMatches: matches,
      currentMatchIndex: matches.length > 0 ? 0 : -1,
    });
  },

  nextMatch: () => {
    const { searchMatches, currentMatchIndex } = get();
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    const match = searchMatches[nextIdx];
    set({ currentMatchIndex: nextIdx, currentPage: match.page });
  },

  prevMatch: () => {
    const { searchMatches, currentMatchIndex } = get();
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    const match = searchMatches[prevIdx];
    set({ currentMatchIndex: prevIdx, currentPage: match.page });
  },

  closeSearch: () => set({ isSearchOpen: false, searchMatches: [], searchQuery: '' }),
}));

