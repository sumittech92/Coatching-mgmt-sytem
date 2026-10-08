import { Routes } from '@angular/router';

export const Full_ROUTES: Routes = [
   
    {
        path: '',
        loadChildren: () => import('../../components/components.module').then(m => m.ComponentsModule)
    },

   
];