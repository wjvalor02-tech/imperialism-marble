import { createRoot } from 'react-dom/client';
import App from './App';
import ConfirmDialog from './ui/components/ConfirmDialog';
import InAppBrowserBanner from './ui/components/InAppBrowserBanner';
import './styles.css';

// StrictMode는 이동 연출 effect를 두 번 실행시키므로 사용하지 않는다.
createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <ConfirmDialog />
    <InAppBrowserBanner />
  </>,
);
