class ErrorForNext {
  message: string;
  statusCode: number;
  errorCode: number;
  onFunction: string;
  onFile: string;
  originalError: any;
  errorObject: Record<string, any>;
  logMessage: string;

  constructor(
    message: string,
    statusCode: number,
    errorCode: number,
    onFunction: string,
    onFile: string,
  ) {
    this.message = message;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.onFunction = onFunction;
    this.onFile = onFile;
  }

  setMessage(message: string) {
    this.message = message;
    return this;
  }

  setOriginalError(originalError: any) {
    this.originalError = originalError;
    return this;
  }

  setLogMessage(logMessage: string) {
    this.logMessage = logMessage;
    return this;
  }

  setErrorObject(errorObject: Record<string, any>) {
    this.errorObject = errorObject;
    return this;
  }

  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      onFunction: this.onFunction,
      onFile: this.onFile,
      logMessage: this.logMessage,
      errorObject: this.errorObject,
      originalError: this.originalError,
    };
  }
}

export default ErrorForNext;
