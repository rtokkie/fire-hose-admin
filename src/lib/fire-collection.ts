import DataLoader from 'dataloader';
import {
  CollectionGroup,
  CollectionReference,
  DocumentSnapshot,
  Query,
} from 'firebase-admin/firestore';

import { FireDocumentInput } from './fire-document';

const createLoader = <TData>(ref: CollectionReference<TData>) => {
  return new DataLoader<string, DocumentSnapshot<TData>>((ids) =>
    Promise.all(ids.map((id) => ref.doc(id).get()))
  );
};

const createGroupLoader = <TData>(ref: CollectionGroup<TData>, idField: keyof TData) => {
  if (typeof idField !== 'string') throw new Error('idFiled not string');
  const loader = new DataLoader<string, DocumentSnapshot<TData>>((ids) => {
    return Promise.all(
      ids.map(async (id) => {
        const snaps = await ref
          .where(idField, '==', id)
          .get()
          .then(({ docs }) => docs);
        const snap = snaps[0];
        if (!snap) throw new Error('snap not found');
        return snap;
      })
    );
  });
  return loader;
};

export class FireCollection<TData, TTransformed> {
  ref: CollectionReference<TData>;
  transformer: (snap: FireDocumentInput<TData>) => TTransformed;
  loader: DataLoader<string, DocumentSnapshot<TData>>;

  constructor(
    ref: CollectionReference,
    transformer: (snap: FireDocumentInput<TData>) => TTransformed
  ) {
    this.ref = ref as CollectionReference<TData>;
    this.transformer = transformer;
    this.loader = createLoader(this.ref);
  }

  findOne(id: string, { cache } = { cache: true }) {
    return cache
      ? this.loader.load(id).then(this.transformer)
      : this.loader.clear(id).load(id).then(this.transformer);
  }

  findOneById(id: string, { cache } = { cache: true }) {
    return this.findOne(id, { cache }).catch(() => undefined);
  }

  async findManyByQuery(
    queryFn: (ref: CollectionReference<TData>) => Query<TData>,
    { prime } = { prime: false }
  ) {
    const snaps = await queryFn(this.ref).get();
    if (prime) {
      snaps.forEach((snap) => this.loader.prime(snap.id, snap));
    }
    return snaps.docs.map(this.transformer);
  }
}

export class FireCollectionGroup<TData, TTransformed> {
  ref: CollectionGroup<TData>;
  transformer: (snap: FireDocumentInput<TData>) => TTransformed;
  loader: DataLoader<string, DocumentSnapshot<TData>>;

  constructor(
    ref: CollectionGroup,
    idField: keyof TData,
    transformer: (snap: FireDocumentInput<TData>) => TTransformed
  ) {
    this.ref = ref as CollectionGroup<TData>;
    this.transformer = transformer;
    this.loader = createGroupLoader(this.ref, idField);
  }

  findOne(id: string, { cache } = { cache: true }) {
    return cache
      ? this.loader.load(id).then(this.transformer)
      : this.loader.clear(id).load(id).then(this.transformer);
  }

  findOneById(id: string, { cache } = { cache: true }) {
    return this.findOne(id, { cache }).catch(() => undefined);
  }

  async findManyByQuery(
    queryFn: (ref: CollectionGroup<TData>) => Query<TData>,
    { prime } = { prime: false }
  ) {
    const snaps = await queryFn(this.ref).get();
    if (prime) {
      snaps.forEach((snap) => this.loader.prime(snap.id, snap));
    }
    return snaps.docs.map(this.transformer);
  }
}
