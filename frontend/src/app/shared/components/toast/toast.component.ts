import { CommonModule } from "@angular/common";
import { Component, EventEmitter, inject, Output } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarModule,
} from "@angular/material/snack-bar";
import { MatIconModule } from "@angular/material/icon";

export type ToastKind = "success" | "error" | "info" | "warning";

export interface ToastComponentData {
  message: string;
  kind: ToastKind;
  count: number;
  progress: number;
  persistent: boolean;
}

@Component({
  standalone: true,
  selector: "app-toast",
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div
      class="toast"
      [class.toast-warning]="kind === 'warning'"
      [class.toast--timed]="!persistent"
      (mouseenter)="paused.emit()"
      (mouseleave)="resumed.emit()"
    >
      <div class="toast__icon" aria-hidden="true">
        <mat-icon>{{ icon }}</mat-icon>
      </div>

      <div class="toast__content">
        <p class="toast__message">{{ message }}</p>
      </div>

      <span
        *ngIf="count > 1"
        class="toast__count"
        [attr.aria-label]="'Repeated ' + count + ' times'"
      >
        x{{ count }}
      </span>

      <button
        type="button"
        mat-icon-button
        class="toast__close"
        aria-label="Dismiss notification"
        (click)="dismissed.emit()"
      >
        <mat-icon>close</mat-icon>
      </button>

      <div *ngIf="!persistent" class="toast__progress-track" aria-hidden="true">
        <div class="toast__progress-bar" [style.width.%]="progress"></div>
      </div>
    </div>
  `,
  styles: [
    `
      .toast {
        position: relative;
        overflow: hidden;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        min-width: 0;
      }

      .toast--timed {
        padding-bottom: 22px;
      }

      .toast__icon {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          width: 20px;
          height: 20px;
          font-size: 20px;
        }
      }

      .toast__content {
        min-width: 0;
      }

      .toast__message {
        margin: 0;
        font-size: 14px;
        line-height: 1.45;
        font-weight: 500;
        overflow-wrap: anywhere;
      }

      .toast__count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 28px;
        padding: 0 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
        color: inherit;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
      }

      .toast__close {
        width: 28px;
        height: 28px;
        padding: 0;
        color: inherit;
        opacity: 0.86;

        mat-icon {
          width: 18px;
          height: 18px;
          font-size: 18px;
        }

        &:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
        }
      }

      .toast-warning {
        .toast__count {
          background: rgba(17, 24, 39, 0.12);
        }

        .toast__close:hover {
          background: rgba(17, 24, 39, 0.08);
        }

        .toast__progress-track {
          background: rgba(17, 24, 39, 0.08);
        }

        .toast__progress-bar {
          background: rgba(17, 24, 39, 0.42);
        }
      }

      .toast__progress-track {
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 10px;
        height: 4px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.14);
        pointer-events: none;
      }

      .toast__progress-bar {
        height: 100%;
        border-radius: inherit;
        background: rgba(255, 255, 255, 0.58);
        transition: width 120ms linear;
      }
    `,
  ],
})
export class ToastComponent {
  @Output() readonly paused = new EventEmitter<void>();
  @Output() readonly resumed = new EventEmitter<void>();
  @Output() readonly dismissed = new EventEmitter<void>();

  message: string;
  count: number;
  kind: ToastKind;
  progress: number;
  persistent: boolean;

  constructor() {
    const data = inject<ToastComponentData>(MAT_SNACK_BAR_DATA);
    this.message = data.message;
    this.count = data.count;
    this.kind = data.kind;
    this.progress = data.progress;
    this.persistent = data.persistent;
  }

  get icon(): string {
    switch (this.kind) {
      case "success":
        return "check_circle";
      case "error":
        return "error";
      case "warning":
        return "warning_amber";
      default:
        return "info";
    }
  }

  update(message: string, count: number): void {
    this.message = message;
    this.count = count;
  }

  setProgress(progress: number): void {
    this.progress = Math.max(0, Math.min(100, progress));
  }
}
