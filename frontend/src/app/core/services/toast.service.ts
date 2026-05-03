import { Injectable } from "@angular/core";
import { MatSnackBar, MatSnackBarRef } from "@angular/material/snack-bar";
import { Subscription } from "rxjs";
import {
  ToastComponent,
  ToastKind,
} from "../../shared/components/toast/toast.component";

export interface ToastOptions {
  duration?: number;
  persistent?: boolean;
}

type ToastOptionsInput = number | ToastOptions | undefined;

interface ToastRequest {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
  persistent: boolean;
  count: number;
  signature: string;
  lastSeenAt: number;
}

interface ActiveToast {
  request: ToastRequest;
  ref: MatSnackBarRef<ToastComponent>;
  deadline: number;
  remaining: number;
  timeoutId: number | null;
  progressIntervalId: number | null;
  subscriptions: Subscription[];
}

@Injectable({ providedIn: "root" })
export class ToastService {
  private readonly duplicateWindowMs = 1500;
  private readonly maxQueueLength = 5;

  private nextToastId = 1;
  private queue: ToastRequest[] = [];
  private activeToast: ActiveToast | null = null;

  constructor(private snackBar: MatSnackBar) {}

  success(message: string, options?: ToastOptionsInput): void {
    this.enqueue("success", message, this.resolveOptions(3200, options));
  }

  error(message: string, options?: ToastOptionsInput): void {
    this.enqueue("error", message, this.resolveOptions(6000, options));
  }

  info(message: string, options?: ToastOptionsInput): void {
    this.enqueue("info", message, this.resolveOptions(3600, options));
  }

  warning(message: string, options?: ToastOptionsInput): void {
    this.enqueue("warning", message, this.resolveOptions(4500, options));
  }

  persistentError(message: string): void {
    this.error(message, { persistent: true });
  }

  dismissAll(): void {
    this.queue = [];
    if (!this.activeToast) {
      return;
    }

    this.clearTimer(this.activeToast);
    this.clearProgressTracker(this.activeToast);
    this.activeToast.ref.dismiss();
  }

  private resolveOptions(
    defaultDuration: number,
    options?: ToastOptionsInput,
  ): Required<ToastOptions> {
    if (typeof options === "number") {
      return {
        duration: Math.max(0, options),
        persistent: false,
      };
    }

    return {
      duration: Math.max(0, options?.duration ?? defaultDuration),
      persistent: Boolean(options?.persistent),
    };
  }

  private enqueue(
    kind: ToastKind,
    rawMessage: string,
    options: Required<ToastOptions>,
  ): void {
    const message = rawMessage.trim();
    if (!message) {
      return;
    }

    const now = Date.now();
    const signature = `${kind}:${options.persistent ? 1 : 0}:${message}`;

    if (this.tryMergeActive(signature, now, options)) {
      return;
    }

    if (this.tryMergeQueued(signature, now, options)) {
      return;
    }

    if (this.queue.length >= this.maxQueueLength) {
      this.queue.shift();
    }

    this.queue.push({
      id: this.nextToastId++,
      kind,
      message,
      duration: options.duration,
      persistent: options.persistent,
      count: 1,
      signature,
      lastSeenAt: now,
    });

    this.displayNext();
  }

  private tryMergeActive(
    signature: string,
    now: number,
    options: Required<ToastOptions>,
  ): boolean {
    if (!this.activeToast) {
      return false;
    }

    if (!this.canMerge(this.activeToast.request, signature, now)) {
      return false;
    }

    this.activeToast.request.count += 1;
    this.activeToast.request.duration = Math.max(
      this.activeToast.request.duration,
      options.duration,
    );
    this.activeToast.request.lastSeenAt = now;
    this.activeToast.ref.instance.update(
      this.activeToast.request.message,
      this.activeToast.request.count,
    );

    if (this.activeToast.request.persistent) {
      this.activeToast.ref.instance.setProgress(100);
    } else if (this.activeToast.timeoutId === null) {
      this.activeToast.remaining = this.activeToast.request.duration;
      this.activeToast.ref.instance.setProgress(100);
    } else {
      this.scheduleDismiss(this.activeToast, this.activeToast.request.duration);
    }

    return true;
  }

  private tryMergeQueued(
    signature: string,
    now: number,
    options: Required<ToastOptions>,
  ): boolean {
    for (let index = this.queue.length - 1; index >= 0; index -= 1) {
      const queuedToast = this.queue[index];
      if (!this.canMerge(queuedToast, signature, now)) {
        continue;
      }

      queuedToast.count += 1;
      queuedToast.duration = Math.max(queuedToast.duration, options.duration);
      queuedToast.lastSeenAt = now;
      return true;
    }

    return false;
  }

