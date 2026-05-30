import { auth, db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export async function reportAppError(error: any, context?: string, type: 'error' | 'activity' = 'error') {
  try {
    const logMessage = typeof error === 'string' ? error : (error?.message || String(error));
    const logData = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
      message: logMessage,
      context: context || 'General App Event',
      timestamp: new Date().toLocaleTimeString('ta-IN'),
      type: type
    };
    
    if (type === 'error') {
      console.error(`[SYSTEM ERROR]: ${logData.context} -> ${logData.message}`);
    } else {
      console.log(`[SYSTEM INFO]: ${logData.context} -> ${logData.message}`);
    }

    // Save simplified log for UI
    try {
      const existingLogsRaw = localStorage.getItem('app_logs');
      const logs = existingLogsRaw ? JSON.parse(existingLogsRaw) : [];
      logs.unshift(logData);
      localStorage.setItem('app_logs', JSON.stringify(logs.slice(0, 100)));
    } catch (saveErr) {}
  } catch (e) {
    console.error('Logging failure:', e);
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isDesktop = typeof window !== 'undefined' && window.location.protocol === 'file:';
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: (auth.currentUser as any)?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: (auth.currentUser as any)?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  
  console.error(`[Firestore ${operationType} Error]:`, errInfo);
  
  // CRITICAL: In Desktop/Electron mode, we suppress these errors COMPLETELY 
  // because we expect permission-denied cases (local anonymous user).
  if (isDesktop) {
    console.log("Desktop Mode Safe-Guard: Suppressing Firestore exception to keep UI stable.");
    return; 
  }
  
  reportAppError(errInfo, `Firestore ${operationType} at ${path}`);
  throw new Error(JSON.stringify(errInfo));
}
