import { createContext, useContext } from 'react';
import type { Control } from './useControl';

export const ControlContext = createContext<Control | null>(null);
export const useControlCtx = () => useContext(ControlContext);
