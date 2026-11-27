import { COLONIES } from '../../data/gameData';
import { won } from '../../engine/selectors';

/** 식민화 단계별 비용·무역대금표. current = 현재 단계(없으면 -1) */
export default function StageTable({ colonyId, current = -1, highlight }: { colonyId: string; current?: number; highlight?: number }) {
  const col = COLONIES[colonyId];
  return (
    <table className="stage-table">
      <thead><tr><th>단계</th><th>비용</th><th>무역대금</th></tr></thead>
      <tbody>
        {col.stages.map((st, i) => (
          <tr key={i} className={`${i === current ? 'cur' : ''} ${i === highlight ? 'next' : ''} ${i <= current ? 'done' : ''}`}>
            <td>{i}. {i === 0 ? '식민지 확보' : st.name}</td>
            <td>{won(st.cost)}</td>
            <td>{won(st.toll)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
