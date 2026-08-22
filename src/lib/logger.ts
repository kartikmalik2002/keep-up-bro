/**
 * A lightweight structured logger for the application.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class LoggerUtility {
  private formatMessage(level: LogLevel, message: string, ...optionalParams: any[]) {
    const timestamp = new Date().toISOString();
    
    // Stringify objects if present
    const params = optionalParams.map(param => 
      typeof param === 'object' ? JSON.stringify(param, null, 2) : param
    );

    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${params.join(' ')}`.trim();
  }

  debug(message: string, ...optionalParams: any[]) {
    if (__DEV__) {
      console.log(this.formatMessage('debug', message, ...optionalParams));
    }
  }

  info(message: string, ...optionalParams: any[]) {
    console.log(this.formatMessage('info', message, ...optionalParams));
  }

  warn(message: string, ...optionalParams: any[]) {
    console.warn(this.formatMessage('warn', message, ...optionalParams));
  }

  error(message: string, ...optionalParams: any[]) {
    console.error(this.formatMessage('error', message, ...optionalParams));
  }
}

export const Logger = new LoggerUtility();
