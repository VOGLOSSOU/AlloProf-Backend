// Erreur metier "attendue" : son message est renvoye tel quel au client
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) { return new AppError(400, message, details); }
  static unauthorized(message = 'Non authentifie') { return new AppError(401, message); }
  static forbidden(message = 'Acces refuse') { return new AppError(403, message); }
  static notFound(message = 'Ressource introuvable') { return new AppError(404, message); }
  static conflict(message, details) { return new AppError(409, message, details); }
}

module.exports = AppError;
