import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, RouterModule } from '@angular/router';
import { AuthService } from './auth.service';
import { Subscription } from 'rxjs';
import { User } from '@angular/fire/auth';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  styles: [`
    .loading-indicator {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      font-size: 1.2rem;
      color: #333;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  title = 'hiChat';
  isLoggedIn = false;
  private authStateSubscription: Subscription | undefined;
  isLoading = true;
  private routerSubscription: Subscription | undefined;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.authStateSubscription = this.authService.user$.subscribe((user: User | null) => {
      this.isLoggedIn = !!user;
    });

    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.isLoading = false;
    });

    // Add a timeout to set isLoading to false after 2 seconds
    setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
      }
    }, 2000);
  }

  ngOnDestroy() {
    if (this.authStateSubscription) {
      this.authStateSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  logout() {
    const confirmLogout = confirm('Are you sure you want to log out?');
    if (confirmLogout) {
      this.authService.logout().then(() => {
        console.log('Logout successful');
        this.router.navigate(['/login']);
      }).catch((error: any) => {
        console.error('Logout error:', error);
      });
    }
  }

  isLoginOrSignupRoute(): boolean {
    const currentRoute = this.router.url;
    return currentRoute === '/login' || currentRoute === '/signup';
  }
}
