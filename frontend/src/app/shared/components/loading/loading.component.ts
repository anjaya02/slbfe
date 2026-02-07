import { Component, Input } from "@angular/core";

@Component({
  selector: "app-loading",
  template: `
    <div
      class="loading-container"
      [class.full-page]="mode === 'full-page'"
      [class.overlay]="mode === 'overlay'"
      [class.inline]="mode === 'inline'"
    >
      <div class="spinner-wrapper">
        <mat-spinner [diameter]="diameter" [strokeWidth]="strokeWidth" color="primary"></mat-spinner>
        <div class="loading-text" *ngIf="showText">
          {{ message }}
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @use "../../../../assets/styles/variables" as v;

      .loading-container {
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;

        &.full-page {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(v.$white, 0.85);
          backdrop-filter: blur(4px);
        }

        &.overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(v.$white, 0.6);
          border-radius: inherit;
        }

        &.inline {
          padding: v.$space-lg;
          min-height: 120px;
        }
      }

      .spinner-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }

      .loading-text {
        font-family: v.$font-primary;
        font-size: v.$font-size-sm;
        font-weight: v.$font-weight-medium;
        color: v.$primary-blue;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        animation: pulse 1.5s infinite ease-in-out;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 0.6;
        }
        50% {
          opacity: 1;
        }
      }

      ::ng-deep .mat-mdc-progress-spinner {
        circle {
          stroke: v.$primary-blue !important;
        }
      }
    `,
  ],
})
export class LoadingComponent {
  @Input() mode: "full-page" | "overlay" | "inline" = "inline";
  @Input() diameter: number = 40;
  @Input() strokeWidth: number = 4;
  @Input() showText: boolean = true;
  @Input() message: string = "Processing...";
}
