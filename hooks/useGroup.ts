
import { useState, useEffect, useMemo } from 'react';
import {
  doc, collection, onSnapshot, query, orderBy,
  updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp,
  where, getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';

// ── Types ────────────────────────────────────────────────────────────────────
export type GroupPrivacy = 'public' | 'private';
export type GroupCategory =
  | 'Department' | 'Faculty' | 'Course' | 'Study'
  | 'Project' | 'Sports' | 'Religious' | 'Club'
  | 'Marketplace' | 'Community';
export type MemberRole = 'owner' | 'member';

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  coverPhoto: string | null;
  ownerId: string;
  ownerName: string;
  category: GroupCategory;
  privacy: GroupPrivacy;
  department: string;
  tags: string[];
  rules: string[];
  members: string[];        // array of uids
  memberCount: number;
  postsCount: number;
  createdAt: any;
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  content: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  isAnnouncement: boolean;
  likes: string[];
  commentsCount: number;
  createdAt: any;
}

export interface GroupMember {
  id: string;       // document id
  userId: string;
  groupId: string;
  role: MemberRole;
  displayName: string;
  photoURL: string | null;
  department: string;
  joinedAt: any;
}

// ── useGroup hook ─────────────────────────────────────────────────────────────
// Provides real-time group data, membership status, and convenience actions.
export function useGroup(groupId: string) {
  const { user, profile } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);

  // Live group doc
  useEffect(() => {
    if (!groupId) return;
    return onSnapshot(doc(db, 'groups', groupId), snap => {
      if (snap.exists()) setGroup({ id: snap.id, ...snap.data() } as Group);
    });
  }, [groupId]);

  // Live members
  useEffect(() => {
    if (!groupId) return;
    const q = query(collection(db, 'groupMembers'), where('groupId', '==', groupId));
    return onSnapshot(q, snap => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupMember)));
    });
  }, [groupId]);

  // Live posts
  useEffect(() => {
    if (!groupId) return;
    const q = query(collection(db, 'groupPosts'), where('groupId', '==', groupId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as GroupPost)));
    });
  }, [groupId]);

  const isMember = useMemo(() => group?.members?.includes(user?.uid || ''), [group, user]);
  const isOwner  = useMemo(() => group?.ownerId === user?.uid, [group, user]);
  const myRole: MemberRole = isOwner ? 'owner' : 'member';

  // ── Permissions (2-role system, extend later) ─────────────────────────────
  const can = useMemo(() => ({
    post:              !!isMember,
    deleteAnyPost:     isOwner,
    pinPost:           isOwner,
    editGroup:         isOwner,
    deleteGroup:       isOwner,
    removeMembers:     isOwner,
    manageAnnounce:    isOwner,
    viewMembers:       !!isMember,
  }), [isMember, isOwner]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const join = async () => {
    if (!group || !user) return;
    await updateDoc(doc(db, 'groups', group.id), {
      members: arrayUnion(user.uid),
      memberCount: (group.memberCount || 0) + 1,
    });
    await addDoc(collection(db, 'groupMembers'), {
      userId: user.uid, groupId: group.id, role: 'member' as MemberRole,
      displayName: profile?.fullName || 'User',
      photoURL: profile?.photoURL || null,
      department: profile?.department || '',
      joinedAt: serverTimestamp(),
    });
    addDoc(collection(db, 'notifications'), {
      type: 'group_invite', recipientId: group.ownerId,
      senderId: user.uid, senderName: profile?.fullName || 'User',
      message: `${profile?.fullName || 'User'} joined your group "${group.name}"`,
      groupId: group.id, read: false, createdAt: serverTimestamp(),
    }).catch(() => {});
  };

  const leave = async () => {
    if (!group || !user || isOwner) return;
    await updateDoc(doc(db, 'groups', group.id), {
      members: arrayRemove(user.uid),
      memberCount: Math.max(0, (group.memberCount || 1) - 1),
    });
  };

  return { group, members, posts, isMember, isOwner, myRole, can, join, leave };
}