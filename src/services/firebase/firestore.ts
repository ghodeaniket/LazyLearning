import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

export type QueryOperator =
  | '<'
  | '<='
  | '=='
  | '>'
  | '>='
  | '!='
  | 'array-contains'
  | 'array-contains-any'
  | 'in'
  | 'not-in';

export interface QueryCondition {
  field: string;
  operator: QueryOperator;
  value: any;
}

export interface QueryOptions {
  where?: QueryCondition[];
  orderBy?: { field: string; direction?: 'asc' | 'desc' }[];
  limit?: number;
  startAfter?: any;
}

export class FirestoreService {
  private static instance: FirestoreService;
  private db = firestore();

  private constructor() {
    this.db.settings({
      persistence: true,
      cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
    });
  }

  static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  async get<T>(
    collection: string,
    docId: string,
  ): Promise<T | null> {
    try {
      const doc = await this.db.collection(collection).doc(docId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() } as T;
    } catch (error) {
      throw this.handleFirestoreError(error as Error);
    }
  }

  async create<T extends Record<string, any>>(
    collection: string,
    data: T,
  ): Promise<string> {
    try {
      const docRef = await this.db.collection(collection).add({
        ...data,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      throw this.handleFirestoreError(error as Error);
    }
  }

  async update<T extends Record<string, any>>(
    collection: string,
    docId: string,
    data: Partial<T>,
  ): Promise<void> {
    try {
      await this.db
        .collection(collection)
        .doc(docId)
        .update({
          ...data,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      throw this.handleFirestoreError(error as Error);
    }
  }

  async delete(collection: string, docId: string): Promise<void> {
    try {
      await this.db.collection(collection).doc(docId).delete();
    } catch (error) {
      throw this.handleFirestoreError(error as Error);
    }
  }

  async query<T>(
    collection: string,
    options: QueryOptions = {},
  ): Promise<T[]> {
    try {
      let query: FirebaseFirestoreTypes.Query = this.db.collection(
        collection,
      );

      if (options.where) {
        options.where.forEach(condition => {
          query = query.where(
            condition.field,
            condition.operator,
            condition.value,
          );
        });
      }

      if (options.orderBy) {
        options.orderBy.forEach(order => {
          query = query.orderBy(order.field, order.direction || 'asc');
        });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.startAfter) {
        query = query.startAfter(options.startAfter);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
    } catch (error) {
      throw this.handleFirestoreError(error as Error);
    }
  }

  subscribe<T>(
    collection: string,
    docId: string,
    onUpdate: (data: T | null) => void,
    onError?: (error: Error) => void,
  ): () => void {
    return this.db
      .collection(collection)
      .doc(docId)
      .onSnapshot(
        doc => {
          if (doc.exists) {
            onUpdate({ id: doc.id, ...doc.data() } as T);
          } else {
            onUpdate(null);
          }
        },
        error => {
          if (onError) {
            onError(this.handleFirestoreError(error as Error));
          }
        },
      );
  }

  subscribeToQuery<T>(
    collection: string,
    options: QueryOptions,
    onUpdate: (data: T[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    let query: FirebaseFirestoreTypes.Query = this.db.collection(
      collection,
    );

    if (options.where) {
      options.where.forEach(condition => {
        query = query.where(
          condition.field,
          condition.operator,
          condition.value,
        );
      });
    }

    if (options.orderBy) {
      options.orderBy.forEach(order => {
        query = query.orderBy(order.field, order.direction || 'asc');
      });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    return query.onSnapshot(
      snapshot => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        onUpdate(data);
      },
      error => {
        if (onError) {
          onError(this.handleFirestoreError(error as Error));
        }
      },
    );
  }

  private handleFirestoreError(error: Error): Error {
    const errorMessages: Record<string, string> = {
      'permission-denied': 'You do not have permission to perform this action',
      'not-found': 'Document not found',
      'already-exists': 'Document already exists',
      'resource-exhausted': 'Quota exceeded',
      'failed-precondition': 'Operation failed due to a precondition',
      'aborted': 'Operation was aborted',
      'out-of-range': 'Operation was attempted past the valid range',
      'unimplemented': 'Operation is not implemented',
      'internal': 'Internal error',
      'unavailable': 'Service is currently unavailable',
      'data-loss': 'Unrecoverable data loss or corruption',
    };

    const message = errorMessages[(error as any).code] || error.message;
    return new Error(message);
  }
}

export const firestoreService = FirestoreService.getInstance();
