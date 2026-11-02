/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  getDocFromServer,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { CustomCharacter, User } from '../types';

/**
 * Validate Firestore connection on boot per Firebase skill requirements
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Attempt reading test path to confirm cloud database connectivity
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('[Firestore] Client is offline or database initializing.');
      return false;
    }
    // Permissions error or non-existent doc is fine, connection exists
    return true;
  }
}

/**
 * Sync user profile to Cloud Firestore so account exists across all hosts
 */
export async function syncUserProfileToCloud(user: User): Promise<void> {
  if (!user || !user.id) return;
  try {
    const userRef = doc(db, 'users', user.id);
    const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 1500));
    await Promise.race([
      setDoc(
        userRef,
        {
          userId: user.id,
          username: user.username,
          email: user.email || '',
          displayName: user.displayName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
      timeoutPromise,
    ]);
  } catch (err) {
    // Non-blocking background sync
  }
}

/**
 * Load all custom characters for the current user from Cloud Firestore
 */
export async function loadUserCharactersFromCloud(userId: string): Promise<CustomCharacter[]> {
  if (!userId) return [];
  try {
    const colRef = collection(db, 'users', userId, 'characters');
    const snapshot = await getDocs(colRef);
    const results: CustomCharacter[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      results.push({
        id: data.id || d.id,
        name: data.name || '角色',
        voiceCode: data.voiceCode || 'zh-CN-YunxiNeural',
        displayName: data.displayName || '雲希',
        color: data.color || '#f59e0b',
        gender: data.gender || 'male',
        rate: data.rate || '+0%',
        pitch: data.pitch || '+0Hz',
        description: data.description || '',
        createdAt: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
      });
    });
    return results;
  } catch (err) {
    console.warn('[CloudSync] loadUserCharacters warning:', err);
    return [];
  }
}

/**
 * Save or update a character in Cloud Firestore
 */
export async function saveUserCharacterToCloud(userId: string, character: CustomCharacter): Promise<void> {
  if (!userId || !character.id) return;
  try {
    const charRef = doc(db, 'users', userId, 'characters', character.id);
    await setDoc(
      charRef,
      {
        ...character,
        userId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[CloudSync] saveUserCharacter warning:', err);
  }
}

/**
 * Delete a character from Cloud Firestore
 */
export async function deleteUserCharacterFromCloud(userId: string, characterId: string): Promise<void> {
  if (!userId || !characterId) return;
  try {
    const charRef = doc(db, 'users', userId, 'characters', characterId);
    await deleteDoc(charRef);
  } catch (err) {
    console.warn('[CloudSync] deleteUserCharacter warning:', err);
  }
}
