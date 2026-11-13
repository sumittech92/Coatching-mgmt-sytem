import { Component, OnInit } from "@angular/core";
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { PageEvent } from "@angular/material/paginator";
import { map, of, switchMap } from "rxjs";
import * as XLSX from "xlsx";
import { MockDataService } from "../core/mock-data.service";
import { MockStudent } from "../core/mock-data/management-data";
import { ConfirmationDialogService } from "../core/confirmation-dialog.service";
import { TenantContextService } from "../core/tenant-context.service";
import { MockAuthService } from "../core/mock-auth.service";
import { AppValidators, normalizeMobile, validationMessage } from "../core/app-validators";
import { ToastService } from "../core/toast.service";
import { StudentApiService, CreateStudentPayload, ApiStudent } from "../core/student-api.service";
import { MediaApiService } from "../core/media-api.service";
import { isoDay } from "../core/api-client";
import { CourseApiService } from "../core/course-api.service";
import { ApiBatch, BatchApiService } from "../core/batch-api.service";
import { ADMISSION_QUOTAS, COACHING_BOARDS, SCHOOL_TERMS } from "../core/workspace-terms";

const notFuture = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  const date = control.value instanceof Date ? control.value : new Date(String(control.value));
  return Number.isNaN(date.getTime())
    ? { invalidDate: true }
    : date.getTime() > Date.now()
      ? { futureDate: true }
      : null;
};
const MAX_UPLOAD = 10 * 1024 * 1024;

