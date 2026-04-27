import { EventEmitter } from "@angular/core";
import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import {
  MatSnackBar,
  MatSnackBarRef,
} from "@angular/material/snack-bar";
import { Observable, Subject } from "rxjs";
import { ToastComponent } from "../../shared/components/toast/toast.component";
import { ToastService } from "./toast.service";

class FakeToastInstance {
  readonly paused = new EventEmitter<void>();
  readonly resumed = new EventEmitter<void>();
  readonly dismissed = new EventEmitter<void>();

  message: string;
  count: number;
  progress: number;
  persistent: boolean;

  constructor(data: {
    message: string;
    count: number;
    progress: number;
    persistent: boolean;
  }) {
    this.message = data.message;
    this.count = data.count;
    this.progress = data.progress;
    this.persistent = data.persistent;
  }

  update(message: string, count: number): void {
    this.message = message;
    this.count = count;
  }

  setProgress(progress: number): void {
    this.progress = progress;
  }
}

class FakeSnackBarRef {
  readonly instance: ToastComponent;

  private readonly dismissed$ = new Subject<void>();
  private closed = false;

  constructor(data: {
    message: string;
    count: number;
    progress: number;
    persistent: boolean;
  }) {
    this.instance = new FakeToastInstance(data) as unknown as ToastComponent;
  }

  afterDismissed(): Observable<void> {
    return this.dismissed$.asObservable();
  }

  dismiss(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.dismissed$.next();
    this.dismissed$.complete();
  }
}

class FakeMatSnackBar {
  readonly refs: FakeSnackBarRef[] = [];

  openFromComponent(
    _component: typeof ToastComponent,
    config?: {
      data?: {
        message: string;
        count: number;
        progress: number;
        persistent: boolean;
      };
    },
  ): MatSnackBarRef<ToastComponent> {
    const data = config?.data;
    if (!data) {
      throw new Error("Toast config data is required");
    }

    const ref = new FakeSnackBarRef(data);
    this.refs.push(ref);
    return ref as unknown as MatSnackBarRef<ToastComponent>;
  }
}

describe("ToastService", () => {
  let service: ToastService;
  let snackBar: FakeMatSnackBar;

  beforeEach(() => {
    snackBar = new FakeMatSnackBar();
    spyOn(snackBar, "openFromComponent").and.callThrough();

    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });

    service = TestBed.inject(ToastService);
  });

  it("queues toasts and shows them sequentially", fakeAsync(() => {
    service.success("First", 100);
    service.success("Second", 100);

    expect(snackBar.openFromComponent).toHaveBeenCalledTimes(1);
    expect((snackBar.refs[0].instance as unknown as FakeToastInstance).message).toBe(
      "First",
    );

    tick(100);

    expect(snackBar.openFromComponent).toHaveBeenCalledTimes(2);
    expect((snackBar.refs[1].instance as unknown as FakeToastInstance).message).toBe(
      "Second",
    );
  }));

  it("pauses and resumes timed dismissal", fakeAsync(() => {
    service.success("Hover me", 200);
    const ref = snackBar.refs[0];
    const instance = ref.instance as unknown as FakeToastInstance;

    tick(100);
    const progressAtPause = instance.progress;
    instance.paused.emit();

    tick(200);
    expect(snackBar.openFromComponent).toHaveBeenCalledTimes(1);
    expect(instance.progress).toBeCloseTo(progressAtPause, 0);

    instance.resumed.emit();
    tick(100);
    expect(snackBar.refs.length).toBe(1);
    tick(120);
    expect(snackBar.refs.length).toBe(1);
  }));

  it("merges duplicate toasts and refreshes their lifetime", fakeAsync(() => {
    service.error("Failed", 120);
    const ref = snackBar.refs[0];
    const instance = ref.instance as unknown as FakeToastInstance;

    tick(100);
    service.error("Failed", 120);

    expect(snackBar.openFromComponent).toHaveBeenCalledTimes(1);
    expect(instance.count).toBe(2);
    expect(instance.progress).toBe(100);

    tick(80);
    expect(snackBar.openFromComponent).toHaveBeenCalledTimes(1);
    tick(60);
    expect(snackBar.openFromComponent).toHaveBeenCalledTimes(1);
  }));

  it("keeps persistent toasts open until manually dismissed", fakeAsync(() => {
    service.persistentError("Needs attention");
    const ref = snackBar.refs[0];
    const instance = ref.instance as unknown as FakeToastInstance;

    expect(instance.persistent).toBeTrue();
    tick(10000);
    expect(snackBar.openFromComponent).toHaveBeenCalledTimes(1);

    instance.dismissed.emit();
    tick();

    expect(snackBar.openFromComponent).toHaveBeenCalledTimes(1);
  }));
});