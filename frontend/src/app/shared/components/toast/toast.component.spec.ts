import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MAT_SNACK_BAR_DATA } from "@angular/material/snack-bar";
import { By } from "@angular/platform-browser";
import { ToastComponent, ToastComponentData } from "./toast.component";

describe("ToastComponent", () => {
  let fixture: ComponentFixture<ToastComponent>;
  let component: ToastComponent;

  async function createComponent(data: ToastComponentData): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [{ provide: MAT_SNACK_BAR_DATA, useValue: data }],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it("renders the progress bar for timed toasts", async () => {
    await createComponent({
      message: "Saved",
      kind: "success",
      count: 1,
      progress: 75,
      persistent: false,
    });

    const progressBar = fixture.debugElement.query(
      By.css(".toast__progress-bar"),
    );

    expect(progressBar).not.toBeNull();
    expect(component.progress).toBe(75);
  });

  it("hides the progress bar for persistent toasts", async () => {
    await createComponent({
      message: "Server unavailable",
      kind: "error",
      count: 1,
      progress: 100,
      persistent: true,
    });

    const progressBar = fixture.debugElement.query(
      By.css(".toast__progress-track"),
    );

    expect(progressBar).toBeNull();
  });
});