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
    <div class="confirm-dialog">
      <div class="dialog-header">
        <div class="icon-orb">
          <mat-icon>logout</mat-icon>
        </div>
      </div>
      
      <div class="dialog-content">
        <h2 mat-dialog-title>{{ data.title }}</h2>
        <p>{{ data.message }}</p>
      </div>
      
      <div class="dialog-actions">
        <button mat-button (click)="onCancel()" class="btn-cancel">
          {{ data.cancelText }}
        </button>
        <button mat-raised-button (click)="onConfirm()" class="btn-confirm">
          {{ data.confirmText }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      @use "../../../../assets/styles/variables" as v;

      .confirm-dialog {
        padding: 0;
        overflow: hidden;
        border-radius: v.$radius-lg;
      }

      .dialog-header {
        background: rgba(v.$danger-red, 0.05);
        padding: v.$space-xl 0 v.$space-md;
        display: flex;
        justify-content: center;
      }

      .icon-orb {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: v.$white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 15px rgba(v.$danger-red, 0.15);
        color: v.$danger-red;
        
        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
        }
      }

      .dialog-content {
        padding: v.$space-md v.$space-xl;
        text-align: center;

        h2 {
          font-family: v.$font-primary;
          font-size: 20px;
          font-weight: v.$font-weight-bold;
          margin-bottom: v.$space-sm;
          color: v.$dark;
        }

        p {
          color: v.$gray-600;
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
        }
      }

      .dialog-actions {
        padding: v.$space-lg v.$space-xl v.$space-xl;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .btn-cancel {
        height: 44px;
        font-weight: v.$font-weight-semibold;
        color: v.$gray-500 !important;
        border: 1.5px solid v.$gray-200 !important;
        border-radius: v.$radius-md !important;
        
        &:hover {
          background: v.$gray-50 !important;
          color: v.$dark !important;
        }
      }

      .btn-confirm {
        height: 44px;
        background: v.$danger-red !important;
        color: v.$white !important;
        font-weight: v.$font-weight-semibold;
        border-radius: v.$radius-md !important;
        box-shadow: 0 4px 12px rgba(v.$danger-red, 0.25) !important;
        transition: all 0.2s ease;

        &:hover {
          background: v.$danger-dark !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(v.$danger-red, 0.35) !important;
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
