import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

interface Users {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  isOnline: boolean;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image';
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule],
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  users: Users[] = [];
  messages: Message[] = [];
  newMessage: string = '';
  selectedUser: Users | null = null;
  currentUser: Users | null = null;
  private messageSubscription: Subscription | null = null;
  private usersSubscription: Subscription | null = null;
  selectedMessageId: string | null = null;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  private shouldScrollToBottom = false;
  latestMessages: { [userId: string]: string } = {};
  newMessageAlert = false;

  constructor(private authService: AuthService, private router: Router, private elementRef: ElementRef,private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.currentUser = {
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          isOnline: true
        };
        this.loadUsers();
        this.authService.updateUserStatus(user.uid, true);
        this.subscribeToNewMessages();
      } else {
        console.log('No user signed in');
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy() {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.usersSubscription) {
      this.usersSubscription.unsubscribe();
    }
    if (this.currentUser) {
      this.authService.updateUserStatus(this.currentUser.uid, false);
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  loadUsers() {
    console.log('loadUsers called');
    this.usersSubscription = this.authService.getUsers().subscribe({
      next: (users) => {
        console.log('Users received in component:', users);
        this.users = users;
        if (this.users.length === 0) {
          console.log('No other users found');
        } else {
          this.fetchLatestMessages();
          // Update selectedUser if it exists
          if (this.selectedUser) {
            const updatedSelectedUser = this.users.find(u => u.uid === this.selectedUser!.uid);
            if (updatedSelectedUser) {
              this.selectedUser = updatedSelectedUser;
            }
          }
        }
      },
      error: (error) => {
        console.error('Error loading users:', error);
      },
      complete: () => {
        console.log('Users subscription completed');
      }
    });
  }

  selectUser(user: Users) {
    // Get the most up-to-date user object
    const selectedUser = this.users.find(u => u.uid === user.uid);
    if (!selectedUser) return;

    this.selectedUser = selectedUser;
    this.messages = [];
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.currentUser) {
      this.messageSubscription = this.authService.getMessages(this.currentUser.uid, selectedUser.uid)
        .subscribe({
          next: (messages) => {
            console.log('Received messages:', messages);
            this.messages = messages;
            this.shouldScrollToBottom = true;
          },
          error: (error) => console.error('Error fetching messages:', error)
        });
    }
  }

  sendMessage() {
    if (this.newMessage.trim() && this.selectedUser && this.currentUser) {
      this.authService.sendMessage(
        this.currentUser.uid,
        this.selectedUser.uid,
        this.newMessage,
        'text'
      ).then(() => {
        console.log('Message sent successfully');
        this.newMessage = '';
        this.shouldScrollToBottom = true;
      }).catch(error => {
        console.error('Error sending message:', error);
      });
    }
  }

  sendImage(event: any) {
    const file = event.target.files[0];
    if (file && this.selectedUser && this.currentUser) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (this.currentUser && this.selectedUser) {
          this.authService.sendMessage(
            this.currentUser.uid,
            this.selectedUser.uid,
            e.target.result,
            'image'
          );
          this.shouldScrollToBottom = true;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  logout() {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    }).catch(error => {
      console.error('Error during logout:', error);
    });
  }

  @HostListener('document:click')
  hideAllMessageTimes() {
    const timeElements = this['elementRef'].nativeElement.querySelectorAll('.message-time');
    timeElements.forEach((el: HTMLElement) => {
      el.style.display = 'none';
    });
  }

  toggleMessageTime(event: Event) {
    event.stopPropagation();
    const messageElement = (event.target as HTMLElement).closest('.message-wrapper');
    if (messageElement) {
      const timeElement = messageElement.querySelector('.message-time') as HTMLElement;
      if (timeElement) {
          timeElement.style.display = timeElement.style.display === 'none' ? 'block' : 'none';
      }
    }
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  fetchLatestMessages() {
    if (this.currentUser) {
      this.users.forEach(user => {
        this.authService.getLatestMessage(this.currentUser!.uid, user.uid).subscribe(
          latestMessage => {
            if (latestMessage) {
              this.latestMessages[user.uid] = this.formatLatestMessage(latestMessage);
            }
          }
        );
      });
    }
  }

  formatLatestMessage(message: any): string {
    if (message.type === 'text') {
      return message.content.length > 30 ? message.content.substring(0, 30) + '...' : message.content;
    } else if (message.type === 'image') {
      return '[Image]';
    }
    return '';
  }

  private subscribeToNewMessages() {
    if (this.currentUser) {
      this.authService.getNewMessages(this.currentUser.uid).subscribe(newMessage => {
        console.log('New message:', newMessage);
        if (newMessage && (!this.selectedUser || newMessage.senderId !== this.selectedUser.uid)) {
          this.newMessageAlert = true;
         // this.playAlertSound();
        }
      });
    }
  }

  playAlertSound() {
    const audio = new Audio('assets/notification-sound.mp3');
    audio.play();
  }

  dismissAlert() {
    this.newMessageAlert = false;
  }
  getSafeImageUrl(url: string): SafeUrl {
    if (!url) {
      return 'assets/Images/user-icon.svg';
    }
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
}