  private canMerge(
    toast: Pick<ToastRequest, "signature" | "lastSeenAt">,
    signature: string,
    now: number,
  ): boolean {
    return (
      toast.signature === signature &&
      now - toast.lastSeenAt <= this.duplicateWindowMs
    );
  }

  private displayNext(): void {
    if (this.activeToast || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    if (!request) {
      return;
    }

    const ref = this.snackBar.openFromComponent(ToastComponent, {
      horizontalPosition: "right",
      verticalPosition: "top",
      panelClass: ["toast-shell", `toast-${request.kind}`],
      politeness: request.kind === "error" ? "assertive" : "polite",
      announcementMessage: request.message,
      data: {
        message: request.message,
        kind: request.kind,
        count: request.count,
        progress: 100,
        persistent: request.persistent,
      },
    });

    const activeToast: ActiveToast = {
      request,
      ref,
      deadline: 0,
      remaining: request.duration,
      timeoutId: null,
      progressIntervalId: null,
      subscriptions: [],
    };

    activeToast.subscriptions.push(
      ref.instance.paused.subscribe(() => this.pause(activeToast.request.id)),
      ref.instance.resumed.subscribe(() => this.resume(activeToast.request.id)),
      ref.instance.dismissed.subscribe(() => ref.dismiss()),
      ref.afterDismissed().subscribe(() => {
        if (this.activeToast?.request.id !== request.id) {
          return;
        }

        this.clearTimer(activeToast);
        this.clearProgressTracker(activeToast);
        activeToast.subscriptions.forEach((subscription) => subscription.unsubscribe());
        this.activeToast = null;
        this.displayNext();
      }),
    );

    this.activeToast = activeToast;
    if (request.persistent) {
      ref.instance.setProgress(100);
      return;
    }

    this.scheduleDismiss(activeToast, request.duration);
  }

  private pause(toastId: number): void {
    if (!this.activeToast || this.activeToast.request.id !== toastId) {
      return;
    }

    if (this.activeToast.timeoutId === null) {
      return;
    }

    this.activeToast.remaining = Math.max(
      0,
      this.activeToast.deadline - Date.now(),
    );
    this.clearTimer(this.activeToast);
    this.clearProgressTracker(this.activeToast);
    this.activeToast.ref.instance.setProgress(this.getProgress(this.activeToast));
  }

  private resume(toastId: number): void {
    if (!this.activeToast || this.activeToast.request.id !== toastId) {
      return;
    }

    if (this.activeToast.timeoutId !== null) {
      return;
    }

    if (this.activeToast.remaining <= 0) {
      this.activeToast.ref.dismiss();
      return;
    }

    this.scheduleDismiss(this.activeToast, this.activeToast.remaining);
  }

  private scheduleDismiss(activeToast: ActiveToast, delay: number): void {
    this.clearTimer(activeToast);
    this.clearProgressTracker(activeToast);
    activeToast.remaining = delay;
    activeToast.deadline = Date.now() + delay;
    activeToast.ref.instance.setProgress(this.getProgress(activeToast));
    activeToast.progressIntervalId = window.setInterval(() => {
      this.syncProgress(activeToast.request.id);
    }, 100);
    activeToast.timeoutId = window.setTimeout(() => {
      this.syncProgress(activeToast.request.id);
      activeToast.timeoutId = null;
      activeToast.ref.dismiss();
    }, delay);
  }

  private syncProgress(toastId: number): void {
    if (!this.activeToast || this.activeToast.request.id !== toastId) {
      return;
    }

    this.activeToast.remaining = Math.max(
      0,
      this.activeToast.deadline - Date.now(),
    );
    this.activeToast.ref.instance.setProgress(this.getProgress(this.activeToast));
  }

  private getProgress(activeToast: ActiveToast): number {
    if (activeToast.request.persistent || activeToast.request.duration <= 0) {
      return 100;
    }

    return (activeToast.remaining / activeToast.request.duration) * 100;
  }

  private clearTimer(activeToast: ActiveToast): void {
    if (activeToast.timeoutId === null) {
      return;
    }

    window.clearTimeout(activeToast.timeoutId);
    activeToast.timeoutId = null;
  }

  private clearProgressTracker(activeToast: ActiveToast): void {
    if (activeToast.progressIntervalId === null) {
      return;
    }

    window.clearInterval(activeToast.progressIntervalId);
    activeToast.progressIntervalId = null;
  }
}
