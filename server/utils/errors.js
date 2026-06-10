class InsufficientBalanceError extends Error {
  constructor(message = 'Insufficient balance') {
    super(message);
    this.name = 'InsufficientBalanceError';
    this.status = 400;
  }
}

module.exports = { InsufficientBalanceError };