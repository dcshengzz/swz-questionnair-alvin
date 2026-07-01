import { createContext, useContext } from 'react';
import type { DesignerStore } from '../../store/designer';

export const DesignerStoreContext = createContext<DesignerStore | null>(null);

export function useDesignerStore(): DesignerStore {
  const store = useContext(DesignerStoreContext);
  if (!store) throw new Error('useDesignerStore must be used inside <QuestionnaireDesigner>');
  return store;
}
