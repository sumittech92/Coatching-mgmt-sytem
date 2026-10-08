import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-addbrand',
  // standalone: true,
  // imports: [CommonModule],
  templateUrl: './category-addbrand.component.html',
  styleUrl: './category-addbrand.component.scss'
})
export class CategoryAddbrandComponent {
previewUrl: string | ArrayBuffer | null = null;
uploadMessage = '';
 
onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
 
  if (input.files && input.files[0]) {
    const file = input.files[0];
 
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result;
    };
 
    reader.readAsDataURL(file);
  }
}
 
removeImage() {
  this.previewUrl = null;
  this.uploadMessage = '';
}
}
