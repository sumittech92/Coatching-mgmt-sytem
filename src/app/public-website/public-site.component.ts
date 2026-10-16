import { AfterViewInit, Component, QueryList, ViewChildren } from "@angular/core";
import { NgForm, NgModel, ValidatorFn, Validators } from "@angular/forms";
import { NavigationEnd, Router, ActivatedRoute } from "@angular/router";
import { filter } from "rxjs/operators";
import { DEFAULT_CONTACT_NUMBER, WebsiteContentService } from "../core/website-content.service";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { TenantContextService } from "../core/tenant-context.service";
import { AppValidators, normalizeMobile, validationMessage } from "../core/app-validators";
import { ToastService } from "../core/toast.service";
import { SCHOOL_CLASSES } from "../core/workspace-terms";

/** Validators for the enquiry form inputs, keyed by input name. */
const INQUIRY_VALIDATORS: Record<string, ValidatorFn[]> = {
  studentName: [AppValidators.required, AppValidators.personName, Validators.maxLength(60)],
  parentName: [AppValidators.required, AppValidators.personName, Validators.maxLength(60)],
  phone: [AppValidators.required, AppValidators.mobile],
  course: [AppValidators.required],
  message: [Validators.maxLength(500)],
};
@Component({
  selector: "app-public-site",
  templateUrl: "./public-site.component.html",
  styleUrls: ["./public-site.component.scss"],
})
export class PublicSiteComponent implements AfterViewInit {
  @ViewChildren(NgModel) private models!: QueryList<NgModel>;
  readonly mapEmbedUrl: SafeResourceUrl;
  readonly mapDirectionsUrl: string;
  slug = "northstar-academy";
  section = "home";
  submitted = false;
  inquiry = { name: "", parent: "", phone: "", course: "", message: "" };
  private readonly baseNav = [
    { key: "home", label: "Home" },
    { key: "about", label: "About" },
    { key: "courses", label: "Classes" },
    { key: "faculty", label: "Teachers" },
    { key: "results", label: "Results" },
    { key: "gallery", label: "Photos" },
    { key: "updates", label: "News" },
    { key: "admission", label: "Admission" },
    { key: "contact", label: "Contact" },
  ];
  constructor(
    public content: WebsiteContentService,
    private router: Router,
    route: ActivatedRoute,
    sanitizer: DomSanitizer,
    tenant: TenantContextService,
    private toast: ToastService,
  ) {
    this.slug = route.snapshot.paramMap.get("slug") || this.slug;
    tenant.setBusinessType(this.slug === 'greenfield-school' ? 'school' : 'coaching');
    const address = content.publicProfile.contact["address"];
    this.mapEmbedUrl = sanitizer.bypassSecurityTrustResourceUrl(
      "https://maps.google.com/maps?q=" + encodeURIComponent(address) + "&output=embed",
    );
    this.mapDirectionsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);
    this.updateSection(router.url);
    router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updateSection(event.urlAfterRedirects));
  }
  get profile() {
    return this.content.publicProfile;
  }
  get isSchool(): boolean { return this.slug === 'greenfield-school'; }
  get nav() { return this.baseNav; }
  get learningLabel(): string { return 'class'; }
  /** School enquiries pick the class applying for; coaching enquiries pick a published course. */
  get classOptions(): string[] { return this.isSchool ? SCHOOL_CLASSES : this.profile.courses.map(course => course['name']); }
  get instituteName(): string {
    return this.profile.settings["name"];
  }
  /** Direct-call link for the institute's contact number. */
  get callLink(): string {
    return WebsiteContentService.telLink(this.profile.contact["phone"] || DEFAULT_CONTACT_NUMBER);
  }
  /** wa.me needs the country code, which is no longer shown in the number itself. */
  get whatsappLink(): string {
    return WebsiteContentService.whatsappLink(this.profile.contact["whatsapp"] || this.profile.contact["phone"] || DEFAULT_CONTACT_NUMBER);
  }
  go(section: string): void {
    const path = section === "home" ? `/site/${this.slug}` : `/site/${this.slug}/${section}`;
    this.router.navigateByUrl(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  heroCta(): void {
    const link = this.profile.home["ctaLink"] || "/courses";
    const section = link.split("/").filter(Boolean).pop() || "courses";
    if (/^https?:/.test(link)) window.open(link, "_blank", "noopener");
    else this.go(section);
  }
  ngAfterViewInit(): void {
    this.attachValidators();
    this.models.changes.subscribe(() => this.attachValidators());
  }
  /** The enquiry inputs are recreated when the visitor opens the Admission page, so validators are attached on change. */
  private attachValidators(): void {
    this.models.forEach((model) => {
      const validators = model.name ? INQUIRY_VALIDATORS[model.name] : undefined;
      if (validators && !model.control.hasValidator(validators[0])) {
        model.control.addValidators(validators);
        model.control.updateValueAndValidity({ emitEvent: false });
      }
    });
  }
  errorFor(name: string, label: string): string {
    return validationMessage(this.models?.find((model) => model.name === name)?.control, label);
  }
  submitInquiry(form: NgForm): void {
    form.form.markAllAsTouched();
    if (form.invalid) {
      this.toast.invalidForm();
      return;
    }
    this.inquiry = { ...this.inquiry, name: this.inquiry.name.trim(), parent: this.inquiry.parent.trim(), phone: normalizeMobile(this.inquiry.phone), message: this.inquiry.message.trim() };
    this.submitted = true;
    this.toast.success(`Thanks, ${this.inquiry.name}! We will call you soon.`);
  }
  private updateSection(url: string): void {
    const parts = url.split("?")[0].split("/").filter(Boolean);
    this.section = parts.length > 2 ? parts[2] : "home";
  }
}

