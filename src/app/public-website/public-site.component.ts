import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, QueryList, ViewChildren } from "@angular/core";
import { NgForm, NgModel, ValidatorFn, Validators } from "@angular/forms";
import { NavigationEnd, Router, ActivatedRoute } from "@angular/router";
import { filter } from "rxjs/operators";
import { DEFAULT_CONTACT_NUMBER, WebsiteContentService } from "../core/website-content.service";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { TenantContextService } from "../core/tenant-context.service";
import { AppValidators, normalizeMobile, validationMessage } from "../core/app-validators";
import { ToastService } from "../core/toast.service";
import { SCHOOL_CLASSES } from "../core/workspace-terms";
import { AdmissionApiService, PublicSite } from "../core/admission-api.service";
import { WebsiteApiService } from "../core/website-api.service";
import { MockAuthService } from "../core/mock-auth.service";

/** Built-in demo websites; every other address belongs to a real Owner and is looked up in crm-backend. */
const DEMO_SITES: Record<string, "coaching" | "school"> = { "northstar-academy": "coaching", "greenfield-school": "school" };
/** Coaching enquiries offer these when the institute has no published courses yet, so the form can always be sent. */
const COACHING_CLASS_FALLBACK = [...SCHOOL_CLASSES.slice(3), "JEE Preparation", "NEET Preparation", "Other"];

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
export class PublicSiteComponent implements AfterViewInit, OnDestroy {
  @ViewChildren(NgModel) private models!: QueryList<NgModel>;
  mapEmbedUrl!: SafeResourceUrl;
  mapDirectionsUrl = "";
  slug = "northstar-academy";
  section = "home";
  submitted = false;
  sending = false;
  /** Real institute behind this address (null on the demo websites). */
  site: PublicSite | null = null;
  siteState: "loading" | "ready" | "missing" = "ready";
  /** The signed-in Owner viewing their own hidden website: shown with a banner, enquiries are not sent. */
  preview = false;
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
    private sanitizer: DomSanitizer,
    tenant: TenantContextService,
    private toast: ToastService,
    private admissionApi: AdmissionApiService,
    websiteApi: WebsiteApiService,
    private auth: MockAuthService,
    private cdr: ChangeDetectorRef,
  ) {
    this.slug = (route.snapshot.paramMap.get("slug") || this.slug).toLowerCase();
    tenant.setBusinessType(DEMO_SITES[this.slug] ?? "coaching");
    if (!DEMO_SITES[this.slug]) {
      this.siteState = "loading";
      // Published websites only; hidden ones, unknown addresses and blocked owners are "not found".
      websiteApi.publicSite(this.slug).subscribe({
        next: ({ profile, ...site }) => {
          this.site = site;
          tenant.setBusinessType(site.workType);
          content.usePublicProfile(profile, site.workType);
          this.updateMap();
          this.siteState = "ready";
        },
        error: () => this.tryOwnerPreview(tenant),
      });
    }
    this.updateMap();
    this.updateSection(router.url);
    router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updateSection(event.urlAfterRedirects));
  }
  get profile() {
    return this.content.publicProfile;
  }
  get isSchool(): boolean { return this.site ? this.site.workType === "school" : DEMO_SITES[this.slug] === "school"; }
  get nav() { return this.baseNav; }
  get learningLabel(): string { return 'class'; }
  /** School enquiries pick the class applying for; coaching enquiries pick a published course. */
  get classOptions(): string[] {
    if (this.isSchool) return SCHOOL_CLASSES;
    const courses = this.profile.courses.filter(course => course["status"] !== "Draft").map(course => course["name"]).filter(Boolean);
    return courses.length ? courses : COACHING_CLASS_FALLBACK;
  }
  /** Uploaded logo, or null to show the institute's first letter instead of the platform placeholder. */
  get logo(): string | null { return WebsiteContentService.logoOf(this.profile); }
  get registrationLine(): string { return WebsiteContentService.registrationLine(this.profile, this.isSchool); }
  get headInitials(): string { return (this.profile.settings["headName"] || "").replace(/^(Dr|Mrs|Mr|Ms)\.\s*/, "").split(" ").filter(Boolean).map(word => word[0]).join("").slice(0, 2).toUpperCase(); }
  /** Established year, affiliation / boards, classes and session for the About page. */
  get facts(): { label: string; value: string }[] {
    const s = this.profile.settings;
    const classes = s["classesFrom"] && s["classesTo"] ? `${s["classesFrom"]} – ${s["classesTo"]}` : "";
    return [
      { label: "Established", value: s["established"] || "" },
      this.isSchool ? { label: "Affiliation", value: [s["board"], s["affiliationNo"] ? `No. ${s["affiliationNo"]}` : ""].filter(Boolean).join(" · ") } : { label: "Boards", value: s["boards"] || "" },
      { label: "Classes", value: classes },
      { label: "Academic session", value: s["session"] || "" },
    ].filter(fact => fact.value);
  }
  get instituteName(): string {
    return this.site?.instituteName || (this.siteState === "ready" ? this.profile.settings["name"] : "");
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
  ngOnDestroy(): void { this.content.usePublicProfile(null); }
  /** Hidden websites are "not found" for visitors, but their Owner can still preview them. */
  private tryOwnerPreview(tenant: TenantContextService): void {
    if (this.auth.role !== "Owner") { this.siteState = "missing"; return; }
    this.content.loadOwnerWebsite().subscribe((owner) => {
      if (!owner || owner.siteSlug !== this.slug) { this.siteState = "missing"; return; }
      const workType = this.auth.user?.workType === "school" ? "school" : "coaching";
      const profile = this.content.profile;
      const visible = (items: Record<string, string>[]) => items.filter(item => item["status"] !== "Draft");
      this.content.usePublicProfile({ ...profile, courses: visible(profile.courses), faculty: visible(profile.faculty), results: visible(profile.results), gallery: visible(profile.gallery), updates: visible(profile.updates) }, workType);
      this.site = { siteSlug: this.slug, instituteName: profile.settings["name"], workType };
      this.preview = true;
      tenant.setBusinessType(workType);
      this.updateMap();
      this.siteState = "ready";
    });
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
    // Error messages depend on the validators just attached; refresh now so dev mode does not report NG0100.
    this.cdr.detectChanges();
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
    if (this.sending) return;
    this.inquiry = { ...this.inquiry, name: this.inquiry.name.trim(), parent: this.inquiry.parent.trim(), phone: normalizeMobile(this.inquiry.phone), message: this.inquiry.message.trim() };
    if (this.preview) { this.toast.info("This is a preview of your hidden website. Publish it on the Website page to receive enquiries."); return; }
    // Demo websites have no owner account, so their enquiries are not saved.
    if (!this.site) { this.submitted = true; this.toast.success(`Thanks, ${this.inquiry.name}! We will call you soon.`); return; }
    this.sending = true;
    this.admissionApi.submitPublic(this.site.siteSlug, {
      studentName: this.inquiry.name, parentName: this.inquiry.parent, countryCode: "+91", phoneNumber: this.inquiry.phone,
      className: this.inquiry.course, ...(this.inquiry.message ? { message: this.inquiry.message } : {}),
    }).subscribe({
      next: () => { this.sending = false; this.submitted = true; this.toast.success(`Thanks, ${this.inquiry.name}! We will call you soon.`); },
      error: (error: Error) => { this.sending = false; this.toast.error(error.message); },
    });
  }
  private updateMap(): void {
    const address = this.content.publicProfile.contact["address"];
    this.mapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl("https://maps.google.com/maps?q=" + encodeURIComponent(address) + "&output=embed");
    this.mapDirectionsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);
  }
  private updateSection(url: string): void {
    const parts = url.split("?")[0].split("/").filter(Boolean);
    this.section = parts.length > 2 ? parts[2] : "home";
  }
}

