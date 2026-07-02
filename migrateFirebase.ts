// migrateFirebase.ts

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
} from 'firebase/firestore';

// Use the same config as your working migration
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

const DEFAULTS: Record<string, any> = {
  bio: '',
  faculty: '',
  level: '',
  studentId: '',
  website: '',
  skills: [],
  interests: [],
  socialLinks: {},
};

const isApply = process.argv.includes('--apply');

async function migrateUsers() {
  console.log(
    isApply
      ? '🚀 Running migration in APPLY mode\n'
      : '🧪 Running migration in DRY RUN mode\n'
  );

  const usersSnap = await getDocs(collection(db, 'users'));

  if (usersSnap.empty) {
    console.log('No users found.');
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();

    const missing: Record<string, any> = {};

    for (const [field, defaultValue] of Object.entries(DEFAULTS)) {
      if (data[field] === undefined) {
        missing[field] = defaultValue;
      }
    }

    const fieldNames = Object.keys(missing);

    if (fieldNames.length === 0) {
      console.log(
        `✓ ${userDoc.id} (${data.fullName || 'unnamed'}) — already up to date`
      );
      skippedCount++;
      continue;
    }

    console.log(
      `→ ${userDoc.id} (${data.fullName || 'unnamed'}) — ${
        isApply ? 'adding' : 'would add'
      }: ${fieldNames.join(', ')}`
    );

    if (isApply) {
      await setDoc(
        doc(db, 'users', userDoc.id),
        missing,
        { merge: true }
      );

      console.log('  ✅ written');
    }

    updatedCount++;
  }

  console.log('\n--- Summary ---');
  console.log(`Total users:     ${usersSnap.size}`);
  console.log(
    `Updated:         ${updatedCount}${
      isApply ? '' : ' (would be updated)'
    }`
  );
  console.log(`Already current: ${skippedCount}`);

  if (!isApply && updatedCount > 0) {
    console.log('\nThis was a dry run — no data was changed.');
    console.log('Re-run with --apply to write changes.');
  }
}

migrateUsers()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nMigration failed:', err);
    process.exit(1);
  });