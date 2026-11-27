import { useState } from 'react';

/**
 * 카카오톡·네이버·인스타그램 등 '앱 안 브라우저'는 앱이 소리를 막는 경우가 많다
 * (특히 아이폰 카카오톡: 웹 코드로 해결 불가). 바깥 브라우저(사파리·크롬)로 다시 열도록 안내한다.
 * 카카오톡은 kakaotalk://web/openExternal 주소로 기본 브라우저를 바로 열 수 있다.
 */
const UA = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const KAKAO = /KAKAOTALK/i.test(UA);
const LINE = /\bLine\//i.test(UA);
const OTHER_INAPP = /NAVER\(inapp|Instagram|FBAN|FBAV|DaumApps|everytimeApp|; wv\)/i.test(UA);
export const isInAppBrowser = KAKAO || LINE || OTHER_INAPP;

function openExternal() {
  const url = location.href;
  if (KAKAO) {
    location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    return;
  }
  if (LINE) {
    location.href = url + (url.includes('?') ? '&' : '?') + 'openExternalBrowser=1';
  }
}

export default function InAppBrowserBanner() {
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem('imperial-inapp-dismissed') === '1'; } catch { return false; }
  });
  const [copied, setCopied] = useState(false);
  if (!isInAppBrowser || hidden) return null;
  const dismiss = () => {
    setHidden(true);
    try { sessionStorage.setItem('imperial-inapp-dismissed', '1'); } catch { /* 무시 */ }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <div className="inapp-banner" role="alert">
      <p>
        <b>{KAKAO ? '카카오톡' : '앱'} 안에서 열린 창에서는 배경음악과 효과음이 나오지 않을 수 있어요.</b>
        <span>{KAKAO || LINE ? '아래 버튼을 누르면 사파리·크롬에서 그대로 열립니다.' : '오른쪽 위 메뉴(⋯)에서 “다른 브라우저로 열기”를 눌러 주세요.'}</span>
      </p>
      <div className="inapp-actions">
        {(KAKAO || LINE) && <button className="btn primary small" onClick={openExternal}>브라우저로 열기</button>}
        <button className="btn small" onClick={copy}>{copied ? '주소 복사됨' : '주소 복사'}</button>
        <button className="btn small" onClick={dismiss}>그냥 할게요</button>
      </div>
    </div>
  );
}
