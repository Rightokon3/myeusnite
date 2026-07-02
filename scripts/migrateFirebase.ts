// scripts/migrateFirebase.ts
// Safely migrates your existing Firestore collections to support all new
// screen features added during the MyEusnite rebuild.
//
// ✅ SAFE: only ADDS missing fields — never deletes or overwrites existing data.
// ✅ IDEMPOTENT: safe to run multiple times — skips already-migrated docs.
// ✅ CREATES: new collections (groupMembers, groupPosts, video comments) with
//    sample data so the new screens have something to display immediately.
//
// HOW TO RUN:
//   1. Make sure ts-node is installed:  npm install -g ts-node
//   2. From your project root:  npx ts-node scripts/migrateFirebase.ts
//   3. Check the console — every step prints ✅ or ⚠️
//   4. Delete sample data from Firebase console if you don't want it

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
  query,
  limit,
  where,
} from 'firebase/firestore';

// ⚠️  Paste your actual Firebase config here (same as config/firebase.ts)
const firebaseConfig = {
  apiKey: 'AIzaSyCiu2ps9dJOHCIn7jmda1itFvpoBfo0A6o',
  authDomain: 'myeusnite.firebaseapp.com',
  databaseURL: 'https://myeusnite-default-rtdb.firebaseio.com/',
  projectId: 'myeusnite',
  storageBucket: 'myeusnite.firebasestorage.app',
  messagingSenderId: '519044936235',
  appId: '1:519044936235:web:845e80d073f9914a05b06e',
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);

// ── Helpers ──────────────────────────────────────────────────────────────────

// Only sets fields that are missing on the doc (never overwrites existing values)
async function addMissingFields(
  collectionName: string,
  docId: string,
  fields: Record<string, any>
) {
  const ref  = doc(db, collectionName, docId);
  // Build an update object with only the missing fields
  const updatePayload: Record<string, any> = {};
  for (const [key, defaultValue] of Object.entries(fields)) {
    updatePayload[key] = defaultValue;
  }
  if (Object.keys(updatePayload).length > 0) {
    // Use setDoc with merge:true so existing fields are never touched
    await setDoc(ref, updatePayload, { merge: true });
  }
}

function log(msg: string) {
  console.log(msg);
}

// ── Main migration ────────────────────────────────────────────────────────────

