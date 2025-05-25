declare module 'react-native-crypto-js' {
  interface WordArray {
    toString(): string;
  }

  interface CipherParams {
    toString(): string;
  }

  interface EncryptedMessage {
    toString(): string;
  }

  interface DecryptedMessage {
    toString(encoding?: any): string;
  }

  const CryptoJS: {
    AES: {
      encrypt(message: string, secretPassphrase: string): EncryptedMessage;
      decrypt(encryptedMessage: string, secretPassphrase: string): DecryptedMessage;
    };
    lib: {
      WordArray: {
        random(nBytes: number): WordArray;
      };
    };
    enc: {
      Utf8: any;
    };
  };

  export default CryptoJS;
}
