import { useState } from 'react';
import { QUIZZES } from '../../data/quiz';

export default function QuizView({ quizId, onAnswer }: { quizId: string; onAnswer: (a: boolean) => void }) {
  const q = QUIZZES.find((x) => x.id === quizId)!;
  const [picked, setPicked] = useState<boolean | null>(null);
  const correct = picked !== null && picked === q.answer;
  return (
    <>
      <h2 className="m-title">황금열쇠 퀴즈 · {q.topic}</h2>
      <p className="m-line quiz-q">{q.q}</p>
      {picked === null ? (
        <div className="btn-row">
          <button className="btn ox o" onClick={() => setPicked(true)}>O</button>
          <button className="btn ox x" onClick={() => setPicked(false)}>X</button>
        </div>
      ) : (
        <>
          <p className={`quiz-result ${correct ? 'ok' : 'no'}`}>{correct ? '⭕ 정답! 황금열쇠 2장 중 1장을 고르세요.' : `❌ 아쉬워요. 정답은 ${q.answer ? 'O' : 'X'}`}</p>
          <p className="m-note">{q.explain}</p>
          <div className="btn-row">
            <button className="btn primary big" onClick={() => onAnswer(picked)} autoFocus>{correct ? '카드 고르기' : '황금열쇠 뽑기'}</button>
          </div>
        </>
      )}
    </>
  );
}