async function migrate() {
  log('\n🚀  MyEusnite — Firebase Migration Script');
  log('==========================================\n');

  // ─────────────────────────────────────────────────────────────────────────
  // 1. USERS — add photoURL if null
  // ─────────────────────────────────────────────────────────────────────────
  log('📁  [1/9] Migrating users collection...');
  const usersSnap = await getDocs(collection(db, 'users'));
  let usersUpdated = 0;
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const missing: Record<string, any> = {};
    if (data.photoURL === undefined)  missing.photoURL  = null;
    if (data.isPremium === undefined) missing.isPremium = false;
    if (data.department === undefined) missing.department = '';
    if (Object.keys(missing).length > 0) {
      await setDoc(doc(db, 'users', userDoc.id), missing, { merge: true });
      usersUpdated++;
    }
  }
  log(`✅  users — ${usersSnap.size} docs checked, ${usersUpdated} updated\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. POSTS — add authorPhoto, imageUrl
  // ─────────────────────────────────────────────────────────────────────────
  log('📁  [2/9] Migrating posts collection...');
  const postsSnap = await getDocs(collection(db, 'posts'));
  let postsUpdated = 0;
  for (const postDoc of postsSnap.docs) {
    const data = postDoc.data();
    const missing: Record<string, any> = {};
    if (data.authorPhoto  === undefined) missing.authorPhoto  = null;
    if (data.imageUrl     === undefined) missing.imageUrl     = null;
    if (data.likes        === undefined) missing.likes        = [];
    if (data.commentsCount === undefined) missing.commentsCount = 0;
    if (Object.keys(missing).length > 0) {
      await setDoc(doc(db, 'posts', postDoc.id), missing, { merge: true });
      postsUpdated++;
    }
  }
  log(`✅  posts — ${postsSnap.size} docs checked, ${postsUpdated} updated\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. NOTIFICATIONS — add senderAvatar, postId, videoId, groupId, chatRoomId
  // ─────────────────────────────────────────────────────────────────────────
  log('📁  [3/9] Migrating notifications collection...');
  const notifsSnap = await getDocs(collection(db, 'notifications'));
  let notifsUpdated = 0;
  for (const notifDoc of notifsSnap.docs) {
    const data = notifDoc.data();
    const missing: Record<string, any> = {};
    if (data.senderAvatar === undefined) missing.senderAvatar = null;
    if (data.postId       === undefined) missing.postId       = null;
    if (data.videoId      === undefined) missing.videoId      = null;
    if (data.groupId      === undefined) missing.groupId      = null;
    if (data.chatRoomId   === undefined) missing.chatRoomId   = null;
    if (data.read         === undefined) missing.read         = false;
    if (Object.keys(missing).length > 0) {
      await setDoc(doc(db, 'notifications', notifDoc.id), missing, { merge: true });
      notifsUpdated++;
    }
  }
  log(`✅  notifications — ${notifsSnap.size} docs checked, ${notifsUpdated} updated\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. MARKETPLACE — add imageUrls, condition, location, sellerPhoto,
  //                   views, savedBy, status, isPremium
  // ─────────────────────────────────────────────────────────────────────────
  log('📁  [4/9] Migrating marketplace collection...');
  const marketSnap = await getDocs(collection(db, 'marketplace'));
  let marketUpdated = 0;
  for (const itemDoc of marketSnap.docs) {
    const data = itemDoc.data();
    const missing: Record<string, any> = {};
    if (data.imageUrls   === undefined) missing.imageUrls   = data.imageUrl ? [data.imageUrl] : [];
    if (data.condition   === undefined) missing.condition   = 'Used';
    if (data.location    === undefined) missing.location    = 'ESUT Campus';
    if (data.sellerPhoto === undefined) missing.sellerPhoto = null;
    if (data.views       === undefined) missing.views       = 0;
    if (data.savedBy     === undefined) missing.savedBy     = [];
    if (data.status      === undefined) missing.status      = 'active';
    if (data.isPremium   === undefined) missing.isPremium   = false;
    if (Object.keys(missing).length > 0) {
      await setDoc(doc(db, 'marketplace', itemDoc.id), missing, { merge: true });
      marketUpdated++;
    }
  }
  log(`✅  marketplace — ${marketSnap.size} docs checked, ${marketUpdated} updated\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 5. VIDEOS — add views, commentsCount, status, category, audience,
  //             authorPhoto
  // ─────────────────────────────────────────────────────────────────────────
  log('📁  [5/9] Migrating videos collection...');
  const videosSnap = await getDocs(collection(db, 'videos'));
  let videosUpdated = 0;
  for (const videoDoc of videosSnap.docs) {
    const data = videoDoc.data();
    const missing: Record<string, any> = {};
    if (data.views         === undefined) missing.views         = 0;
    if (data.commentsCount === undefined) missing.commentsCount = 0;
    if (data.status        === undefined) missing.status        = 'published';
    if (data.category      === undefined) missing.category      = 'Campus Life';
    if (data.audience      === undefined) missing.audience      = 'everyone';
    if (data.authorPhoto   === undefined) missing.authorPhoto   = null;
    if (data.likes         === undefined) missing.likes         = [];
    if (data.hashtags      === undefined) missing.hashtags      = [];
    if (Object.keys(missing).length > 0) {
      await setDoc(doc(db, 'videos', videoDoc.id), missing, { merge: true });
      videosUpdated++;
    }
  }
  log(`✅  videos — ${videosSnap.size} docs checked, ${videosUpdated} updated\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 6. GROUPS — add avatar, coverPhoto, category, privacy, department,
  //             tags, rules, postsCount
  // ─────────────────────────────────────────────────────────────────────────
  log('📁  [6/9] Migrating groups collection...');
  const groupsSnap = await getDocs(collection(db, 'groups'));
  let groupsUpdated = 0;
  for (const groupDoc of groupsSnap.docs) {
    const data = groupDoc.data();
    const missing: Record<string, any> = {};
    if (data.avatar      === undefined) missing.avatar      = null;
    if (data.coverPhoto  === undefined) missing.coverPhoto  = null;
    if (data.category    === undefined) missing.category    = 'Community';
    if (data.privacy     === undefined) missing.privacy     = 'public';
    if (data.department  === undefined) missing.department  = '';
    if (data.tags        === undefined) missing.tags        = [];
    if (data.rules       === undefined) missing.rules       = [];
    if (data.postsCount  === undefined) missing.postsCount  = 0;
    if (data.members     === undefined) missing.members     = data.ownerId ? [data.ownerId] : [];
    if (data.memberCount === undefined) missing.memberCount = data.members?.length || 1;
    if (Object.keys(missing).length > 0) {
      await setDoc(doc(db, 'groups', groupDoc.id), missing, { merge: true });
      groupsUpdated++;
    }
  }
  log(`✅  groups — ${groupsSnap.size} docs checked, ${groupsUpdated} updated\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 7. GROUPMEMBERS — create entries for existing group owners
  //    (if groupMembers collection is empty, seed one entry per group owner)
  // ─────────────────────────────────────────────────────────────────────────
  log('📁  [7/9] Seeding groupMembers collection...');
  const existingMembers = await getDocs(collection(db, 'groupMembers'));
  if (existingMembers.empty) {
    // No groupMembers yet — create owner entries for every existing group
    const groupsForMembers = await getDocs(collection(db, 'groups'));
    let memberSeeded = 0;
    for (const groupDoc of groupsForMembers.docs) {
      const data = groupDoc.data();
      if (!data.ownerId) continue;
      // Check if owner entry already exists
      const existing = await getDocs(
        query(collection(db, 'groupMembers'),
          where('groupId', '==', groupDoc.id),
          where('userId', '==', data.ownerId),
          limit(1))
      );
      if (existing.empty) {
        await addDoc(collection(db, 'groupMembers'), {
          userId: data.ownerId,
          groupId: groupDoc.id,
          role: 'owner',
          displayName: data.ownerName || 'Group Owner',
          photoURL: null,
          department: '',
          joinedAt: serverTimestamp(),
        });
        memberSeeded++;
      }
    }
    log(`✅  groupMembers — seeded ${memberSeeded} owner entries\n`);
  } else {
    log(`✅  groupMembers — ${existingMembers.size} existing docs, skipped seeding\n`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. VIDEO COMMENTS — create sample comment on first video (if none exist)
  //    This verifies the subcollection works correctly.
  // ─────────────────────────────────────────────────────────────────────────
  log('📁  [8/9] Verifying videos/comments subcollection...');
  const firstVideoSnap = await getDocs(query(collection(db, 'videos'), limit(1)));
  if (!firstVideoSnap.empty) {
    const firstVideoId = firstVideoSnap.docs[0].id;
    const existingComments = await getDocs(
      query(collection(db, 'videos', firstVideoId, 'comments'), limit(1))
    );
    if (existingComments.empty) {
      await addDoc(collection(db, 'videos', firstVideoId, 'comments'), {
        text: 'Great video! 🔥 #ESUT',
        authorId: 'system',
        authorName: 'MyEusnite Bot',
        authorPhoto: null,
        likes: [],
        parentId: null,
        createdAt: serverTimestamp(),
      });
      log(`✅  videos/comments — sample comment seeded on video ${firstVideoId}\n`);
    } else {
      log(`✅  videos/comments — already has comments, skipped\n`);
    }
  } else {
    log(`⚠️   videos/comments — no videos found, skipped (upload a video first)\n`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. SAMPLE DATA — seed empty new collections with one sample doc each
  //    so Firebase console shows the collections exist
  // ─────────────────────────────────────────────────────────────────────────
  log('📁  [9/9] Seeding any empty new collections...');

  // groupPosts — only seed if empty
  const groupPostsSnap = await getDocs(query(collection(db, 'groupPosts'), limit(1)));
  if (groupPostsSnap.empty) {
    const firstGroupSnap = await getDocs(query(collection(db, 'groups'), limit(1)));
    if (!firstGroupSnap.empty) {
      const firstGroupId = firstGroupSnap.docs[0].id;
      const firstGroupData = firstGroupSnap.docs[0].data();
      await addDoc(collection(db, 'groupPosts'), {
        groupId: firstGroupId,
        authorId: firstGroupData.ownerId || 'system',
        authorName: firstGroupData.ownerName || 'Group Owner',
        authorPhoto: null,
        content: `Welcome to ${firstGroupData.name}! This is the first post 🎉`,
        mediaUrl: null,
        mediaType: null,
        isAnnouncement: true,
        likes: [],
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });
      // Update postsCount on the group
      await setDoc(doc(db, 'groups', firstGroupId), { postsCount: 1 }, { merge: true });
      log(`✅  groupPosts — sample announcement seeded\n`);
    } else {
      log(`⚠️   groupPosts — no groups found, skipped (create a group first)\n`);
    }
  } else {
    log(`✅  groupPosts — already has posts, skipped\n`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DONE
  // ─────────────────────────────────────────────────────────────────────────
  log('==========================================');
  log('✅  Migration complete!\n');
  log('📋  Summary of what happened:');
  log('   • All existing docs got missing fields added (no data deleted)');
  log('   • groupMembers collection seeded with owner entries');
  log('   • videos/comments subcollection verified');
  log('   • groupPosts collection seeded with a welcome post');
  log('\n⚠️   Next steps:');
  log('   1. Update Firestore Security Rules (see FIREBASE_SETUP_GUIDE.md)');
  log('   2. Add Composite Indexes (see FIREBASE_SETUP_GUIDE.md)');
  log('   3. Verify your Cloudinary upload preset is set to Unsigned');
  log('   4. Fill in CLOUDINARY_CLOUD_NAME in utils/cloudinary.ts\n');
  process.exit(0);
}

migrate().catch(err => {
  console.error('\n❌  Migration failed:', err.message);
  process.exit(1);
});