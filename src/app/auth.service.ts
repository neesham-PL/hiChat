import { Injectable } from '@angular/core';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { collectionData } from 'rxfire/firestore';
import { Observable, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { auth, database } from './firebase.config';
import { onValue, orderByChild, push, ref, set, query, limitToLast, update } from 'firebase/database';
import { onChildChanged } from 'firebase/database';
import { onDisconnect } from 'firebase/database';

interface Users {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  isOnline: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<FirebaseUser | null>;

  constructor() {
    this.user$ = new Observable((subscriber) => {
      return onAuthStateChanged(auth, (user) => {
        if (user) {
          this.updateUserData(user);
          this.setupPresence(user.uid);
        }
        subscriber.next(user);
      });
    });
  }

  async login(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await this.updateUserData(credential.user);
    return credential.user;
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    await this.updateUserData(credential.user);
    return credential;
  }

  async signup(email: string, password: string, displayName: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    await this.updateUserData(credential.user);
    return credential.user;
  }

  private async updateUserData(user: FirebaseUser) {
    console.log('Updating user data for:', user.uid);
    const userRef = ref(database, `users/${user.uid}`);
    const userData: Users = {
      uid: user.uid,
      displayName: user.displayName || 'Anonymous',
      email: user.email || '',
      photoURL: user.photoURL || '',
      isOnline: true
    };
    try {
      await set(userRef, userData);
      console.log('User data updated successfully:', userData);
    } catch (error) {
      console.error('Error updating user data:', error);
    }
  }

  async logout() {
    if (auth.currentUser) {
      await this.updateUserStatus(auth.currentUser.uid, false);
      return signOut(auth);
    }
    return Promise.resolve();
  }

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  getUsers(): Observable<Users[]> {
    console.log('getUsers called');
    const usersRef = ref(database, 'users');
    
    return new Observable<Users[]>(observer => {
      const users: Users[] = [];
      
      const onValueHandler = onValue(usersRef, (snapshot) => {
        users.length = 0; // Clear the array
        snapshot.forEach((childSnapshot) => {
          const user = childSnapshot.val() as Users;
          if (user.uid !== auth.currentUser?.uid) {
            users.push(user);
          }
        });
        observer.next([...users]);
      }, (error) => {
        console.error('Error fetching users:', error);
        observer.error(error);
      });

      const onChildChangedHandler = onChildChanged(usersRef, (childSnapshot) => {
        const changedUser = childSnapshot.val() as Users;
        const index = users.findIndex(user => user.uid === changedUser.uid);
        if (index !== -1) {
          users[index] = changedUser;
          observer.next([...users]);
        }
      });

      return () => {
        onValueHandler();
        onChildChangedHandler();
      };
    });
  }

  getMessages(senderId: string | null, receiverId: string): Observable<any> {
    const messagesRef = ref(database, 'messages');
    const messagesQuery = query(messagesRef, orderByChild('timestamp'));
    
    return new Observable(observer => {
      const unsubscribe = onValue(messagesQuery, (snapshot) => {
        const messages: any[] = [];
        snapshot.forEach((childSnapshot) => {
          const message = childSnapshot.val();
          if ((message.senderId === senderId && message.receiverId === receiverId) ||
              (message.senderId === receiverId && message.receiverId === senderId)) {
            messages.push({ ...message, id: childSnapshot.key });
          }
        });
        observer.next(messages);
      }, (error) => {
        console.error('Error fetching messages:', error);
        observer.error(error);
      });

      // Return the unsubscribe function
      return () => unsubscribe();
    });
  }

  sendMessage(senderId: string, receiverId: string, content: string, type: 'text' | 'image') {
    const messagesRef = ref(database, 'messages');
    return push(messagesRef, {
      senderId,
      receiverId,
      content,
      type,
      timestamp: new Date().getTime()
    });
  }

  updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    const userRef = ref(database, `users/${userId}`);
    return update(userRef, { isOnline });
  }

  setupPresence(userId: string) {
    const userStatusRef = ref(database, `users/${userId}/isOnline`);
    onDisconnect(userStatusRef).set(false);
  }

  getLatestMessage(currentUserId: string, otherUserId: string): Observable<any> {
    const messagesRef = ref(database, 'messages');
    const messagesQuery = query(messagesRef, 
      orderByChild('timestamp'), 
      limitToLast(1)
    );
    
    return new Observable(observer => {
      const unsubscribe = onValue(messagesQuery, (snapshot) => {
        let latestMessage = null;
        snapshot.forEach((childSnapshot) => {
          const message = childSnapshot.val();
          if ((message.senderId === currentUserId && message.receiverId === otherUserId) ||
              (message.senderId === otherUserId && message.receiverId === currentUserId)) {
            latestMessage = { ...message, id: childSnapshot.key };
          }
        });
        observer.next(latestMessage);
      }, (error) => {
        console.error('Error fetching latest message:', error);
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }
}