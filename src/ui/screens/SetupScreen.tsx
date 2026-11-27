import { useState } from 'react';
import { NATIONS, RULES, type PlayerNation } from '../../data/gameData';
import { won } from '../../engine/selectors';
import type { Settings } from '../../engine/types';
import { useNet } from '../../net/netStore';
import { makeRoomCode } from '../../net/transport';
import { useGame, type GameMode } from '../../store/gameStore';
import Flag from '../components/Flag';

const ALL = Object.keys(NATIONS) as PlayerNation[];
const TITLE: Record<GameMode, string> = { single: '싱글모드', online: '모둠모드 — 방 만들기', hotseat: '한 화면에서 함께하기' };

export default function SetupScreen({ mode, onBack }: { mode: GameMode; onBack: () => void }) {
  const newGame = useGame((s) => s.newGame);
  const [nations, setNations] = useState<PlayerNation[]>(ALL);
  const [me, setMe] = useState<PlayerNation>('UK');
  const [money, setMoney] = useState(RULES.startingMoney);
  const [minutes, setMinutes] = useState(RULES.timeLimitMinutes);
  const [quiz, setQuiz] = useState(false);
  const [passDev, setPassDev] = useState(true);
  const [dice, setDice] = useState(RULES.diceCount);
  const [pin, setPin] = useState('0000');
  const [randomOrder, setRandomOrder] = useState(true);
  const [doubleAgain, setDoubleAgain] = useState(true);
  const toggle = (id: PlayerNation) =>
    setNations((ns) => (ns.includes(id) ? ns.filter((x) => x !== id) : ALL.filter((x) => ns.includes(x) || x === id)));

  const settings: Partial<Settings> = { startingMoney: money, timeLimitMinutes: Math.max(0, minutes), quizEnabled: quiz, developOnPassStart: passDev, diceCount: dice, randomOrder, doubleRollAgain: doubleAgain };
  const start = () => {
    if (mode === 'single') newGame(ALL, settings, pin, { mode: 'single', me, ai: ALL.filter((x) => x !== me) });
    else if (mode === 'hotseat') newGame(nations, settings, pin, { mode: 'hotseat', ai: [] });
    else useNet.getState().set({ role: 'host', room: makeRoomCode(), hostSetup: { settings, pin }, seats: {}, names: {}, aiFill: true });
  };

  return (
    <main className="setup title-bg">
      <div className="setup-card">
        <button className="btn small back" onClick={onBack}>← 처음으로</button>
        <h1>제국주의 마블</h1>
        <p className="mode-title">{TITLE[mode]}</p>

        {mode === 'single' && (
          <>
            <h2>내가 맡을 나라 <small>(나머지 3개국은 AI가 둡니다)</small></h2>
            <div className="nation-pick">
              {ALL.map((id) => (
                <button key={id} className={`nation-btn ${me === id ? 'on' : ''}`} aria-pressed={me === id}
                  style={{ '--owner': NATIONS[id].color } as React.CSSProperties} onClick={() => setMe(id)}>
                  <Flag id={id} size={40} />
                  <span>{NATIONS[id].name}</span>
                  <small>{me === id ? '나' : 'AI'}</small>
                </button>
              ))}
            </div>
          </>
        )}
        {mode === 'hotseat' && (
          <>
            <h2>참여 국가 <small>(모둠당 1개국, 한 화면에서 차례대로)</small></h2>
            <div className="nation-pick">
              {ALL.map((id) => (
                <button key={id} className={`nation-btn ${nations.includes(id) ? 'on' : ''}`} aria-pressed={nations.includes(id)}
                  style={{ '--owner': NATIONS[id].color } as React.CSSProperties} onClick={() => toggle(id)}>
                  <Flag id={id} size={40} />
                  <span>{NATIONS[id].name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {mode === 'online' && (
          <p className="lead">방을 만들면 6자리 코드가 나옵니다. 학생들은 각자 기기에서 [방 참여하기]로 코드를 입력하고 나라를 고릅니다.
            이 기기(전자칠판)는 게임판을 보여 줍니다. 돈 계산·국제은행 업무는 모두 자동으로 처리됩니다.</p>
        )}

        <div className="setup-grid">
          <label className="field">시작 자금 (만원)
            <input type="number" min={100} step={50} value={money} onChange={(e) => setMoney(Number(e.target.value))} />
            <small>{won(money)} · 권장 350만원 (원본 500만원)</small>
          </label>
          <label className="field">수업 타이머 (분, 0=끔)
            <input type="number" min={0} max={120} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            <small>끝나면 식민지 점수 1위 승리</small>
          </label>
          <label className="field">주사위
            <select value={dice} onChange={(e) => setDice(Number(e.target.value))}>
              <option value={2}>2개 (권장 · 30분 수업)</option>
              <option value={1}>1개 (원본 규칙 · 느림)</option>
            </select>
            <small>2개면 30분에 약 4~5바퀴</small>
          </label>
          <label className="field">교사 PIN (4자리)
            <input inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
            <small>[⚙ 관리] 화면 잠금용 · 기본 0000</small>
          </label>
          <label className="field check">
            <input type="checkbox" checked={quiz} onChange={(e) => setQuiz(e.target.checked)} />
            황금열쇠 전 OX 퀴즈 <small>맞히면 2장 중 선택</small>
          </label>
          <label className="field check">
            <input type="checkbox" checked={passDev} onChange={(e) => setPassDev(e.target.checked)} />
            출발 통과 시 식민지 1곳 개발 <small>끄면 도착해야만 개발</small>
          </label>
          <label className="field check">
            <input type="checkbox" checked={randomOrder} onChange={(e) => setRandomOrder(e.target.checked)} />
            차례 순서 추첨 <small>끄면 영국→프랑스→독일→미국</small>
          </label>
          <label className="field check">
            <input type="checkbox" checked={doubleAgain} onChange={(e) => setDoubleAgain(e.target.checked)} />
            더블이면 한 번 더 <small>주사위 2개일 때</small>
          </label>
        </div>

        <button className="btn primary huge" disabled={(mode === 'hotseat' && nations.length < 2) || pin.length !== 4} onClick={start}>
          {mode === 'online' ? '방 만들기' : '게임 시작'}
        </button>
        {mode === 'hotseat' && nations.length < 2 && <p className="m-warn">2개국 이상 선택하세요.</p>}
      </div>
    </main>
  );
}
