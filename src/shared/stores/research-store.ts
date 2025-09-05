import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface ResearchState {
  selectedText: string;
  voiceCommand: string;
  isListening: boolean;
  currentResearchId: string | null;
}

export interface ResearchActions {
  setSelectedText: (text: string) => void;
  setVoiceCommand: (command: string) => void;
  setIsListening: (listening: boolean) => void;
  setCurrentResearchId: (id: string | null) => void;
  reset: () => void;
}

type ResearchStore = ResearchState & ResearchActions;

const initialState: ResearchState = {
  selectedText: '',
  voiceCommand: '',
  isListening: false,
  currentResearchId: null,
};

export const useResearchStore = create<ResearchStore>()(
  devtools(
    (set) => ({
      ...initialState,
      
      setSelectedText: (text) =>
        set((state) => ({ ...state, selectedText: text }), false, 'setSelectedText'),
      
      setVoiceCommand: (command) =>
        set((state) => ({ ...state, voiceCommand: command }), false, 'setVoiceCommand'),
      
      setIsListening: (listening) =>
        set((state) => ({ ...state, isListening: listening }), false, 'setIsListening'),
      
      setCurrentResearchId: (id) =>
        set((state) => ({ ...state, currentResearchId: id }), false, 'setCurrentResearchId'),
      
      reset: () =>
        set(initialState, false, 'reset'),
    }),
    {
      name: 'research-store',
    }
  )
);