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
      <div class="icon-container">
        <mat-icon color="warn">logout</mat-icon>
      </div>
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>
        <p>{{ data.message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="center">
        <button mat-button (click)="onCancel()" class="btn-cancel">
          {{ data.cancelText }}
        </button>
        <button mat-raised-button color="warn" (click)="onConfirm()" class="btn-confirm">
          {{ data.confirmText }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      @use "../../../../assets/styles/variables" as v;

      .confirm-dialog {
        padding: v.$space-lg;
        text-align: center;
        max-width: 320px;
      }

      .icon-container {
        margin-bottom: v.$space-md;
        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
        }
      }

      h2 {
        font-family: v.$font-primary;
        font-weight: v.$font-weight-bold;
        margin-bottom: v.$space-sm;
        color: var(--text-primary);
      }

      p {
        color: var(--text-secondary);
        line-height: 1.5;
        margin-bottom: v.$space-lg;
      }

      mat-dialog-actions {
        gap: 12px;
        padding-top: v.$space-md;
      }

      .btn-cancel {
        min-width: 100px;
        font-weight: v.$font-weight-semibold;
      }

      .btn-confirm {
        min-width: 110px;
        font-weight: v.$font-weight-semibold;
        border-radius: v.$radius-md !important;
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
