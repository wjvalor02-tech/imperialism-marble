import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 빌드 결과(dist/index.html) 하나만 있으면 인터넷 없이 더블클릭으로 실행된다.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  // PPT를 열어 두면 생기는 Office 임시 파일(잠김) 때문에 개발 서버가 꺼지지 않게 감시에서 제외
  server: { watch: { ignored: ['**/*.tmp', '**/~$*', '**/*.pptx', '**/*.md', '**/dist/**'] } },
  test: { environment: 'node' },
});
