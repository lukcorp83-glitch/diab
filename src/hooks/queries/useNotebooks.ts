import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';

export interface Note {
  id: string;
  content: string;
  reminderDate?: string;
  createdAt?: number;
}

export const useNotebooks = (user: any) => {
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const cached = localStorage.getItem('glikocontrol_cached_notes');
      return cached ? JSON.parse(cached) : [];
    } catch(e) {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const uid = user ? getEffectiveUid(user) : null;

  useEffect(() => {
    if (!uid) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", uid, "notebook"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Note[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      setNotes(fetched);
      setIsLoading(false);
      try {
        localStorage.setItem('glikocontrol_cached_notes', JSON.stringify(fetched));
      } catch(e) {}
    }, (err) => {
      console.warn("[Notebook] onSnapshot error:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  return { data: notes, isLoading };
};
