import * as admin from 'firebase-admin';
import request from 'request';

// --- UTIL ---
const sleep = (ms = 0) =>
  new Promise((resolve) =>
    setTimeout(() => {
      resolve(true);
    }, ms)
  );

// --- SETUP ---
export const PROJECT_ID = 'fire-hose-admin-test';
export const FIRESTORE_EMULATOR_HOST = 'localhost:8080';

process.env.GCLOUD_PROJECT = PROJECT_ID;
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;

admin.initializeApp();
const db = admin.firestore();
export const getDb = () => db;

// --- CLEAR EMULATOR ---
export const clearFirestore = async () => {
  await request({
    url: `http://${FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    method: 'DELETE',
  });
  await sleep(10);
};
