import { useState } from 'react';
import { askConfirm } from '../confirm';
import { COLONIES, NATIONS, SPECIAL_TILES } from '../../data/gameData';
import { accountName, won } from '../../engine/selectors';
import type { GameState, LogKind, PlayerId } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import Flag from './Flag';
import Modal from './Modal';

type Tab = 'memo' | 'log' | 'adjust' | 'settings';
const KIND_LABEL: Record<LogKind, string> = { money: '돈', event: '사건', key: '황금열쇠', host: '조정', turn: '차례' };

export default function HostPanel({ game, onClose }: { game: GameState; onClose: () => void }) {
  const hostPin = useGame((st) => st.hostPin);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [tab, setTab] = useState<Tab>('memo');

  if (!unlocked) {
    return (
      <Modal label="교사 PIN" onClose={onClose}>
        <h2 className="m-title">⚙ 게임 관리 (교사용)</h2>
        <form className="pin-form" onSubmit={(e) => { e.preventDefault(); if (pin === hostPin) setUnlocked(true); else setPin(''); }}>
          <label htmlFor="pin">교사 PIN 4자리</label>
          <input id="pin" type="password" inputMode="numeric" maxLength={4} value={pin} autoFocus onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          <button className="btn primary big" type="submit">들어가기</button>
          <p className="muted">PIN은 게임 설정 화면에서 정합니다 (기본 0000).</p>
        </form>
      </Modal>
    );
  }

  return (
    <Modal label="게임 관리" onClose={onClose} wide>
      <h2 className="m-title">⚙ 게임 관리</h2>
      <p className="muted">국제은행(돈 계산)은 자동으로 처리됩니다. 문제가 생겼을 때 되돌리기·설정·수동 조정을 쓸 수 있습니다.</p>
      <nav className="tabs" role="tablist">
        {([['memo', '메모판'], ['log', '거래 로그'], ['adjust', '수동 조정'], ['settings', '설정·되돌리기']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      {tab === 'memo' && <Memo game={game} />}
      {tab === 'log' && <LogView game={game} />}
      {tab === 'adjust' && <Adjust game={game} />}
      {tab === 'settings' && <SettingsView game={game} onClose={onClose} />}
    </Modal>
  );
}

function Memo({ game }: { game: GameState }) {
  return (
    <div className="scroll-box">
      <table className="memo-table">
        <thead><tr><th>식민지</th><th>가격</th><th>소유국</th><th>식민화 단계</th><th>무역대금</th><th>누적 수탈액</th></tr></thead>
        <tbody>
          {Object.entries(COLONIES).map(([id, col]) => {
            const c = game.colonies[id];
            return (
              <tr key={id}>
                <td>{col.name}</td>
                <td>{won(col.price)}</td>
                <td>{c.owner ? <><Flag id={c.owner} size={14} /> {NATIONS[c.owner].name}</> : '—'}</td>
                <td>{c.owner ? `${c.stage}. ${c.stage === 0 ? '확보' : col.stages[c.stage].name}` : '—'}</td>
                <td>{c.owner ? won(col.stages[c.stage].toll) : '—'}</td>
                <td>{c.earned ? won(c.earned) : '—'}</td>
              </tr>
            );
          })}
          <tr>
            <td>파쇼다</td><td>{won(SPECIAL_TILES.fashoda.price)}</td>
            <td>{game.fashoda.owner ? <><Flag id={game.fashoda.owner} size={14} /> {NATIONS[game.fashoda.owner].name}</> : '—'}</td>
            <td>{game.fashoda.owner ? '점령' : '—'}</td><td>{game.fashoda.owner ? won(SPECIAL_TILES.fashoda.toll) : '—'}</td><td>—</td>
          </tr>
        </tbody>
      </table>
      <p className="muted">중국 공동 식민통치기구 적립금: {won(game.chinaPool)} · 황금열쇠 더미 {game.deck.length}장 / 사용 {game.discard.length}장</p>
    </div>
  );
}

function LogView({ game }: { game: GameState }) {
  const [who, setWho] = useState<PlayerId | 'ALL'>('ALL');
  const [kind, setKind] = useState<LogKind | 'ALL'>('ALL');
  const rows = game.log.filter((l) => (who === 'ALL' || l.player === who || l.from === who || l.to === who) && (kind === 'ALL' || l.kind === kind));
  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['번호', '차례', '종류', '국가', '보낸 곳', '받는 곳', '금액(만원)', '내용'].map(esc).join(',')];
    for (const l of game.log) {
      lines.push([l.id, l.turn, KIND_LABEL[l.kind], l.player ? NATIONS[l.player].name : '', l.from ? accountName(l.from) : '', l.to ? accountName(l.to) : '', l.amount ?? '', l.text].map(esc).join(','));
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `제국주의마블_거래로그_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <div className="filter-row">
        <select value={who} onChange={(e) => setWho(e.target.value as PlayerId | 'ALL')} aria-label="국가 필터">
          <option value="ALL">모든 국가</option>
          {game.players.map((p) => <option key={p.id} value={p.id}>{NATIONS[p.id].name}</option>)}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as LogKind | 'ALL')} aria-label="종류 필터">
          <option value="ALL">모든 종류</option>
          {(Object.keys(KIND_LABEL) as LogKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        <button className="btn small" onClick={exportCsv}>⬇ CSV 내보내기</button>
      </div>
      <ol className="full-log scroll-box">
        {[...rows].reverse().map((l) => <li key={l.id} className={`log-${l.kind}`}><span className="muted">#{l.turn}</span> {l.text}</li>)}
      </ol>
    </>
  );
}

function Adjust({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const alive = game.players.filter((p) => !p.bankrupt);
  const [player, setPlayer] = useState<PlayerId>(alive[0]?.id ?? 'UK');
  const [delta, setDelta] = useState(10);
  const [colony, setColony] = useState(Object.keys(COLONIES)[0]);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const c = game.colonies[colony];
  const run = (ok: boolean) => { setMsg(ok ? '✅ 반영되었습니다 (로그에 수동 조정으로 기록)' : '⚠ 반영할 수 없습니다. 사유를 입력했는지 확인하세요.'); if (ok) setReason(''); };

  return (
    <div className="adjust">
      <label className="field wide-field">조정 사유 (필수)
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 실물 화폐 계산 실수 정정" />
      </label>
      <fieldset>
        <legend>자금 조정</legend>
        <select value={player} onChange={(e) => setPlayer(e.target.value as PlayerId)} aria-label="국가">
          {alive.map((p) => <option key={p.id} value={p.id}>{NATIONS[p.id].name} ({won(p.money)})</option>)}
        </select>
        <input type="number" step={5} value={delta} onChange={(e) => setDelta(Number(e.target.value))} aria-label="금액(만원)" />
        <span>만원</span>
        <button className="btn small" onClick={() => run(dispatch({ type: 'HOST_ADJUST_MONEY', player, delta: Math.abs(delta), reason }))}>+ 지급</button>
        <button className="btn small" onClick={() => run(dispatch({ type: 'HOST_ADJUST_MONEY', player, delta: -Math.abs(delta), reason }))}>− 회수</button>
      </fieldset>
      <fieldset>
        <legend>식민지 소유·단계 변경</legend>
        <select value={colony} onChange={(e) => setColony(e.target.value)} aria-label="식민지">
          {Object.entries(COLONIES).map(([id, col]) => <option key={id} value={id}>{col.name}</option>)}
        </select>
        <select value={c.owner ?? ''} aria-label="소유국"
          onChange={(e) => run(dispatch({ type: 'HOST_SET_OWNER', colonyId: colony, owner: (e.target.value || null) as PlayerId | null, reason }))}>
          <option value="">소유국 없음</option>
          {alive.map((p) => <option key={p.id} value={p.id}>{NATIONS[p.id].name}</option>)}
        </select>
        <select value={c.stage} disabled={!c.owner} aria-label="단계"
          onChange={(e) => run(dispatch({ type: 'HOST_SET_STAGE', colonyId: colony, stage: Number(e.target.value), reason }))}>
          {COLONIES[colony].stages.map((st, i) => <option key={i} value={i}>{i}. {i === 0 ? '확보' : st.name}</option>)}
        </select>
      </fieldset>
      {msg && <p className="m-note">{msg}</p>}
    </div>
  );
}

function SettingsView({ game, onClose }: { game: GameState; onClose: () => void }) {
  const { dispatch, undo, past, timerRunning, setTimerRunning, quitToMenu, elapsedSec, session, setSession } = useGame();
  const st = game.settings;
  const toggleAi = (id: PlayerId) =>
    setSession({ ai: session.ai.includes(id) ? session.ai.filter((x) => x !== id) : [...session.ai, id] });
  return (
    <div className="adjust">
      {session.mode !== 'hotseat' && (
        <fieldset>
          <legend>자리 (사람 / AI)</legend>
          {game.players.filter((p) => !p.bankrupt).map((p) => {
            const isAi = session.ai.includes(p.id);
            const who = isAi ? 'AI' : session.mode === 'online' ? (session.seats?.[p.id] ? session.names?.[p.id] || '학생 기기' : '비어 있음') : '사람';
            return (
              <span key={p.id} className="seat-chip">
                <Flag id={p.id} size={14} /> {NATIONS[p.id].name}: <b>{who}</b>
                <button className="btn small" onClick={() => toggleAi(p.id)}>{isAi ? '사람이 하기' : 'AI에게 맡기기'}</button>
              </span>
            );
          })}
          {session.mode === 'online' && (
            <label className="field check">
              <input type="checkbox" checked={!!session.hostTakeover} onChange={(e) => setSession({ hostTakeover: e.target.checked })} />
              이 화면(전자칠판)에서 대신 조작 (학생 기기 연결이 끊겼을 때)
            </label>
          )}
        </fieldset>
      )}
      <fieldset>
        <legend>되돌리기</legend>
        <button className="btn" disabled={!past.length} onClick={undo}>↶ 한 단계 되돌리기 (남은 {past.length}회)</button>
        <span className="muted">최근 10개 행동까지 되돌릴 수 있습니다.</span>
      </fieldset>
      <fieldset>
        <legend>수업 타이머</legend>
        <label className="field">제한 시간(분, 0=끔)
          <input type="number" min={0} max={120} value={st.timeLimitMinutes}
            onChange={(e) => dispatch({ type: 'HOST_SETTINGS', settings: { timeLimitMinutes: Math.max(0, Number(e.target.value)) } })} />
        </label>
        <button className="btn small" onClick={() => setTimerRunning(!timerRunning)}>{timerRunning ? '⏸ 일시정지' : '▶ 다시 시작'}</button>
        <span className="muted">경과 {Math.floor(elapsedSec / 60)}분</span>
        <button className="btn small danger" disabled={game.timeUp} onClick={() => dispatch({ type: 'TIME_UP' })}>지금 종료(점수 순위)</button>
      </fieldset>
      <fieldset>
        <legend>규칙 설정</legend>
        <label className="field">출발 통행료(만원)
          <input type="number" min={0} value={st.passStartToll} onChange={(e) => dispatch({ type: 'HOST_SETTINGS', settings: { passStartToll: Math.max(0, Number(e.target.value)) } })} />
        </label>
        <label className="field">주사위
          <select value={st.diceCount ?? 1} onChange={(e) => dispatch({ type: 'HOST_SETTINGS', settings: { diceCount: Number(e.target.value) } })}>
            <option value={2}>2개</option>
            <option value={1}>1개</option>
          </select>
        </label>
        <label className="field">매각가 비율(%)
          <input type="number" min={0} max={100} step={10} value={Math.round(st.sellRatio * 100)} onChange={(e) => dispatch({ type: 'HOST_SETTINGS', settings: { sellRatio: Math.min(1, Math.max(0, Number(e.target.value) / 100)) } })} />
        </label>
        <label className="field check">
          <input type="checkbox" checked={st.quizEnabled} onChange={(e) => dispatch({ type: 'HOST_SETTINGS', settings: { quizEnabled: e.target.checked } })} />
          황금열쇠 전 OX 퀴즈
        </label>
        <label className="field check">
          <input type="checkbox" checked={st.developOnPassStart ?? false} onChange={(e) => dispatch({ type: 'HOST_SETTINGS', settings: { developOnPassStart: e.target.checked } })} />
          출발 통과 시 식민지 1곳 개발 (끄면 도착해야 개발)
        </label>
      </fieldset>
      <fieldset>
        <legend>게임</legend>
        <button className="btn danger" onClick={() => askConfirm('현재 게임을 끝내고 처음 화면으로 갈까요? (저장된 진행 상황이 사라집니다)', () => { quitToMenu(); onClose(); }, '새 게임')}>새 게임 (처음 화면)</button>
      </fieldset>
    </div>
  );
}
