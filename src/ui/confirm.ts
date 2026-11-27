import { create } from 'zustand';

/**
 * 앱 안에서 띄우는 확인 창. 브라우저 기본 confirm()은 일부 전자칠판·앱 내장 브라우저에서
 * 막혀 항상 '취소'가 되므로 쓰지 않는다.
 */
interface ConfirmState {
  msg: string | null;
  yes: string;
  onYes: (() => void) | null;
  close: () => void;
}
export const useConfirm = create<ConfirmState>()((set) => ({
  msg: null, yes: '확인', onYes: null,
  close: () => set({ msg: null, onYes: null }),
}));

export function askConfirm(msg: string, onYes: () => void, yes = '확인') {
  useConfirm.setState({ msg, onYes, yes });
}
