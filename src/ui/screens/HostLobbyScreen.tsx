import { NATIONS, type PlayerNation } from '../../data/gameData';
import { askConfirm } from '../confirm';
import { hostStartGame, stopHost } from '../../net/host';
import { useNet } from '../../net/netStore';
import Flag from '../components/Flag';

const ALL = Object.keys(NATIONS) as PlayerNation[];

/** 방장 대기실: 방 코드를 띄우고 학생들이 나라를 고르길 기다린다 */
export default function HostLobbyScreen() {
  const { room, seats, names, aiFill, set, kind, status } = useNet();
  const seated = ALL.filter((n) => seats[n]);
  const total = aiFill ? ALL.length : seated.length;
  const joinUrl = `${location.origin}${location.pathname}?room=${room}`;
  const online = location.protocol.startsWith('http');

  return (
    <main className="setup title-bg">
      <div className="setup-card lobby">
        <button className="btn small back" onClick={() => askConfirm('방을 닫고 처음 화면으로 갈까요?', stopHost, '방 닫기')}>← 방 닫기</button>
        <p className="mode-title">모둠모드 — 참여를 기다리는 중</p>
        <p className="lead">학생 기기에서 이 웹앱을 열고 <b>[방 참여하기]</b>를 누른 뒤 아래 코드를 입력하세요.</p>
        <div className="room-code" aria-label={`방 코드 ${room}`}>{room}</div>
        {online && <p className="join-url">바로 들어오는 주소: <code>{joinUrl}</code></p>}
        {kind === 'local' && <p className="m-warn">시험 연결 중: 온라인 설정(.env.local)이 없어 같은 컴퓨터의 다른 탭에서만 참여할 수 있습니다.</p>}
        {status === 'error' && <p className="m-warn">연결에 실패했습니다. 인터넷 연결과 온라인 설정을 확인하세요.</p>}

        <div className="seat-grid">
          {ALL.map((n) => (
            <div key={n} className={`seat ${seats[n] ? 'taken' : ''}`} style={{ '--owner': NATIONS[n].color } as React.CSSProperties}>
              <Flag id={n} size={44} />
              <b>{NATIONS[n].name}</b>
              <span>{seats[n] ? `✔ ${names[n] || '참여함'}` : aiFill ? '비어 있음 → AI' : '비어 있음 → 빠짐'}</span>
            </div>
          ))}
        </div>

        <label className="field check center-check">
          <input type="checkbox" checked={aiFill} onChange={(e) => set({ aiFill: e.target.checked })} />
          빈 자리는 AI가 맡기 (끄면 빈 나라는 게임에서 빠짐)
        </label>
        <button className="btn primary huge" disabled={!seated.length || total < 2} onClick={hostStartGame}>
          게임 시작 ({seated.length}개 모둠{aiFill && seated.length < 4 ? ` + AI ${4 - seated.length}` : ''})
        </button>
        {!seated.length && <p className="muted">한 모둠 이상 들어오면 시작할 수 있습니다.</p>}
      </div>
    </main>
  );
}
