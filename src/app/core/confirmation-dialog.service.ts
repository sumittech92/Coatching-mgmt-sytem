import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData,
} from "../shared/ui/confirmation-dialog/confirmation-dialog.component";
@Injectable({ providedIn: "root" })
export class ConfirmationDialogService {
  constructor(private dialog: MatDialog) {}
  confirm(data: ConfirmationDialogData) {
    return this.dialog
      .open(ConfirmationDialogComponent, {
        data,
        width: "420px",
        maxWidth: "calc(100vw - 32px)",
        panelClass: "app-confirmation-dialog",
      })
      .afterClosed();
  }
}
