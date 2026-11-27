import { onlineConfigured } from '../../net/transport';
import type { GameMode } from '../../store/gameStore';

/** 첫 화면: 배경 일러스트 + 게임 방식 고르기 */
export default function ModeScreen({ onPick, onJoin }: { onPick: (m: GameMode) => void; onJoin: () => void }) {
  return (
    <main className="mode-screen title-bg">
      <div className="mode-hero">
        <h1>제국주의 마블</h1>
        <p>열강의 식민지 분할, 1880~1914 — 그리고 그 땅에 살던 사람들</p>
      </div>
      <div className="mode-cards">
        <button className="mode-card" onClick={() => onPick('single')}>
          <b>싱글모드</b>
          <span>나 혼자 한 나라를 맡고, 나머지 3개국은 AI와 겨룹니다.</span>
          <i>혼자 연습 · 복습</i>
        </button>
        <div className="mode-card group">
          <b>모둠모드</b>
          <span>4개 모둠이 각자 기기로 접속해 함께 합니다.</span>
          <div className="mode-actions">
            <button className="btn primary" onClick={() => onPick('online')}>방 만들기<small>선생님 · 전자칠판</small></button>
            <button className="btn" onClick={onJoin}>방 참여하기<small>학생 기기</small></button>
          </div>
          {!onlineConfigured && <i className="warn">온라인 연결 설정 전: 같은 컴퓨터의 다른 탭끼리만 연결됩니다 (시험용)</i>}
        </div>
      </div>
      <button className="link-btn" onClick={() => onPick('hotseat')}>인터넷 없이 한 화면에서 돌아가며 하기 →</button>
    </main>
  );
}
