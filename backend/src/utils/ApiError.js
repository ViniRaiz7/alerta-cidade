// Erro de aplicação com status HTTP embutido. Controllers e services lançam
// `throw new ApiError(404, 'Denúncia não encontrada')` e o errorHandler
// central (middlewares/errorHandler.js) transforma isso numa resposta JSON
// consistente, sem precisar de try/catch repetido em cada rota.

class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details) { return new ApiError(400, message, details); }
  static unauthorized(message = 'Não autenticado.') { return new ApiError(401, message); }
  static forbidden(message = 'Você não tem permissão para esta ação.') { return new ApiError(403, message); }
  static notFound(message = 'Recurso não encontrado.') { return new ApiError(404, message); }
  static conflict(message) { return new ApiError(409, message); }
}

module.exports = ApiError;
