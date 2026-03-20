import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export async function logActivity(taskId: string, userId: string, content: string) {
  try {
    const userName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User';
    await addDoc(collection(db, 'activities'), {
      taskId,
      userId,
      userName,
      type: 'system',
      content,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
