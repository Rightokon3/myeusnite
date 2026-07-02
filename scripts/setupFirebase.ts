// scripts/setupFirebase.ts
// Run this ONCE to create all Firestore collections and sample data
// HOW TO RUN:
//   1. Install ts-node:  npm install -g ts-node
//   2. Run:  npx ts-node scripts/setupFirebase.ts

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
} from 'firebase/firestore';

// ⚠️ Paste your Firebase config here
const firebaseConfig = {
    apiKey: 'AIzaSyCiu2ps9dJOHCIn7jmda1itFvpoBfo0A6o',
    authDomain: 'myeusnite.firebaseapp.com',
    databaseURL: 'https://myeusnite-default-rtdb.firebaseio.com/',
    projectId: 'myeusnite',
    storageBucket: 'myeusnite.firebasestorage.app',
    messagingSenderId: '519044936235',
    appId: '1:519044936235:web:845e80d073f9914a05b06e',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setup() {
  console.log('🚀 Starting Firebase setup...\n');

  try {

    // ─────────────────────────────────────────
    // 1. USERS collection
    // ─────────────────────────────────────────
    console.log('📁 Creating users collection...');
    await setDoc(doc(db, 'users', 'sample_user_001'), {
      uid: 'sample_user_001',
      fullName: 'Ejike Emmanuel',
      email: 'ejike@esut.edu.ng',
      department: 'Computer Science',
      bio: 'I love coding and campus life!',
      photoURL: null,
      isPremium: false,
      createdAt: serverTimestamp(),
    });
    console.log('✅ users — done\n');

    // ─────────────────────────────────────────
    // 2. POSTS collection
    // ─────────────────────────────────────────
    console.log('📁 Creating posts collection...');
    await addDoc(collection(db, 'posts'), {
      text: 'Welcome to MyEusnite! Great to be here 🎉 #CampusLife',
      authorId: 'sample_user_001',
      authorName: 'Ejike Emmanuel',
      authorDept: 'Computer Science',
      authorPhoto: null,
      likes: [],
      commentsCount: 0,
      taggedUsers: [],
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'posts'), {
      text: 'Just finished my exams. Who else is free this weekend? 🎊',
      authorId: 'sample_user_001',
      authorName: 'Ejike Emmanuel',
      authorDept: 'Computer Science',
      authorPhoto: null,
      likes: [],
      commentsCount: 0,
      taggedUsers: [],
      createdAt: serverTimestamp(),
    });
    console.log('✅ posts — done\n');

    // ─────────────────────────────────────────
    // 3. MARKETPLACE collection
    // ─────────────────────────────────────────
    console.log('📁 Creating marketplace collection...');
    await addDoc(collection(db, 'marketplace'), {
      title: 'HP Laptop for Sale',
      description: 'HP laptop, good condition, 8GB RAM, 256GB SSD. Barely used.',
      price: 120000,
      category: 'Electronics',
      imageURL: null,
      sellerId: 'sample_user_001',
      sellerName: 'Ejike Emmanuel',
      sellerDept: 'Computer Science',
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'marketplace'), {
      title: 'Textbooks Bundle — 200 Level',
      description: 'Set of 5 textbooks for 200 level Computer Science students.',
      price: 5000,
      category: 'Books',
      imageURL: null,
      sellerId: 'sample_user_001',
      sellerName: 'Ejike Emmanuel',
      sellerDept: 'Computer Science',
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'marketplace'), {
      title: 'Office Chair',
      description: 'Comfortable office chair, black, adjustable height.',
      price: 18000,
      category: 'Other',
      imageURL: null,
      sellerId: 'sample_user_001',
      sellerName: 'Chioma Oluchi',
      sellerDept: 'Engineering',
      createdAt: serverTimestamp(),
    });
    console.log('✅ marketplace — done\n');

    // ─────────────────────────────────────────
    // 4. GROUPS collection
    // ─────────────────────────────────────────
    console.log('📁 Creating groups collection...');
    await addDoc(collection(db, 'groups'), {
      name: 'Computer Science Students',
      description: 'Official group for all CS students at ESUT',
      createdBy: 'sample_user_001',
      creatorName: 'Ejike Emmanuel',
      members: ['sample_user_001'],
      memberCount: 1,
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'groups'), {
      name: 'ESUT Campus Life',
      description: 'Everything happening on campus — events, gist, updates',
      createdBy: 'sample_user_001',
      creatorName: 'Ejike Emmanuel',
      members: ['sample_user_001'],
      memberCount: 1,
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'groups'), {
      name: 'Hostel Connect',
      description: 'For hostel residents — lost & found, maintenance, roommates',
      createdBy: 'sample_user_001',
      creatorName: 'Chioma Oluchi',
      members: [],
      memberCount: 0,
      createdAt: serverTimestamp(),
    });
    console.log('✅ groups — done\n');

    // ─────────────────────────────────────────
    // 5. VIDEOS collection
    // ─────────────────────────────────────────
    console.log('📁 Creating videos collection...');
    await addDoc(collection(db, 'videos'), {
      videoUrl: '',
      caption: 'Cultural Day highlights at ESUT! Amazing performances 🎭',
      hashtags: ['CulturalDay', 'ESUT', 'Campus'],
      authorId: 'sample_user_001',
      authorName: 'Ejike Emmanuel',
      authorDept: 'Computer Science',
      likes: [],
      commentsCount: 0,
      createdAt: serverTimestamp(),
    });
    console.log('✅ videos — done\n');

    // ─────────────────────────────────────────
    // 6. NOTIFICATIONS collection
    // ─────────────────────────────────────────
    console.log('📁 Creating notifications collection...');
    await addDoc(collection(db, 'notifications'), {
      type: 'announcement',
      message: 'Welcome to MyEusnite! Your campus social app is ready 🎉',
      senderId: 'admin',
      senderName: 'MyEusnite Admin',
      recipientId: null,
      global: true,
      read: false,
      postId: null,
      videoId: null,
      groupId: null,
      chatRoomId: null,
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'notifications'), {
      type: 'announcement',
      message: 'Exam timetable has been released. Check the student portal.',
      senderId: 'admin',
      senderName: 'MyEusnite Admin',
      recipientId: null,
      global: true,
      read: false,
      postId: null,
      videoId: null,
      groupId: null,
      chatRoomId: null,
      createdAt: serverTimestamp(),
    });
    console.log('✅ notifications — done\n');

    // ─────────────────────────────────────────
    // 7. ANNOUNCEMENTS collection
    // ─────────────────────────────────────────
    console.log('📁 Creating announcements collection...');
    await addDoc(collection(db, 'announcements'), {
      title: 'Exam Timetable Released',
      body: 'The 2nd semester exam timetable has been released. Log in to the student portal to view your schedule.',
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'announcements'), {
      title: 'Hostel Maintenance Notice',
      body: 'Water supply will be interrupted on Friday 8am–2pm for maintenance work.',
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'announcements'), {
      title: 'New Semester Registration',
      body: 'Registration for the new semester opens Monday. Visit the portal early to avoid delays.',
      createdAt: serverTimestamp(),
    });
    console.log('✅ announcements — done\n');

    // ─────────────────────────────────────────
    // 8. EVENTS collection
    // ─────────────────────────────────────────
    console.log('📁 Creating events collection...');
    await addDoc(collection(db, 'events'), {
      title: 'Cultural Day Celebration',
      description: 'Highlights from our vibrant cultural day — music, dance, food and more!',
      imageURL: null,
      likes: 20,
      comments: 120,
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'events'), {
      title: 'Faculty Dinner Night',
      description: 'Annual faculty dinner night. All students and staff are welcome.',
      imageURL: null,
      likes: 45,
      comments: 30,
      createdAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'events'), {
      title: 'Tech Innovation Workshop',
      description: 'A hands-on workshop on AI, blockchain, and mobile development.',
      imageURL: null,
      likes: 88,
      comments: 54,
      createdAt: serverTimestamp(),
    });
    console.log('✅ events — done\n');

    // ─────────────────────────────────────────
    // 9. CUSTOMER CARE collection
    // ─────────────────────────────────────────
    console.log('📁 Creating customer_care_chats collection...');
    await addDoc(collection(db, 'customer_care_chats'), {
      userId: 'sample_user_001',
      userName: 'Ejike Emmanuel',
      issue: 'Cannot access the student portal',
      status: 'open',
      createdAt: serverTimestamp(),
    });
    console.log('✅ customer_care_chats — done\n');

    // ─────────────────────────────────────────
    console.log('🎉 ALL DONE! All collections created successfully.');
    console.log('\n📋 Collections created:');
    console.log('   ✅ users');
    console.log('   ✅ posts');
    console.log('   ✅ marketplace');
    console.log('   ✅ groups');
    console.log('   ✅ videos');
    console.log('   ✅ notifications');
    console.log('   ✅ announcements');
    console.log('   ✅ events');
    console.log('   ✅ customer_care_chats');
    console.log('\n🔥 Open your Firebase Console to see all the data!');
    console.log('   https://console.firebase.google.com');

  } catch (error: any) {
    console.error('❌ Error during setup:', error.message);
    console.error('Make sure your Firebase config is correct in this file.');
  }

  process.exit(0);
}

setup();