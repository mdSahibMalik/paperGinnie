// class ApiErrorHandler extends Error {
//   constructor(statusCode, message = "Something went wrong", error = [], stack="") {
//     super(message);
//     this.statusCode = statusCode;
//     this.success = false;
//     this.error = error;

//     if (stack) {
//       this.stack = stack;
//     } else {
//       Error.captureStackTrace(this, this.constructor);
//     }
//   }
// }

//! another one
class ApiErrorHandler extends Error {
  constructor(statusCode, message = "Something went wrong", stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiErrorHandler };


class ApiErrorHandler1 extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    error = [],
    stack
  ) {
    super(message);

    this.statusCode = statusCode;
    this.message = message;
    this.data = null;
    this.success = false;
    this.error = error;

    this.stack = stack || new Error().stack;
  }
}

export { ApiErrorHandler1 };
