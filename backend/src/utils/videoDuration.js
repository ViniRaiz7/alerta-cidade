// Descobre a duração (em segundos) de um arquivo de vídeo usando o binário
// `ffprobe` (parte do ffmpeg), caso ele esteja instalado no servidor.
//
// Isso é uma camada extra de segurança: o front-end já limita a gravação e a
// seleção de vídeos a 3 minutos, mas nada impede alguém de chamar a API
// diretamente com um arquivo maior. Ainda assim, ffmpeg é uma dependência de
// sistema (não do Node), então essa checagem é "best-effort": se o binário
// não existir, avisamos no log e deixamos passar em vez de derrubar o upload
// — ver README (seção "Limitações conhecidas") para como habilitar em produção.

const { execFile } = require('child_process');

function getVideoDurationSeconds(filePath) {
  return new Promise((resolve) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
      { timeout: 10000 },
      (err, stdout) => {
        if (err) {
          console.warn('[videoDuration] ffprobe indisponível ou falhou — pulando validação de duração:', err.message);
          return resolve(null); // null = "não foi possível verificar", não "inválido"
        }
        const seconds = parseFloat(stdout);
        resolve(Number.isFinite(seconds) ? Math.round(seconds) : null);
      }
    );
  });
}

module.exports = { getVideoDurationSeconds };
