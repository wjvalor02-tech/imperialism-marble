import { useState } from 'react';
import { askConfirm } from '../confirm';
import { NATIONS, type PlayerNation } from '../../data/gameData';
import { claimNation, joinRoom, leaveRoom } from '../../net/client';
import { josa } from '../../engine/selectors';
import { useNet } from '../../net/netStore';
import { useGame } from '../../store/gameStore';
import Flag from '../components/Flag';

const ALL = Object.keys(NATIONS) as PlayerNation[];

/** 학생 기기: 방 코드 입력 → 나라 고르기 → 시작 대기 */
export default function JoinScreen() {
  const { role, room, seats, names, myNation, clientId, notice, status, kind } = useNet();
  const game = useGame((s) => s.game);
  const ai = useGame((s) => s.session.ai);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '');
  const [name, setName] = useState(() => sessionStorage.getItem('imperial-name') ?? '');
  const joined = role === 'client' && room;

  if (!joined) {
    return (
      <main className="setup title-bg">
        <form className="setup-card" onSubmit={(e) => { e.preventDefault(); if (code.length === 6) void joinRoom(code); }}>
          <button type="button" className="btn small back" onClick={() => leaveRoom()}>← 처음으로</button>
          <p className="mode-title">모둠모드 — 방 참여하기</p>
          <label className="field big-field">선생님 화면의 방 코드 (6자리)
            <input value={code} maxLength={6} autoFocus autoCapitalize="characters" placeholder="예: K7M2QX"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
          </label>
          <button className="btn primary huge" type="submit" disabled={code.length !== 6}>참여하기</button>
        </form>
      </main>
    );
  }

  const started = !!game;
  const canPick = (n: PlayerNation) => {
    const owner = seats[n];
    if (owner === clientId) return true;
    if (!started) return !owner;
    return ai.includes(n) && !owner; // 게임 중에는 AI가 두던 자리만
  };

  return (
    <main className="setup title-bg">
      <div className="setup-card lobby">
        <button className="btn small back" onClick={() => askConfirm('방에서 나갈까요?', leaveRoom, '나가기')}>← 나가기</button>
        <p className="mode-title">방 {room} {status !== 'connected' ? '· 연결 중…' : ''}</p>
        {kind === 'local' && <p className="muted">시험 연결 (같은 컴퓨터의 탭끼리)</p>}
        <label className="field">모둠 이름 (선택)
          <input value={name} maxLength={12} placeholder="예: 3모둠" onChange={(e) => setName(e.target.value)} />
        </label>
        <h2>우리 모둠이 맡을 나라</h2>
        <div className="seat-grid">
          {ALL.map((n) => {
            const mine = seats[n] === clientId;
            const taken = !!seats[n] && !mine;
            return (
              <button key={n} className={`seat pick ${mine ? 'mine' : ''} ${taken ? 'taken' : ''}`} disabled={!canPick(n)}
                style={{ '--owner': NATIONS[n].color } as React.CSSProperties} onClick={() => claimNation(n, name.trim())}>
                <Flag id={n} size={44} />
                <b>{NATIONS[n].name}</b>
                <span>{mine ? '✔ 우리 모둠' : taken ? names[n] || '다른 모둠' : started && ai.includes(n) ? 'AI가 두는 중 · 들어가기' : '선택 가능'}</span>
              </button>
            );
          })}
        </div>
        {notice && <p className="m-warn">{notice}</p>}
        <p className="lead">{myNation ? josa(`${NATIONS[myNation].name}을(를) 골랐습니다. 선생님이 게임을 시작하면 바로 넘어갑니다.`) : '나라를 골라 주세요.'}</p>
      </div>
    </main>
  );
}
