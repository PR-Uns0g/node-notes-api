class ApiError extends Error {
  constructor(statusCode, message, { headers = {}, operation } = {}) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.headers = headers;
    this.operation = operation;
  }
}

module.exports = { ApiError };