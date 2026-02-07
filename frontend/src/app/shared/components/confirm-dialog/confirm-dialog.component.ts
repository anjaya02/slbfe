import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

@Component({
  selector: "app-confirm-dialog",
  template: `
    <div class="confirm-dialog-wrapper">
      <div class="dialog-header-bg">
        <div class="pulse-ring"></div>
      </div>
      
      <div class="dialog-body">
        <div class="icon-floating">
          <mat-icon>logout</mat-icon>
        </div>

        <h2 mat-dialog-title>{{ data.title }}</h2>
        <p class="dialog-message">{{ data.message }}</p>

        <div class="dialog-actions">
          <button mat-button (click)="onCancel()" class="btn-cancel">
            {{ data.cancelText }}
          </button>
          <button mat-raised-button (click)="onConfirm()" class="btn-confirm">
            <span class="btn-label">{{ data.confirmText }}</span>
            <mat-icon class="btn-icon">arrow_forward</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @use "../../../../assets/styles/variables" as v;

      .confirm-dialog-wrapper {
        position: relative;
        overflow: hidden;
        border-radius: 28px; /* Highly curved corners */
        background: v.$white;
      }

      .dialog-header-bg {
        height: 100px;
        background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); /* Soft Red Gradient */
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .pulse-ring {
        position: absolute;
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        top: -50px;
        /* Animation could go here */
      }

      .dialog-body {
        padding: 0 32px 32px;
        text-align: center;
        margin-top: -40px; /* Pull content up overlapping header */
        position: relative;
        z-index: 2;
      }

      .icon-floating {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: v.$white;
        margin: 0 auto 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 24px rgba(220, 38, 38, 0.15);
        
        mat-icon {
          font-size: 36px;
          height: 36px;
          width: 36px;
          color: v.$danger-red;
        }
      }

      h2 {
        font-family: v.$font-primary;
        font-size: 24px;
        font-weight: 800; /* Extra bold */
        color: v.$dark;
        margin-bottom: 8px;
        letter-spacing: -0.5px;
      }

      .dialog-message {
        color: v.$gray-500;
        font-size: 15px;
        line-height: 1.6;
        margin-bottom: 32px;
      }

      .dialog-actions {
        display: grid;
        grid-template-columns: 1fr 1.5fr; /* Confirm button larger */
        gap: 16px;
        align-items: center;
      }

      .btn-cancel {
        height: 52px;
        border-radius: 999px !important; /* Pill shape */
        font-weight: 600;
        color: v.$gray-500 !important;
        background: v.$gray-50 !important;
        
        &:hover {
          background: v.$gray-100 !important;
          color: v.$dark !important;
        }
      }

      .btn-confirm {
        height: 52px;
        border-radius: 999px !important; /* Pill shape */
        background: linear-gradient(135deg, v.$danger-red, v.$danger-dark) !important; /* Vibrant Red Gradient */
        color: v.$white !important;
        font-weight: 600;
        font-size: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        transition: transform 0.2s, box-shadow 0.2s;

        .btn-label {
          margin-top: 2px;
        }

        .btn-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(220, 38, 38, 0.4);
        }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
