import { COLONIES, NATIONS, SPECIAL_TILES } from '../../data/gameData';
import { canApply } from '../../engine/reducer';
import { currentPlayer, getPlayer, josa, keyById, keyTitle, nationName, tileName, won } from '../../engine/selectors';
import type { GameState } from '../../engine/types';
import { useState } from 'react';
import { useGame } from '../../store/gameStore';
import { useControlCtx } from '../controlContext';
import { useCardVisibility } from '../useCardVisibility';
import ColonyIntro from './ColonyIntro';
import { tileImage, TILE_IMAGE } from '../tileInfo';
import DebtView from './DebtView';
import Flag from './Flag';
import KeyCard from './KeyCard';
import Modal from './Modal';
import NoticeView from './NoticeView';
import QuizView from './QuizView';
import RespondGate from './RespondGate';
import StageTable from './StageTable';
import StartDevelopView from './StartDevelopView';

export default function DecisionModal({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const ctl = useControlCtx();
  const canSee = useCardVisibility(game);
  // 이 기기에서 설명 카드를 이미 넘겼는지 / 한 화면 모드에서 카드를 펼쳤는지 (결정마다 logSeq가 다름)
  const [introSeq, setIntroSeq] = useState(-1);
  const [revealSeq, setRevealSeq] = useState(-1);
  const pd = game.pending;
  if (!pd) return null;
  const mine = ctl?.canControl ?? true;
  const intro = (colonyId: string, kind: 'buy' | 'develop') =>
    mine && introSeq !== game.logSeq ? (
      <Modal decision label="식민지 설명" tone="history" wide>
        <div className="m-who"><Flag id={p.id} size={22} /> {NATIONS[p.id].name}의 차례</div>
        <ColonyIntro game={game} colonyId={colonyId} kind={kind} onNext={() => setIntroSeq(game.logSeq)} />
      </Modal>
    ) : null;
  // 황금열쇠: 이 기기가 볼 수 있는지, 한 화면 모드면 펼치기 전인지
  const keyVisible = canSee(currentPlayer(game).id);
  const keyGate = keyVisible && !!ctl?.hotseat && revealSeq !== game.logSeq;
  const p = currentPlayer(game);
  const me = NATIONS[p.id];
  const who = (
    <div className="m-who"><Flag id={p.id} size={22} /> {me.name}의 차례</div>
  );

  switch (pd.type) {
    case 'BUY': {
      const first = intro(pd.colonyId, 'buy');
      if (first) return first;
      const col = COLONIES[pd.colonyId];
      const ok = p.money >= col.price;
      return (
        <Modal decision label="식민지 확보" tone="africa" wide>
          {who}
          <h2 className="m-title">{col.name} — 주인 없는 땅</h2>
          <p className="m-line">{won(col.price)}을 내고 식민지로 확보할 수 있습니다. 확보하면 다른 나라가 이곳에 설 때 무역대금 {won(col.stages[0].toll)}을 받습니다.</p>
          <StageTable colonyId={pd.colonyId} highlight={0} />
          <div className="btn-row">
            <button className="btn primary big" disabled={!ok} onClick={() => dispatch({ type: 'BUY_COLONY' })}>
              확보한다 <small>{won(col.price)}</small>
            </button>
            <button className="btn big" onClick={() => dispatch({ type: 'SKIP' })}>넘어간다</button>
          </div>
          {!ok && <p className="m-warn">자금이 부족합니다 (보유 {won(p.money)})</p>}
        </Modal>
      );
    }
    case 'DEVELOP': {
      const first = intro(pd.colonyId, 'develop');
      if (first) return first;
      const col = COLONIES[pd.colonyId];
      const c = game.colonies[pd.colonyId];
      const next = col.stages[c.stage + 1];
      const ok = canApply(game, { type: 'DEVELOP_COLONY' });
      return (
        <Modal decision label="식민화 진행" tone="good" wide>
          {who}
          <h2 className="m-title">{col.name} — 식민화 진행</h2>
          <p className="m-line">
            <b>{next.name}</b> ({won(next.cost)}) → 무역대금 {won(col.stages[c.stage].toll)} ⟶ <b>{won(next.toll)}</b>
          </p>
          <StageTable colonyId={pd.colonyId} current={c.stage} highlight={c.stage + 1} />
          <div className="btn-row">
            <button className="btn primary big" disabled={!ok} onClick={() => dispatch({ type: 'DEVELOP_COLONY' })}>
              개발한다 <small>{won(next.cost)}</small>
            </button>
            <button className="btn big" onClick={() => dispatch({ type: 'SKIP' })}>넘어간다</button>
          </div>
          {!ok && <p className="m-warn">자금이 부족합니다 (보유 {won(p.money)})</p>}
        </Modal>
      );
    }
    case 'START_DEVELOP':
      return (
        <Modal decision label="출발 통과 식민화" tone="good" wide>
          {who}
          <StartDevelopView key={game.logSeq} game={game} pd={pd} />
        </Modal>
      );
    case 'PAY_TOLL': {
      const isF = pd.colonyId === 'fashoda';
      const stageName = isF ? '파쇼다 점령지' : COLONIES[pd.colonyId].stages[game.colonies[pd.colonyId].stage].name;
      const canExempt = canApply(game, { type: 'PAY_TOLL', useExempt: true });
      return (
        <Modal decision label="무역대금 지불" tone="bad">
          {who}
          {isF && <img className="m-img" src={TILE_IMAGE.fashoda!.src} alt={TILE_IMAGE.fashoda!.alt} />}
          <h2 className="m-title">{tileName(p.position)} <span className="sub">({nationName(pd.owner)} 식민지, {stageName})</span></h2>
          <p className="m-line big-line">
            → 무역대금 <b>{won(pd.amount)}</b>을 <Flag id={pd.owner} size={18} /> {nationName(pd.owner)}에 지불합니다.
          </p>
          {pd.allied && <p className="m-note">동맹 중이라 {won(pd.baseAmount)}의 절반만 냅니다.</p>}
          {pd.then === 'DRAW_KEY' && <p className="m-note">🔑 대금을 낸 뒤 황금열쇠를 뽑습니다.</p>}
          <div className="btn-row">
            <button className="btn primary big" onClick={() => dispatch({ type: 'PAY_TOLL', useExempt: false })} autoFocus>지불</button>
            {canExempt && <button className="btn gold big" onClick={() => dispatch({ type: 'PAY_TOLL', useExempt: true })}>면제권 사용</button>}
          </div>
        </Modal>
      );
    }
    case 'FASHODA_OFFER': {
      const f = SPECIAL_TILES.fashoda;
      return (
        <Modal decision label="파쇼다 사건" tone="history" wide>
          {who}
          <img className="m-img" src={TILE_IMAGE.fashoda!.src} alt={TILE_IMAGE.fashoda!.alt} />
          <h2 className="m-title">파쇼다 사건 (1898)</h2>
          <p className="m-line">{f.text}</p>
          <FashodaMap />
          <p className="m-note">{f.historyNote}</p>
          <div className="btn-row">
            <button className="btn primary big" disabled={p.money < f.price} onClick={() => dispatch({ type: 'FASHODA', accept: true })}>
              파쇼다 점령 <small>프랑스에 {won(f.price)} · 무역대금 {won(f.toll)}</small>
            </button>
            <button className="btn big" onClick={() => dispatch({ type: 'FASHODA', accept: false })}>황금열쇠 뽑기</button>
          </div>
        </Modal>
      );
    }
    case 'NOTICE':
      return (
        <Modal decision label={pd.title} tone={pd.tone} wide={pd.tone === 'history'}>
          {who}
          <NoticeView key={game.logSeq} n={pd} image={pd.tone === 'history' ? tileImage(p.position) : undefined} onOk={() => dispatch({ type: 'ACK' })} />
        </Modal>
      );
    case 'KEY_DRAWN': {
      const k = keyById(pd.cardId);
      const nation = NATIONS[p.id].name;
      if (!keyVisible || keyGate) {
        return (
          <Modal decision label="황금열쇠" tone="gold">
            {who}
            <KeyCard cardId={pd.cardId} hidden />
            <p className="m-line center">{josa(`${nation}이(가) 황금열쇠를 뽑았습니다.`)}</p>
            <p className="m-note">카드 내용은 {nation}만 볼 수 있습니다.{k.holdable ? ' 보관했다가 쓸 때 다른 나라에 공개됩니다.' : ''}</p>
            <div className="btn-row">
              {keyGate
                ? <button className="btn gold big" onClick={() => setRevealSeq(game.logSeq)} autoFocus>{nation} 모둠만 보기</button>
                : <button className="btn primary big" onClick={() => dispatch({ type: 'ACK' })} autoFocus>확인</button>}
            </div>
          </Modal>
        );
      }
      return (
        <Modal decision label="황금열쇠" tone="gold">
          {who}
          <KeyCard cardId={pd.cardId} />
          <p className="m-line">
            {pd.kept
              ? `「${keyTitle(pd.cardId)}」 카드를 보관했습니다. ${['TOLL_EXEMPT', 'DEFENSE'].includes(k.effect) ? '필요한 상황이 오면 사용할지 묻습니다.' : '다음 차례부터 주사위를 굴리기 전에 사용할 수 있습니다.'}`
              : pd.result ?? ''}
          </p>
          {k.reflect && <p className="m-note reflect">{k.reflect}</p>}
          <div className="btn-row"><button className="btn primary big" onClick={() => dispatch({ type: 'ACK' })} autoFocus>확인{ctl?.hotseat ? ' (카드 덮기)' : ''}</button></div>
        </Modal>
      );
    }
    case 'KEY_CHOICE':
      return (
        <Modal decision label="황금열쇠 선택" tone="gold" wide>
          {who}
          <h2 className="m-title">황금열쇠 한 장을 고르세요</h2>
          {(!keyVisible || keyGate) && <p className="m-note">카드 내용은 {NATIONS[p.id].name}만 볼 수 있습니다.</p>}
          {keyGate
            ? <div className="btn-row"><button className="btn gold big" onClick={() => setRevealSeq(game.logSeq)} autoFocus>{NATIONS[p.id].name} 모둠만 보기</button></div>
            : (
              <div className="key-choice">
                {pd.cardIds.map((id) => <KeyCard key={id} cardId={id} hidden={!keyVisible} onClick={() => dispatch({ type: 'CHOOSE_KEY', cardId: id })} />)}
              </div>
            )}
        </Modal>
      );
    case 'QUIZ':
      return (
        <Modal decision label="퀴즈" tone="gold">
          {who}
          <QuizView key={pd.quizId + game.logSeq} quizId={pd.quizId} onAnswer={(a) => dispatch({ type: 'ANSWER_QUIZ', answer: a })} />
        </Modal>
      );
    case 'DEFENSE_PROMPT': {
      const d = getPlayer(game, pd.defender);
      const card = d.heldCards.find((id) => keyById(id).effect === 'DEFENSE');
      const cost = card ? keyById(card).cost ?? 0 : 0;
      return (
        <Modal decision label="방어 여부" tone="bad">
          <RespondGate key={game.logSeq} who={pd.defender} current={p.id}>
            <h2 className="m-title">{josa(`${nationName(pd.attacker)}이(가) ${COLONIES[pd.colonyId].name}에 전쟁을 선포했습니다!`)}</h2>
            <p className="m-line">{josa(`${nationName(pd.defender)}은(는)`)} 방어카드를 가지고 있습니다. 방어하면 {won(cost)}을 내고 식민지를 지킵니다.</p>
            <div className="btn-row">
              <button className="btn primary big" disabled={d.money < cost} onClick={() => dispatch({ type: 'RESPOND_DEFENSE', defend: true })}>방어한다 <small>{won(cost)}</small></button>
              <button className="btn big" onClick={() => dispatch({ type: 'RESPOND_DEFENSE', defend: false })}>방어하지 않는다</button>
            </div>
          </RespondGate>
        </Modal>
      );
    }
    case 'ALLIANCE_PROMPT':
      return (
        <Modal decision label="동맹 제안" tone="good">
          <RespondGate key={game.logSeq} who={pd.to} current={p.id}>
            <h2 className="m-title">{josa(`${nationName(pd.from)}이(가)`)} 동맹을 제안했습니다</h2>
            <p className="m-line">수락하면 {josa(`${nationName(pd.from)}이(가)`)} 2바퀴를 도는 동안 서로의 식민지에서 무역대금을 절반만 냅니다.</p>
            <div className="btn-row">
              <button className="btn primary big" onClick={() => dispatch({ type: 'RESPOND_ALLIANCE', accept: true })}>수락</button>
              <button className="btn big" onClick={() => dispatch({ type: 'RESPOND_ALLIANCE', accept: false })}>거절</button>
            </div>
          </RespondGate>
        </Modal>
      );
    case 'DEBT':
      return (
        <Modal decision label="자금 부족" tone="bad" wide>
          <DebtView game={game} d={pd} />
        </Modal>
      );
  }
}

/** 종단·횡단 정책 개념도 (실제 지도 아님) */
function FashodaMap() {
  return (
    <svg className="fashoda-map" viewBox="0 0 300 220" role="img" aria-label="영국 종단 정책과 프랑스 횡단 정책이 파쇼다에서 만나는 개념도">
      <path d="M118 12 C70 18 40 60 52 92 C58 110 90 118 104 140 C120 170 130 205 150 210 C178 200 200 150 214 120 C232 90 250 60 230 40 C210 20 160 8 118 12Z"
        fill="#e9dcb8" stroke="#8a7350" strokeWidth="2" />
      <line x1="185" y1="22" x2="150" y2="200" stroke="#C8102E" strokeWidth="5" strokeDasharray="10 6" markerEnd="url(#ar)" />
      <line x1="85" y1="30" x2="242" y2="150" stroke="#0055A4" strokeWidth="5" strokeDasharray="10 6" markerEnd="url(#ab)" />
      <circle cx="176" cy="80" r="9" fill="#fff" stroke="#2b2118" strokeWidth="3" />
      <text x="190" y="78" fontSize="15" fontWeight="700" fill="#2b2118">파쇼다</text>
      <text x="190" y="18" fontSize="13" fill="#9b0d22" fontWeight="700">카이로</text>
      <text x="96" y="214" fontSize="13" fill="#9b0d22" fontWeight="700">케이프타운</text>
      <text x="40" y="28" fontSize="13" fill="#003f7d" fontWeight="700">알제리</text>
      <text x="226" y="170" fontSize="13" fill="#003f7d" fontWeight="700">마다가스카르</text>
      <text x="8" y="130" fontSize="12" fill="#9b0d22">━ 영국 종단 정책</text>
      <text x="8" y="148" fontSize="12" fill="#003f7d">━ 프랑스 횡단 정책</text>
      <defs>
        <marker id="ar" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#C8102E" /></marker>
        <marker id="ab" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#0055A4" /></marker>
      </defs>
    </svg>
  );
}