@Component({
  selector: "app-students-page",
  templateUrl: "./students-page.component.html",
  styleUrls: ["./students-page.component.scss"],
})
export class StudentsPageComponent implements OnInit {
  search = "";
  batch = "";
  status = "";
  feeStatus = "";
  pageIndex = 0;
  pageSize = 5;
  photo = "";
  selected?: MockStudent;
  mode: "list" | "add" | "edit" | "view" = "list";
  saving = false;
  hidePassword = true;
  readonly today = new Date();
  readonly form = this.fb.group({
    name: ["", [AppValidators.required, AppValidators.personName, Validators.maxLength(80)]],
    dob: ["", notFuture],
    gender: [""],
    phone: ["", [AppValidators.required, AppValidators.mobile]],
    email: ["", [AppValidators.required, AppValidators.email, Validators.maxLength(120)]],
    // Login password for the new student account; only used (and required) when adding.
    password: [""],
    father: ["", [AppValidators.required, AppValidators.personName, Validators.maxLength(80)]],
    mother: ["", [AppValidators.personName, Validators.maxLength(80)]],
    parentPhone: ["", AppValidators.mobile],
    // Multi-select: a student can join several classes / batches. Stored and sent as "A, B".
    course: [[] as string[], AppValidators.required],
    batch: [[] as string[], AppValidators.required],
    admission: ["", [AppValidators.required, notFuture]],
    address: ["", Validators.maxLength(200)],
    city: ["", Validators.maxLength(60)],
    state: ["", Validators.maxLength(60)],
    pincode: ["", AppValidators.pincode],
    monthlyFee: [0 as number | null, [AppValidators.required, AppValidators.positive]],
    discount: [0 as number | null, AppValidators.nonNegative],
    school: ["", Validators.maxLength(120)],
    board: [""],
    rollNo: ["", Validators.maxLength(30)],
    semester: [""],
    quota: [""],
    status: ["Active", AppValidators.required],
  });
  readonly boards = COACHING_BOARDS;
  readonly schoolTerms = SCHOOL_TERMS;
  readonly quotas = ADMISSION_QUOTAS;
  constructor(
    public data: MockDataService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private confirm: ConfirmationDialogService,
    private toast: ToastService,
    private tenant: TenantContextService,
    public auth: MockAuthService,
    private studentApi: StudentApiService,
    private courseApi: CourseApiService,
    private batchApi: BatchApiService,
    private media: MediaApiService,
  ) {}
  /** Students from crm-backend (signed-in owner or teacher); demo sessions use the sample list. */
  apiRows: MockStudent[] = [];
  loading = false;
  /** Photo picked in the form, uploaded when the student is saved. */
  private photoFile?: File;
  get live(): boolean {
    return !!this.auth.token;
  }
  get students(): MockStudent[] {
    return this.live ? this.apiRows : this.data.students;
  }
  /** The owner's active batches / sections from the Batches module; empty until any are added. */
  apiBatches: ApiBatch[] = [];
  /** The owner's active courses / classes from the Courses module; empty until any are added. */
  apiCourseNames: string[] = [];
  get isTeacher(): boolean {
    return this.auth.role === "Teacher";
  }
  get isSchool(): boolean {
    return this.tenant.isSchool;
  }
  get terms() {
    return this.tenant.terms;
  }
  get courseOptions(): string[] {
    if (!this.apiCourseNames.length) return this.terms.courseOptions;
    // Keep a student's existing course selectable even if it was renamed away or made inactive.
    const current: string[] = this.form.controls.course.value || [];
    return [...this.apiCourseNames, ...current.filter((name) => !this.apiCourseNames.includes(name))];
  }
  get batchOptions(): string[] {
    if (!this.apiBatches.length) return this.terms.groupOptions;
    // Only batches / sections of the chosen course(s) or class(es); all of them until one is chosen.
    const courses: string[] = this.form.controls.course.value || [];
    const names = this.apiBatches.filter((batch) => !courses.length || courses.includes(batch.course?.name || "")).map((batch) => batch.name);
    const current: string[] = this.form.controls.batch.value || [];
    return [...new Set([...names, ...current])];
  }
  ngOnInit(): void {
    this.courseApi.activeNames(this.auth.token).subscribe((names) => (this.apiCourseNames = names));
    this.batchApi.active(this.auth.token).subscribe((batches) => (this.apiBatches = batches));
    this.route.paramMap.subscribe(() => this.applyRoute());
    if (this.live) this.load();
  }
  /** Reads the students again (after a save) and re-applies the open view / edit. */
  private load(): void {
    this.loading = true;
    this.studentApi.list(this.auth.token!).subscribe({
      next: (students) => {
        this.loading = false;
        this.apiRows = students.map((student) => this.toRow(student));
        if (this.mode !== "list") this.applyRoute();
      },
      error: (error: Error) => {
        this.loading = false;
        this.toast.error(error.message);
      },
    });
  }
  private applyRoute(): void {
    const id = Number(this.route.snapshot.paramMap.get("id"));
    const path = this.router.url;
    this.mode = path.endsWith("/add") ? "add" : id ? (path.includes("/edit") ? "edit" : "view") : "list";
    this.selected = id ? this.students.find((student) => student.id === id) : undefined;
    this.photo = "";
    this.photoFile = undefined;
    const password = this.form.controls.password;
    password.setValidators(this.mode === "add" ? [AppValidators.required, AppValidators.password] : null);
    password.updateValueAndValidity();
    if (this.mode === "add") this.form.reset({ course: [], batch: [], monthlyFee: 0, discount: 0, status: "Active" });
    if (this.selected && this.mode !== "list")
      this.form.patchValue({
        ...this.selected,
        phone: normalizeMobile(this.selected.studentPhone ?? this.selected.phone),
        parentPhone: normalizeMobile(this.selected.parentPhone ?? this.selected.phone),
        course: StudentsPageComponent.splitList(this.selected.course),
        batch: StudentsPageComponent.splitList(this.selected.batch),
      });
  }
  /** API student -> the row / form shape this page uses. */
  private toRow(student: ApiStudent): MockStudent {
    const school = student.workType === "school";
    const info = school ? student.schoolInfo : student.coachingInfo;
    const name = student.fullName || "—";
    const section = student.schoolInfo?.section || "";
    const parentPhone = student.parentsInfo?.phoneNumber || "";
    const feeStatus = { paid: "Paid", pending: "Pending", overdue: "Overdue" } as const;
    return {
      id: Number(student.studentCode), code: student.studentCode, studentId: student.studentCode, name,
      father: student.parentsInfo?.fatherName || "", mother: student.parentsInfo?.motherName || "",
      phone: parentPhone || student.phoneNumber || "", studentPhone: student.phoneNumber || "", parentPhone,
      email: student.email || "",
      course: (school ? student.schoolInfo?.className : student.coachingInfo?.course || student.coachingInfo?.className) || "",
      // Schools may store the section as "A"; the form lists "Section A".
      batch: school ? section.split(",").map((item) => item.trim()).filter(Boolean).map((item) => (/^section/i.test(item) ? item : `Section ${item}`)).join(", ") : student.coachingInfo?.batchTiming || "",
      admission: info?.admissionDate ? info.admissionDate.slice(0, 10) : "",
      feeStatus: feeStatus[student.feeStatus || "paid"], attendance: student.attendance,
      status: student.status === "inactive" ? "Inactive" : "Active",
      photo: student.profileImage || name.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
      dob: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "",
      gender: student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : "",
      address: student.address?.addressLine || "", city: student.address?.city || "", state: student.address?.state || "", pincode: student.address?.pincode || "",
      monthlyFee: student.feePlan?.amount ?? 0, discount: student.feePlan?.discount ?? 0,
      school: student.coachingInfo?.schoolName || "", board: student.coachingInfo?.board || "",
      rollNo: student.schoolInfo?.rollNumber || "", semester: student.schoolInfo?.currentTerm || "", quota: student.schoolInfo?.admissionCategory || "",
    };
  }
  /** Uploaded photos are URLs; demo and fallback photos are initials. */
  isImage(photo: string): boolean {
    return /^(data:image|https?:)/.test(photo);
  }
  errorFor(name: string, label: string): string {
    const control = this.form.get(name);
    if (control?.hasError("futureDate")) return `${label} cannot be in the future.`;
    if (control?.hasError("invalidDate")) return "Enter a valid date.";
    if (control?.hasError("exceedsFee"))
      return `${label} cannot be more than the ${this.terms.feeLabel.toLowerCase()}.`;
    return validationMessage(control, label);
  }
  get activeCount(): number {
    return this.students.filter((student) => student.status === "Active").length;
  }
  get pendingCount(): number {
    return this.students.filter((student) => student.feeStatus !== "Paid").length;
  }
  /** Average over students with attendance taken. */
  get avgAttendance(): string {
    const marked = this.students.map((student) => student.attendance).filter((value): value is number => value !== null && value !== undefined);
    return marked.length ? `${Math.round(marked.reduce((sum, value) => sum + value, 0) / marked.length)}%` : "—";
  }
  get filtered(): MockStudent[] {
    const q = this.search.trim().toLowerCase();
    return this.students.filter(
      (student) =>
        (!q || `${student.name} ${student.studentId} ${student.phone} ${student.father}`.toLowerCase().includes(q)) &&
        (!this.batch || StudentsPageComponent.splitList(student.batch).includes(this.batch)) &&
        (!this.status || student.status === this.status) &&
        (!this.feeStatus || student.feeStatus === this.feeStatus),
    );
  }
  get visible(): MockStudent[] {
    return this.filtered.slice(this.pageIndex * this.pageSize, (this.pageIndex + 1) * this.pageSize);
  }
  pageChanged(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }
  goAdd(): void {
    this.router.navigate(["/client/students/add"]);
  }
  edit(student: MockStudent): void {
    if (!this.isTeacher) this.router.navigate(["/client/students", student.id, "edit"]);
  }
  view(student: MockStudent): void {
    this.router.navigate(["/client/students", student.id]);
  }
  closeForm(): void {
    this.router.navigate(["/client/students"]);
  }
  remove(student: MockStudent): void {
    if (this.isTeacher) return;
    this.confirm
      .confirm({
        title: "Delete student?",
        message: `Delete ${student.name} from the student records? This action cannot be undone.`,
        confirmLabel: "Delete student",
        destructive: true,
      })
      .subscribe((accepted) => {
        if (!accepted) return;
        if (this.live) {
          this.studentApi.remove(this.auth.token!, student.code!).subscribe({
            next: () => {
              this.apiRows = this.apiRows.filter((item) => item.id !== student.id);
              this.toast.success(`Student “${student.name}” deleted.`);
            },
            error: (error: Error) => this.toast.error(error.message),
          });
          return;
        }
        this.data.students = this.data.students.filter((item) => item.id !== student.id);
        this.toast.success(`Student “${student.name}” deleted.`);
      });
  }
  save(): void {
    if (this.isTeacher || this.mode === "view" || this.saving) return;
    const discount = this.form.controls.discount;
    discount.updateValueAndValidity();
    if (Number(discount.value) > Number(this.form.controls.monthlyFee.value))
      discount.setErrors({ ...(discount.errors || {}), exceedsFee: true });
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.invalidForm();
      return;
    }
    const value = this.form.getRawValue();
    const name = (value.name || "").trim();
    const { password, ...fields } = value;
    const record = {
      ...fields,
      name,
      email: (value.email || "").trim(),
      dob: this.dateValue(value.dob),
      gender: value.gender || "",
      father: value.father || "",
      mother: value.mother || "",
      phone: normalizeMobile(value.parentPhone || value.phone || ""),
      course: (value.course || []).join(", "),
      batch: (value.batch || []).join(", "),
      admission: this.dateValue(value.admission),
      address: value.address || "",
      city: value.city || "",
      state: value.state || "",
      pincode: normalizeMobile(value.pincode || ""),
      monthlyFee: Number(value.monthlyFee) || 0,
      discount: Number(value.discount) || 0,
      feeStatus: "Paid" as const,
      status: value.status === "Inactive" ? ("Inactive" as const) : ("Active" as const),
    };
    if (this.live) {
      this.saveLive(record, password || "");
      return;
    }
    if (this.mode === "edit" && this.selected) {
      // Demo session: edits stay in the local list.
      Object.assign(this.selected, record, this.photo ? { photo: this.photo } : {});
      this.toast.success("Changes saved.");
      this.closeForm();
      return;
    }
    this.data.addStudent({ ...record, photo: this.photo });
    this.toast.success(`Student “${name}” added.`);
    this.closeForm();
  }
  /** Uploads a new photo (if picked), then creates or updates the student in crm-backend and reloads the list. */
  private saveLive(record: Record<string, any>, password: string): void {
    const token = this.auth.token!;
    const editing = this.mode === "edit" && this.selected;
    const keptPhoto = editing && this.isImage(this.selected!.photo) ? this.selected!.photo : "";
    this.saving = true;
    const photo$ = this.photoFile ? this.media.uploadPhoto(token, this.photoFile).pipe(map((saved) => saved.url)) : of(keptPhoto);
    photo$
      .pipe(
        switchMap((profileImage) => {
          const payload = this.createPayload(record, password, profileImage);
          if (!editing) return this.studentApi.create(token, payload);
          const { password: _unused, ...update } = payload;
          return this.studentApi.update(token, this.selected!.code!, update);
        }),
      )
      .subscribe({
        next: () => {
          this.saving = false;
          this.toast.success(editing ? "Changes saved." : `Student “${record["name"]}” added.`);
          this.load();
          this.closeForm();
        },
        error: (error: Error) => {
          this.saving = false;
          this.toast.error(error.message);
        },
      });
  }
  private createPayload(record: Record<string, any>, password: string, profileImage = ""): CreateStudentPayload {
    const parentPhone = normalizeMobile(this.form.controls.parentPhone.value || "");
    const gender = String(record["gender"]).toLowerCase();
    const academic = this.isSchool
      ? {
          schoolInfo: {
            schoolName: this.tenant.current.businessName,
            className: record["course"],
            section: record["batch"],
            admissionDate: record["admission"] || null,
            rollNumber: record["rollNo"] || null,
            currentTerm: record["semester"] || null,
            admissionCategory: record["quota"] || null,
          },
        }
      : {
          coachingInfo: {
            coachingName: this.tenant.current.businessName,
            className: record["course"],
            course: record["course"],
            batchTiming: record["batch"],
            admissionDate: record["admission"] || null,
            schoolName: record["school"] || null,
            board: record["board"] || null,
          },
        };
    return {
      fullName: record["name"],
      email: record["email"].toLowerCase(),
      countryCode: "+91",
      phoneNumber: normalizeMobile(this.form.controls.phone.value || ""),
      password,
      profileImage,
      gender: ["male", "female", "other"].includes(gender) ? (gender as "male" | "female" | "other") : null,
      dateOfBirth: record["dob"] || null,
      status: record["status"] === "Inactive" ? "inactive" : "active",
      feePlan: { amount: Number(record["monthlyFee"]) || 0, discount: Number(record["discount"]) || 0 },
      parentsInfo: {
        fatherName: record["father"] || null,
        motherName: record["mother"] || null,
        countryCode: parentPhone ? "+91" : null,
        phoneNumber: parentPhone || null,
      },
      address: {
        addressLine: record["address"] || null,
        city: record["city"] || null,
        state: record["state"] || null,
        pincode: record["pincode"] || null,
      },
      ...academic,
    };
  }
  private static splitList(value: string | null | undefined): string[] {
    return (value || "").split(", ").filter(Boolean);
  }
  /** YYYY-MM-DD in local time (toISOString would move a picked date a day back in IST). */
  private dateValue(value: unknown): string {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? "" : isoDay(date);
  }
  onPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      this.toast.error("Please choose an image file (JPG or PNG).");
      input.value = "";
      return;
    }
    if (file.size > MAX_UPLOAD) {
      this.toast.error("Photo must be 10 MB or smaller.");
      input.value = "";
      return;
    }
    const reader = new FileReader();
    this.photoFile = file;
    reader.onload = () => {
      this.photo = String(reader.result || "");
      this.toast.success("Photo added.");
    };
    reader.readAsDataURL(file);
  }
  exportExcel(): void {
    if (!this.filtered.length) {
      this.toast.error("No students to export.");
      return;
    }
    const rows = this.filtered.map(({ photo, id, code, ...student }) => student);
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Students");
    XLSX.writeFile(book, `${this.isSchool ? "greenfield" : "northstar"}-students.xlsx`);
    this.toast.success(`Exported ${rows.length} student${rows.length === 1 ? "" : "s"} to Excel.`);
  }
}
