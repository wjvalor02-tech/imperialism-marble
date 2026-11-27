import { COLONIES, NATIONS } from '../../data/gameData';
import { askConfirm } from '../confirm';
import { won } from '../../engine/selectors';
import type { GameState } from '../../engine/types';
import { leaveRoom } from '../../net/client';
import { useNet } from '../../net/netStore';
import { useGame } from '../../store/gameStore';
import Flag from '../components/Flag';

const QUESTIONS = [
  '① 게임에서 가장 많은 돈을 벌어 준 식민지는 어디였고, 그곳 사람들의 삶은 어땠을까?',
  '② 시암·에티오피아·라이베리아는 어떻게 독립을 지킬 수 있었을까?',
  '③ 파쇼다 사건처럼 열강끼리 충돌하면 식민지 사람들의 의사는 반영되었을까?',
];

export default function ReflectionScreen({ game }: { game: GameState }) {
  const { reflections, setReflection, quitToMenu } = useGame();
  const isClient = useNet((s) => s.role) === 'client';
  const cols = Object.entries(COLONIES);
  const top = [...cols].sort((a, b) => game.colonies[b[0]].earned - game.colonies[a[0]].earned)[0];
  const totalDrain = game.players.reduce((s, p) => s + p.tollReceived, 0); // 파쇼다 무역대금 포함

  return (
    <main className="reflect">
      <header className="reflect-head">
        <h1>📝 성찰 활동 — 식민지 사람들의 입장에서</h1>
        <p>게임 속 '무역대금'은 실제 역사에서 식민지에서 빠져나간 부(富)를 상징합니다. 그 돈은 강제노동, 무거운 세금, 헐값에 빼앗긴 자원에서 나왔습니다.</p>
      </header>

      <section className="reflect-sec">
        <h2>1. 우리 나라가 거둔 무역대금</h2>
        <div className="drain-grid">
          {game.players.map((p) => (
            <div key={p.id} className="drain" style={{ '--owner': NATIONS[p.id].color } as React.CSSProperties}>
              <Flag id={p.id} size={28} />
              <b>{NATIONS[p.id].name}</b>
              <span className="drain-amt">{won(p.tollReceived)}</span>
              <small>식민지에서 빠져나간 부</small>
            </div>
          ))}
        </div>
        <p className="m-note">이번 게임에서 식민지들로부터 빠져나간 무역대금은 모두 <b>{won(totalDrain)}</b>입니다.
          {top && game.colonies[top[0]].earned > 0 && <> 가장 많이 빠져나간 곳은 <b>{top[1].name}</b>({won(game.colonies[top[0]].earned)})입니다.</>}</p>
      </section>

      <section className="reflect-sec">
        <h2>2. 게임 속 지배국 vs 실제 역사의 지배국</h2>
        <div className="scroll-box">
          <table className="compare-table">
            <thead><tr><th>지역</th><th>게임에서 (최종)</th><th>게임 중 거쳐 간 나라</th><th>실제 역사</th><th>빠져나간 무역대금</th></tr></thead>
            <tbody>
              {cols.map(([id, col]) => {
                const c = game.colonies[id];
                const same = c.owner && col.historicalRuler.includes(NATIONS[c.owner].name);
                return (
                  <tr key={id}>
                    <td><b>{col.name}</b></td>
                    <td>{c.owner ? <><Flag id={c.owner} size={14} /> {NATIONS[c.owner].name}</> : <span className="muted">주인 없음</span>}</td>
                    <td>{c.everOwned.length ? c.everOwned.map((o) => NATIONS[o].name).join(' → ') : '—'}</td>
                    <td>{col.historicalRuler} {c.owner && <span className={`badge ${same ? 'ally' : 'warn'}`}>{same ? '같음' : '다름'}</span>}</td>
                    <td>{c.earned ? won(c.earned) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted">콩고(벨기에)·리비아(이탈리아)·인도네시아(네덜란드)처럼 게임에 없는 나라가 실제로 지배한 곳도 있습니다.</p>
      </section>

      <section className="reflect-sec">
        <h2>3. 생각해 보기</h2>
        {QUESTIONS.map((q, i) => (
          <label key={i} className="q-field">
            <span>{q}</span>
            <textarea rows={3} value={reflections[`q${i}`] ?? ''} onChange={(e) => setReflection(`q${i}`, e.target.value)} placeholder="모둠의 생각을 적어 보세요" />
          </label>
        ))}
        <p className="muted">답변은 이 기기에만 저장됩니다.</p>
      </section>

      <div className="btn-row no-print">
        <button className="btn primary big" onClick={() => window.print()}>🖨 인쇄 / PDF로 활동지 저장</button>
        {isClient
          ? <button className="btn big" onClick={() => leaveRoom()}>방 나가기</button>
          : <button className="btn big" onClick={() => askConfirm('새 게임을 시작할까요? 이 게임 기록과 답변이 지워집니다.', quitToMenu, '새 게임')}>새 게임</button>}
      </div>
    </main>
  );
}
