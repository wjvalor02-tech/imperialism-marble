import { BOARD, COLONIES, NATIONS, SPECIAL_TILES } from '../../data/gameData';
import { won } from '../../engine/selectors';
import type { GameState } from '../../engine/types';
import { tileImage, tileTitle } from '../tileInfo';
import Flag from './Flag';
import Modal from './Modal';
import StageTable from './StageTable';

/** 칸을 눌렀을 때 보는 식민지/특수칸 카드 */
export default function ColonyModal({ game, index, onClose }: { game: GameState; index: number; onClose: () => void }) {
  const t = BOARD[index];
  if (t.kind === 'colony') {
    const id = t.colonyId as string;
    const col = COLONIES[id];
    const c = game.colonies[id];
    return (
      <Modal label={col.name} tone="history" wide onClose={onClose}>
        <h2 className="m-title">{col.name} <span className="sub">{col.region === 'africa' ? '아프리카' : col.region === 'asia' ? '아시아' : '오세아니아'} · {won(col.price)}</span></h2>
        <p className="m-owner">
          {c.owner ? <><Flag id={c.owner} size={18} /> 지금 {NATIONS[c.owner].name}의 식민지</> : '아직 주인이 없습니다'}
          {c.earned > 0 && <span> · 지금까지 빠져나간 무역대금 {won(c.earned)}</span>}
        </p>
        <p className="m-line">{col.history}</p>
        <p className="m-note">실제 역사에서의 지배국: <b>{col.historicalRuler}</b></p>
        <StageTable colonyId={id} current={c.owner ? c.stage : -1} />
      </Modal>
    );
  }
  const info = t.kind === 'start' ? null : SPECIAL_TILES[t.kind];
  const img = tileImage(index);
  return (
    <Modal label={tileTitle(index)} tone="history" onClose={onClose}>
      {img && <img className="m-img" src={img.src} alt={img.alt} />}
      <h2 className="m-title">{tileTitle(index)}</h2>
      {info ? (
        <>
          <p className="m-line">{info.text}</p>
          <p className="m-note">{info.historyNote}</p>
          {t.kind === 'fashoda' && game.fashoda.owner && <p className="m-owner"><Flag id={game.fashoda.owner} size={18} /> {NATIONS[game.fashoda.owner].name} 점령 중 · 무역대금 {won(SPECIAL_TILES.fashoda.toll)}</p>}
        </>
      ) : (
        <p className="m-line">1바퀴 돌 때마다(출발을 지날 때마다) 통행료 {won(game.settings.passStartToll)}을 국제은행에 냅니다. 대출이 있으면 {won(game.settings.loanRepayment)}씩 함께 갚습니다.</p>
      )}
    </Modal>
  );
}
