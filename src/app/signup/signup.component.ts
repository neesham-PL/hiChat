import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FirebaseError } from '@angular/fire/app';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  styles: [`
    .signup-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f0f2f5;
    }
    .signup-card {
      background-color: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
    }
    h2 {
      text-align: center;
      color: #1877f2;
      margin-bottom: 1.5rem;
    }
    .form-group {
      position: relative;
      margin-bottom: 1.5rem;
    }
    input {
      width: 100%;
      padding: 10px;
      border: 1px solid #dddfe2;
      border-radius: 6px;
      font-size: 17px;
      color: #1d2129;
    }
    input:focus {
      outline: none;
      border-color: #1877f2;
      box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.2);
    }
    label {
      position: absolute;
      left: 10px;
      top: 10px;
      color: #606770;
      font-size: 17px;
      pointer-events: none;
      transition: 0.2s ease all;
    }
    input:focus ~ label, input:not(:placeholder-shown) ~ label {
      top: -8px;
      font-size: 12px;
      color: #1877f2;
      background-color: white;
      padding: 0 5px;
    }
    .btn {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 6px;
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.3s;
    }
    .btn-primary {
      background-color: #1877f2;
      color: white;
    }
    .btn-primary:hover {
      background-color: #166fe5;
    }
    .btn-google {
      background-color: white;
      color: #757575;
      border: 1px solid #dadce0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1rem;
    }
    .btn-google:hover {
      background-color: #f8f9fa;
    }
    .google-logo {
      width: 18px;
      height: 18px;
      margin-right: 10px;
    }
    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 1rem 0;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #dadde1;
    }
    .divider span {
      padding: 0 10px;
      color: #606770;
      font-size: 13px;
    }
    .login-link {
      text-align: center;
      margin-top: 1rem;
      font-size: 14px;
      color: #606770;
    }
    .login-link a {
      color: #1877f2;
      text-decoration: none;
      font-weight: bold;
    }
    .login-link a:hover {
      text-decoration: underline;
    }
    .loader {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .btn:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }

    .error-message {
      color: #d32f2f;
      background-color: #fbe9e7;
      border: 1px solid #ffa726;
      border-radius: 4px;
      padding: 10px;
      margin-top: 10px;
      font-size: 14px;
    }
  `]
})
export class SignupComponent {
  email: string = '';
  displayName: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  async signup() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const user = await this.authService.signup(this.email, this.password, this.displayName);
      console.log('Signup successful', user);
      this.router.navigate(['/chat']);
    } catch (error) {
      console.error('Signup error', error);
      this.handleError(error);
    } finally {
      this.isLoading = false;
    }
  }

  async signUpWithGoogle() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/chat']);
    } catch (error) {
      console.error('Google signup error:', error);
      this.handleError(error);
    } finally {
      this.isLoading = false;
    }
  }

  private handleError(error: unknown) {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          this.errorMessage = 'This email is already in use. Please try logging in or use a different email.';
          break;
        case 'auth/weak-password':
          this.errorMessage = 'The password is too weak. Please choose a stronger password.';
          break;
        case 'auth/invalid-email':
          this.errorMessage = 'The email address is invalid. Please enter a valid email.';
          break;
        default:
          this.errorMessage = 'An error occurred during signup. Please try again.';
      }
    } else {
      this.errorMessage = 'An unexpected error occurred. Please try again.';
    }
  }
}