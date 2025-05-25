declare global {
  namespace NodeJS {
    interface Timeout {}
  }

  interface HeadersInit_ extends HeadersInit {}

  var fetch: typeof globalThis.fetch;
}

export {};
