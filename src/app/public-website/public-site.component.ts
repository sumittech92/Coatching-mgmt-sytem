import { Component } from "@angular/core";
import { NavigationEnd, Router, ActivatedRoute } from "@angular/router";
import { filter } from "rxjs/operators";
import { WebsiteContentService } from "../core/website-content.service";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
@Component({
  selector: "app-public-site",
  templateUrl: "./public-site.component.html",
  styleUrls: ["./public-site.component.scss"],
})
export class PublicSiteComponent {
  readonly mapEmbedUrl: SafeResourceUrl;
  readonly mapDirectionsUrl: string;
  slug = "northstar-academy";
  section = "home";
  submitted = false;
  inquiry = { name: "", parent: "", phone: "", course: "", message: "" };
  readonly nav = [
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
  ) {
    const address = content.publicProfile.contact["address"];
    this.mapEmbedUrl = sanitizer.bypassSecurityTrustResourceUrl(
      "https://maps.google.com/maps?q=" + encodeURIComponent(address) + "&output=embed",
    );
    this.mapDirectionsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);
    this.slug = route.snapshot.paramMap.get("slug") || this.slug;
    this.updateSection(router.url);
    router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updateSection(event.urlAfterRedirects));
  }
  get profile() {
    return this.content.publicProfile;
  }
  get instituteName(): string {
    return this.profile.settings["name"];
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
  submitInquiry(): void {
    if (!this.inquiry.name.trim() || !this.inquiry.parent.trim() || !this.inquiry.phone.trim() || !this.inquiry.course)
      return;
    this.submitted = true;
  }
  private updateSection(url: string): void {
    const parts = url.split("?")[0].split("/").filter(Boolean);
    this.section = parts.length > 2 ? parts[2] : "home";
  }
}
  