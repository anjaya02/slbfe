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
      <div class="dialog-content">
        <div class="icon-wrapper">
          <mat-icon>logout</mat-icon>
        </div>

        <h2 mat-dialog-title>{{ data.title }}</h2>
        <p class="dialog-message">{{ data.message }}</p>

        <div class="dialog-actions">
          <button mat-button (click)="onCancel()" class="btn-cancel">
            {{ data.cancelText }}
          </button>
          <button mat-raised-button (click)="onConfirm()" class="btn-confirm">
            {{ data.confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @use "../../../../assets/styles/variables" as v;

      .confirm-dialog-wrapper {
        background: #ffffff;
        padding: 40px 32px;
        text-align: center;
        border-radius: 28px;
        position: relative;
        overflow: hidden;
      }

      .icon-wrapper {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
        color: #DC2626;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
        box-shadow: 0 10px 20px -5px rgba(220, 38, 38, 0.15);
        border: 4px solid #fff;
        
        mat-icon {
          font-size: 36px;
          width: 36px;
          height: 36px;
        }
      }

      h2 {
        font-family: 'Inter', sans-serif;
        font-size: 24px;
        font-weight: 700;
        color: #111827;
        margin: 0 0 12px;
        line-height: 1.2;
        letter-spacing: -0.02em;
      }

      .dialog-message {
        color: #6B7280;
        font-size: 16px;
        font-weight: 400;
        line-height: 1.6;
        margin: 0 auto 32px;
        max-width: 300px;
      }

      .dialog-actions {
        display: flex;
        justify-content: center;
        gap: 16px;
        
        button {
          min-width: 120px;
          height: 48px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          border-radius: 12px;
          letter-spacing: 0.01em;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
      }

      .btn-cancel {
        background-color: #F3F4F6 !important;
        color: #374151 !important;
        border: 1px solid transparent !important;
        
        &:hover {
          background-color: #E5E7EB !important;
          color: #111827 !important;
        }
      }

      .btn-confirm {
        background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%) !important;
        color: white !important;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
        border: none !important;
        
        &:hover {
          background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%) !important;
          box-shadow: 0 8px 16px rgba(220, 38, 38, 0.35);
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
          box-shadow: 0 4px 6px rgba(220, 38, 38, 0.25); /* restore original shadow */
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
