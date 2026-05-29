const admin = require('firebase-admin');
const readline = require('readline');
const path = require('path');

const serviceAccount = require('./service-account.json');

const PROTECTED_EMAILS = new Set([
  'musicguy182004@gmail.com',
  'nikabeville@gmail.com',
  'kbeville@globalgates.info',
  'akumar7@gmail.com',
]);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

async function listAllUsers() {
  const users = [];
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    users.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);
  return users;
}

async function main() {
  console.log('Fetching all Firebase Auth users...\n');

  const allUsers = await listAllUsers();
  const toDelete = allUsers.filter(u => !PROTECTED_EMAILS.has(u.email));
  const protected_ = allUsers.filter(u => PROTECTED_EMAILS.has(u.email));

  if (toDelete.length === 0) {
    console.log('No users to delete (all are protected). Exiting.');
    process.exit(0);
  }

  console.log('Users that WILL be deleted:');
  toDelete.forEach(u => console.log(`  ${u.email || '(no email)'} — uid: ${u.uid}`));
  console.log('');
  console.log('Protected (will NOT be deleted):');
  protected_.forEach(u => console.log(`  ${u.email}`));
  console.log('');
  console.log(`Found ${toDelete.length} users to delete (${protected_.length} protected). Type YES to confirm:`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(resolve => rl.question('> ', resolve));
  rl.close();

  if (answer.trim() !== 'YES') {
    console.log('Aborted.');
    process.exit(0);
  }

  let deleted = 0;
  let failed = 0;

  for (const user of toDelete) {
    try {
      await auth.deleteUser(user.uid);
      try {
        await db.doc(`users/${user.uid}`).delete();
      } catch {}
      console.log(`Deleted: ${user.email || user.uid}`);
      deleted++;
    } catch (e) {
      console.error(`Failed to delete ${user.email || user.uid}: ${e.message}`);
      failed++;
    }
  }

  console.log('');
  console.log(`Done. Deleted: ${deleted} | Failed: ${failed} | Protected: ${protected_.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
