import { CollectionGroup, CollectionReference } from 'firebase-admin/firestore';

import { FireCollection, FireCollectionGroup, FireDocument } from '@/index';

import { clearFirestore, getDb } from './setup';

// NOTE: Documents
interface UserData {
  name: string;
}
interface UserDoc extends UserData {}
class UserDoc extends FireDocument<UserData> {
  // NOTE: Sub Collection
  postsCollection = new PostsCollection(this.ref.collection('posts'));

  static create(collection: UsersCollection, id: string | null, data: UserData) {
    return new UserDoc(this.makeConstructorInput(collection, id, data));
  }
}

interface PostData {
  __id: string;
  content: string;
}
interface PostDoc extends PostData {}
class PostDoc extends FireDocument<PostData> {
  static create(collection: PostsCollection, id: string | null, data: PostData) {
    return new PostDoc(this.makeConstructorInput(collection, id, data));
  }
}

// NOTE: Collections
class UsersCollection extends FireCollection<UserData, UserDoc> {
  constructor(ref: CollectionReference) {
    super(ref, (snap) => new UserDoc(snap));
  }
}

class PostsCollection extends FireCollection<PostData, PostDoc> {
  constructor(ref: CollectionReference) {
    super(ref, (snap) => new PostDoc(snap));
  }
}

class PostsCollectionGroup extends FireCollectionGroup<PostData, PostDoc> {
  constructor(ref: CollectionGroup) {
    super(ref, '__id', (snap) => new PostDoc(snap));
  }
}

// NOTE: Root Collections
const db = getDb();
const usersRef = db.collection('users');
const postsGroupRef = db.collectionGroup('posts');
const usersCollection = new UsersCollection(usersRef);
const postsCollectionGroup = new PostsCollectionGroup(postsGroupRef);

beforeEach(async () => {
  await clearFirestore();
});
afterAll(async () => {
  await clearFirestore();
});

describe('Document', () => {
  it('create, edit, save and delete', async () => {
    // NOTE: create -> save
    const user = UserDoc.create(usersCollection, '1', { name: 'Taro' });
    await user.save();

    const getUser = () => usersRef.doc('1').get();
    let gotUser = await getUser();

    expect(gotUser.data()).toStrictEqual({ name: 'Taro' });

    // NOTE: edit -> save
    user.edit({ name: 'Taro Yamada' });
    await user.save();

    gotUser = await getUser();

    expect(gotUser.data()).toStrictEqual({ name: 'Taro Yamada' });

    // NOTE: delete
    await user.delete();

    gotUser = await getUser();

    expect(gotUser.exists).toBe(false);
  });

  it('batchInput', async () => {
    const user1 = UserDoc.create(usersCollection, '1', { name: 'Taro' });
    const user2 = UserDoc.create(usersCollection, '2', { name: 'Masami' });

    const batch = db.batch();

    batch.set(...user1.batchInput);
    batch.set(...user2.batchInput);

    await batch.commit();

    const gotUser1 = await usersRef.doc('1').get();
    const gotUser2 = await usersRef.doc('2').get();

    expect(gotUser1.data()).toStrictEqual({ name: 'Taro' });
    expect(gotUser2.data()).toStrictEqual({ name: 'Masami' });
  });
});

describe('Collection', () => {
  beforeEach(async () => {
    await usersRef.doc('1').set({ name: 'Ant Man' });
    await usersRef.doc('2').set({ name: 'Bird Man' });
    await usersRef.doc('3').set({ name: 'Cat Man' });
  });

  it('findOne', async () => {
    let user = await usersCollection.findOne('1');

    const { id, ref, postsCollection, ...data } = user;

    expect(id).toBe('1');
    expect(ref).toStrictEqual(usersRef.doc('1'));
    expect(data).toStrictEqual({ name: 'Ant Man' });

    await expect(usersCollection.findOne('1_000')).rejects.toThrowError();

    // NOTE: loader
    await usersRef.doc('1').set({ name: 'Ant Prince' });

    user = await usersCollection.findOne('1');

    expect(user.data).toStrictEqual({ name: 'Ant Man' });

    user = await usersCollection.findOne('1', { cache: false });

    expect(user.data).toStrictEqual({ name: 'Ant Prince' });
  });
});
