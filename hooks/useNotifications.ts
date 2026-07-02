
import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  updateDoc, doc, limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string | null;   // Cloudinary URL
  recipientId?: string;
  global?: boolean;
  read: boolean;
  createdAt: any;
  postId?: string;
  videoId?: string;
  groupId?: string;
  chatRoomId?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(60)
    );
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as AppNotification))
        .filter(n => n.global === true || n.recipientId === user.uid);
      setNotifications(all);
      setUnreadCount(all.filter(n => !n.read).length);
    });
    return unsub;
  }, [user]);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
  };

  const markRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  return { notifications, unreadCount, markAllRead, markRead };
}