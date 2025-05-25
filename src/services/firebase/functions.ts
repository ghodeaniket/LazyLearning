import functions from '@react-native-firebase/functions';

export interface FunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class FunctionsService {
  private static instance: FunctionsService;
  private functionsInstance = functions();

  private constructor() {
    if (__DEV__) {
      this.functionsInstance.useEmulator('localhost', 5001);
    }
  }

  static getInstance(): FunctionsService {
    if (!FunctionsService.instance) {
      FunctionsService.instance = new FunctionsService();
    }
    return FunctionsService.instance;
  }

  async call<TRequest = any, TResponse = any>(
    functionName: string,
    data?: TRequest,
  ): Promise<FunctionResponse<TResponse>> {
    try {
      const callable = this.functionsInstance.httpsCallable(functionName);
      const result = await callable(data);
      return result.data as FunctionResponse<TResponse>;
    } catch (error) {
      throw this.handleFunctionError(error as Error);
    }
  }

  async callWithAuth<TRequest = any, TResponse = any>(
    functionName: string,
    data?: TRequest,
  ): Promise<FunctionResponse<TResponse>> {
    try {
      const callable = this.functionsInstance.httpsCallable(functionName, {
        timeout: 30000,
      });
      const result = await callable(data);
      return result.data as FunctionResponse<TResponse>;
    } catch (error) {
      throw this.handleFunctionError(error as Error);
    }
  }

  async callWithRetry<TRequest = any, TResponse = any>(
    functionName: string,
    data?: TRequest,
    maxRetries: number = 3,
  ): Promise<FunctionResponse<TResponse>> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.call<TRequest, TResponse>(functionName, data);
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await this.delay(Math.pow(2, i) * 1000);
        }
      }
    }

    throw lastError || new Error('Function call failed after retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleFunctionError(error: Error): Error {
    const errorMessages: Record<string, string> = {
      'functions/cancelled': 'Operation was cancelled',
      'functions/unknown': 'Unknown error occurred',
      'functions/invalid-argument': 'Invalid argument provided',
      'functions/deadline-exceeded': 'Function execution timeout',
      'functions/not-found': 'Function not found',
      'functions/already-exists': 'Resource already exists',
      'functions/permission-denied': 'Permission denied',
      'functions/resource-exhausted': 'Resource exhausted',
      'functions/failed-precondition': 'Precondition failed',
      'functions/aborted': 'Operation aborted',
      'functions/out-of-range': 'Out of range',
      'functions/unimplemented': 'Not implemented',
      'functions/internal': 'Internal error',
      'functions/unavailable': 'Service unavailable',
      'functions/data-loss': 'Data loss',
      'functions/unauthenticated': 'Unauthenticated',
    };

    const message = errorMessages[(error as any).code] || error.message;
    return new Error(message);
  }
}

export const functionsService = FunctionsService.getInstance();
